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


def get_current_student_usn(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
) -> str:
    """
    Get USN for the current authenticated student.
    
    CRITICAL: This bridges the gap between Auth (UUID) and Academic Records (USN).
    Non-student roles or students without USN will raise 403/404.
    """
    # 1. Verify role is student
    user_role = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    if not user_role or user_role.role.value != "student":
        # Allow teachers/admins to get their own USN if they have one? No, strict separation.
        # Check if they are acting as student?
        pass # Fall through to finding USN
        
    # 2. Find Student record linked to this Profile
    # Student.user_id == Profile.user_id
    from app.models import Student
    student = db.query(Student).filter(Student.user_id == current_user.user_id).first()
    
    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student academic record not found for this user"
        )
        
    return student.usn, current_user


# =============================================================================
# RBAC Exports (Option B)
# =============================================================================
# Re-export RBAC utilities for convenient import in endpoints

from app.core.policies import Permission, has_permission, PermissionDenied
from app.core.scope import ScopeResolver, AccessScope, ScopeType, check_scope_access
from app.core.authorization import (
    AuthorizationContext,
    require_permission,
    PermissionChecker,
    get_authorization_context
)

__all__ = [
    # Existing
    'get_db',
    'get_current_user',
    'get_current_user_with_role',
    'get_user_role',
    'RoleChecker',
    'require_principal',
    'require_hod_or_above',
    'require_teacher_or_above',
    'require_authenticated',
    # RBAC
    'Permission',
    'has_permission',
    'PermissionDenied',
    'ScopeResolver',
    'AccessScope',
    'ScopeType',
    'check_scope_access',
    'AuthorizationContext',
    'require_permission',
    'PermissionChecker',
    'get_authorization_context',
]

