"""
EduMetrics Backend - Role-Based Permissions
"""
from enum import Enum
from functools import wraps
from typing import List

from fastapi import HTTPException, status


class AppRole(str, Enum):
    """User roles in the application."""
    PRINCIPAL = "principal"
    HOD = "hod"
    TEACHER = "teacher"
    STUDENT = "student"


# Role hierarchy for permission checks
ROLE_HIERARCHY = {
    AppRole.PRINCIPAL: 4,
    AppRole.HOD: 3,
    AppRole.TEACHER: 2,
    AppRole.STUDENT: 1,
}


def check_role_permission(user_role: str, allowed_roles: List[str]) -> bool:
    """Check if user's role is in the allowed roles list."""
    return user_role in allowed_roles


def require_roles(*allowed_roles: str):
    """Decorator factory to require specific roles."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # The current_user should be injected as a dependency
            current_user = kwargs.get('current_user')
            if current_user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            
            if current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not enough permissions"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def has_minimum_role(user_role: str, minimum_role: str) -> bool:
    """Check if user has at least the minimum required role level."""
    try:
        user_level = ROLE_HIERARCHY.get(AppRole(user_role), 0)
        required_level = ROLE_HIERARCHY.get(AppRole(minimum_role), 0)
        return user_level >= required_level
    except ValueError:
        return False
