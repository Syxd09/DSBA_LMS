"""Core utilities for EduMetrics Backend."""
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    oauth2_scheme,
)
from app.core.permissions import AppRole, check_role_permission, has_minimum_role
from app.core.exceptions import (
    EduMetricsException,
    NotFoundError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    raise_not_found,
    raise_forbidden,
)

__all__ = [
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "decode_access_token",
    "oauth2_scheme",
    "AppRole",
    "check_role_permission",
    "has_minimum_role",
    "EduMetricsException",
    "NotFoundError",
    "ValidationError",
    "AuthenticationError",
    "AuthorizationError",
    "raise_not_found",
    "raise_forbidden",
]
