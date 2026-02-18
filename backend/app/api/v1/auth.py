"""
EduMetrics Backend - Authentication Router
Login, signup, and token management endpoints
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.api.deps import get_current_user
from app.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models import Profile, UserRole
from app.core.permissions import AppRole
from app.schemas import Token, LoginRequest, SignupRequest, ProfileResponse

from app.core.limiter import limiter
from fastapi import Request

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login with email and password, returns JWT token."""
    # Find user by email
    user = db.query(Profile).filter(Profile.email == form_data.username).first()
    
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user role
    user_role = db.query(UserRole).filter(UserRole.user_id == user.user_id).first()
    role = user_role.role.value if user_role else "student"
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.user_id),
            "email": user.email,
            "role": role
        },
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=ProfileResponse(
            id=user.id,
            user_id=user.user_id,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            department=user.department,
            role=role
        )
    )


@router.post("/signup", response_model=Token)
async def signup(
    signup_data: SignupRequest,
    db: Session = Depends(get_db)
):
    """Register a new user with default student role."""
    # Check if email already exists
    existing_user = db.query(Profile).filter(Profile.email == signup_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_id = uuid.uuid4()
    new_user = Profile(
        id=uuid.uuid4(),
        user_id=user_id,
        email=signup_data.email,
        full_name=signup_data.full_name,
        password_hash=get_password_hash(signup_data.password)
    )
    db.add(new_user)
    
    # Create default role (student)
    new_role = UserRole(
        id=uuid.uuid4(),
        user_id=user_id,
        role=AppRole.STUDENT
    )
    db.add(new_role)
    
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user_id),
            "email": new_user.email,
            "role": "student"
        },
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=ProfileResponse(
            id=new_user.id,
            user_id=new_user.user_id,
            email=new_user.email,
            full_name=new_user.full_name,
            avatar_url=new_user.avatar_url,
            department=new_user.department,
            role="student"
        )
    )


@router.get("/me", response_model=ProfileResponse)
async def get_current_user_info(
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user profile and role."""
    # Get role
    user_role = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    role = user_role.role.value if user_role else "student"
    
    return ProfileResponse(
        id=current_user.id,
        user_id=current_user.user_id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        department=current_user.department,
        role=role
    )
