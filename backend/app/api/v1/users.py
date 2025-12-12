"""
EduMetrics Backend - Users Router
User management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.api.deps import get_current_user, require_principal
from app.models import Profile, UserRole
from app.core.permissions import AppRole
from app.schemas import UserResponse, UserRoleUpdate, ProfileResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_principal),
    skip: int = 0,
    limit: int = 100,
    role: str = None
):
    """List all users (Principal only)."""
    query = db.query(Profile)
    
    if role:
        # Join with user_roles to filter by role
        query = query.join(UserRole, Profile.user_id == UserRole.user_id)
        query = query.filter(UserRole.role == role)
    
    users = query.offset(skip).limit(limit).all()
    
    # Get roles for all users
    result = []
    for user in users:
        user_role = db.query(UserRole).filter(UserRole.user_id == user.user_id).first()
        role_value = user_role.role.value if user_role else "student"
        result.append(UserResponse(
            id=user.id,
            user_id=user.user_id,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            department=user.department,
            role=role_value,
            created_at=user.created_at
        ))
    
    return result


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Get user by ID."""
    # Users can only view themselves unless they're principal
    user_role = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    is_principal = user_role and user_role.role == AppRole.PRINCIPAL
    
    if not is_principal and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user"
        )
    
    user = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_role = db.query(UserRole).filter(UserRole.user_id == user.user_id).first()
    role_value = user_role.role.value if user_role else "student"
    
    return UserResponse(
        id=user.id,
        user_id=user.user_id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        department=user.department,
        role=role_value,
        created_at=user.created_at
    )


@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: UUID,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_principal)
):
    """Update user role (Principal only)."""
    # Validate role
    try:
        new_role = AppRole(role_update.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {role_update.role}"
        )
    
    # Find user
    user = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update role
    user_role = db.query(UserRole).filter(UserRole.user_id == user_id).first()
    if user_role:
        user_role.role = new_role
    else:
        # Create role if doesn't exist
        import uuid
        user_role = UserRole(id=uuid.uuid4(), user_id=user_id, role=new_role)
        db.add(user_role)
    
    db.commit()
    
    return UserResponse(
        id=user.id,
        user_id=user.user_id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        department=user.department,
        role=new_role.value,
        created_at=user.created_at
    )


@router.put("/me/profile", response_model=UserResponse)
async def update_my_profile(
    profile_data: dict,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Update current user's profile."""
    # Update allowed fields
    if "full_name" in profile_data and profile_data["full_name"]:
        current_user.full_name = profile_data["full_name"]
    if "avatar_url" in profile_data:
        current_user.avatar_url = profile_data["avatar_url"]
    
    db.commit()
    db.refresh(current_user)
    
    user_role = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    role_value = user_role.role.value if user_role else "student"
    
    return UserResponse(
        id=current_user.id,
        user_id=current_user.user_id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        department=current_user.department,
        role=role_value,
        created_at=current_user.created_at
    )


@router.post("/me/password")
async def change_my_password(
    password_data: dict,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Change current user's password."""
    from app.core.security import verify_password, hash_password
    
    current_password = password_data.get("current_password")
    new_password = password_data.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both current_password and new_password are required"
        )
    
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters"
        )
    
    # Verify current password
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password not set for this user"
        )
    
    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = hash_password(new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

