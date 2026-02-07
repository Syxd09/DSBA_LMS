"""
EduMetrics Backend - RBAC Authorization
Decorators and utilities for permission enforcement at API boundary.

NOTE: This module enforces authorization at the API boundary.
Phase-2A/2B computation logic remains untouched.
"""
import logging
from typing import Optional, Callable, List
from uuid import UUID
from functools import wraps
from datetime import datetime

from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.core.permissions import AppRole
from app.core.policies import Permission, has_permission, PermissionDenied, ROLE_PERMISSIONS
from app.core.scope import ScopeResolver, AccessScope, ScopeType, check_scope_access
from app.models import Profile, UserRole


logger = logging.getLogger(__name__)


class AuthorizationContext:
    """
    Context object containing authorization info for a request.
    
    Injected into endpoints via dependency injection.
    """
    def __init__(
        self,
        user: Profile,
        role: AppRole,
        scope: AccessScope,
        permissions: set[Permission]
    ):
        self.user = user
        self.role = role
        self.scope = scope
        self.permissions = permissions
        self.timestamp = datetime.utcnow()
    
    def has_permission(self, permission: Permission) -> bool:
        """Check if context has a specific permission."""
        if Permission.ALL in self.permissions:
            return True
        return permission in self.permissions
    
    def can_access_resource(
        self,
        department_id: Optional[UUID] = None,
        cohort_id: Optional[UUID] = None,
        offering_id: Optional[UUID] = None,
        student_usn: Optional[str] = None
    ) -> bool:
        """Check if context allows access to specified resource."""
        allowed, _ = check_scope_access(
            self.scope,
            department_id=department_id,
            cohort_id=cohort_id,
            offering_id=offering_id,
            student_usn=student_usn
        )
        return allowed


def get_authorization_context(
    db: Session = Depends(get_db),
    request: Request = None
) -> AuthorizationContext:
    """
    Get authorization context for the current request.
    
    This is a FastAPI dependency that can be injected into endpoints.
    When RBAC is disabled, returns a context with full permissions.
    """
    from app.api.deps import get_current_user
    
    # Get current user via existing auth mechanism
    # Note: This will raise 401 if not authenticated
    user = None
    role = AppRole.STUDENT
    
    try:
        # Extract token from request
        from app.core.security import oauth2_scheme, decode_access_token
        auth_header = request.headers.get("Authorization", "") if request else ""
        
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            payload = decode_access_token(token)
            
            if payload:
                user_id = payload.get("sub")
                if user_id:
                    user = db.query(Profile).filter(Profile.user_id == user_id).first()
                    
                    if user:
                        user_role = db.query(UserRole).filter(
                            UserRole.user_id == user.user_id
                        ).first()
                        if user_role:
                            role = user_role.role
    except Exception as e:
        logger.warning(f"Failed to extract auth context: {e}")
    
    # If RBAC is disabled, return unrestricted context
    if not settings.ENABLE_RBAC:
        return AuthorizationContext(
            user=user,
            role=role,
            scope=AccessScope(scope_type=ScopeType.ALL),
            permissions=set(Permission) - {Permission.ALL}  # All permissions
        )
    
    # Resolve scope and permissions
    scope = ScopeResolver.resolve(db, user, role) if user else AccessScope(
        scope_type=ScopeType.OWN,
        department_ids=[],
        cohort_ids=[],
        student_usns=[]
    )
    
    permissions = ROLE_PERMISSIONS.get(role, set())
    
    return AuthorizationContext(
        user=user,
        role=role,
        scope=scope,
        permissions=permissions
    )


def log_permission_decision(
    user: Optional[Profile],
    role: AppRole,
    permission: Permission,
    resource: str,
    decision: str,
    reason: str = ""
):
    """Log permission decision for audit trail."""
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": str(user.user_id) if user else "anonymous",
        "role": role.value if isinstance(role, AppRole) else str(role),
        "permission": permission.value,
        "resource": resource,
        "decision": decision,
        "reason": reason
    }
    
    if decision == "DENY":
        logger.warning(f"Permission denied: {log_data}")
    else:
        logger.debug(f"Permission granted: {log_data}")


def require_permission(
    permission: Permission,
    resource_extractor: Optional[Callable] = None
):
    """
    Decorator factory for permission enforcement.
    
    Usage:
        @router.get("/analytics/co/{offering_id}")
        @require_permission(Permission.CO_ATTAINMENT_READ)
        async def get_co_attainment(...):
            ...
    
    Args:
        permission: Required permission
        resource_extractor: Optional function to extract resource IDs from kwargs
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Skip if RBAC disabled
            if not settings.ENABLE_RBAC:
                return await func(*args, **kwargs)
            
            # Get auth context from kwargs (injected by FastAPI)
            auth_ctx: AuthorizationContext = kwargs.get('auth_ctx')
            
            if auth_ctx is None:
                # Try to get from request
                db = kwargs.get('db')
                request = kwargs.get('request')
                
                if db:
                    auth_ctx = get_authorization_context(db, request)
                    kwargs['auth_ctx'] = auth_ctx
            
            if auth_ctx is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check permission
            if not auth_ctx.has_permission(permission):
                log_permission_decision(
                    auth_ctx.user,
                    auth_ctx.role,
                    permission,
                    resource=func.__name__,
                    decision="DENY",
                    reason="permission not in role"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission.value}"
                )
            
            # If resource extractor provided, check scope
            if resource_extractor:
                resource_ids = resource_extractor(kwargs)
                allowed, reason = check_scope_access(
                    auth_ctx.scope,
                    **resource_ids
                )
                
                if not allowed:
                    log_permission_decision(
                        auth_ctx.user,
                        auth_ctx.role,
                        permission,
                        resource=str(resource_ids),
                        decision="DENY",
                        reason=reason
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access denied: {reason}"
                    )
            
            log_permission_decision(
                auth_ctx.user,
                auth_ctx.role,
                permission,
                resource=func.__name__,
                decision="ALLOW"
            )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


class PermissionChecker:
    """
    Alternative permission checker as FastAPI dependency.
    
    Usage:
        @router.get("/resource")
        async def get_resource(
            permission_check: bool = Depends(PermissionChecker(Permission.RESOURCE_READ))
        ):
            ...
    """
    def __init__(self, permission: Permission):
        self.permission = permission
    
    def __call__(
        self,
        auth_ctx: AuthorizationContext = Depends(get_authorization_context)
    ) -> bool:
        if not settings.ENABLE_RBAC:
            return True
        
        if not auth_ctx.has_permission(self.permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.permission.value}"
            )
        
        return True
