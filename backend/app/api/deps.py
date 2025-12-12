"""
EduMetrics Backend - API Dependencies
Shared dependencies for API endpoints
"""
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import oauth2_scheme, decode_access_token
from app.core.permissions import AppRole, check_role_permission
from app.models import Profile, UserRole


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> Profile:
    """Get the current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = db.query(Profile).filter(Profile.user_id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user


def get_current_user_with_role(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
) -> tuple[Profile, str]:
    """Get current user with their role."""
    user_role = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    role = user_role.role.value if user_role else "student"
    return current_user, role


class RoleChecker:
    """Dependency class for role-based access control."""
    
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles
    
    def __call__(
        self,
        db: Session = Depends(get_db),
        current_user: Profile = Depends(get_current_user)
    ) -> Profile:
        user_role = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
        role = user_role.role.value if user_role else "student"
        
        if role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        return current_user


# Pre-configured role checkers
require_principal = RoleChecker([AppRole.PRINCIPAL.value])
require_hod_or_above = RoleChecker([AppRole.PRINCIPAL.value, AppRole.HOD.value])
require_teacher_or_above = RoleChecker([AppRole.PRINCIPAL.value, AppRole.HOD.value, AppRole.TEACHER.value])
require_authenticated = RoleChecker([AppRole.PRINCIPAL.value, AppRole.HOD.value, AppRole.TEACHER.value, AppRole.STUDENT.value])


def get_user_role(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
) -> str:
    """Get just the user's role."""
    user_role = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    return user_role.role.value if user_role else "student"
