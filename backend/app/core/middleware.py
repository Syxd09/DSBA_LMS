"""
EduMetrics Backend - Request ID & Logging Middleware

Structured logging with request tracing for audit safety.

PRODUCTION CONSTRAINT:
- Every request gets unique ID for tracing
- No raw marks or PII in logs
- Traceability across Phase-2A → 2B → 2C
"""
import logging
import time
from typing import Callable
from uuid import uuid4

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings


# Configure structured logger
logger = logging.getLogger("edumetrics")


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Add request ID to every request for tracing."""
    
    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        
        # Store in request state for use in handlers
        request.state.request_id = request_id
        
        # Process request
        response = await call_next(request)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """
    Log requests with audit-safe information.
    
    Does NOT log:
    - Request/response bodies (may contain marks)
    - Authorization headers
    - Query parameters containing student data
    """
    
    # Paths that should have minimal logging
    SENSITIVE_PATHS = [
        "/api/v1/analytics/marks",
        "/api/v1/analytics/co",
        "/api/v1/analytics/po",
        "/api/v1/analytics/result",
        "/api/v1/templates",
    ]
    
    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        start_time = time.time()
        
        # Get request ID
        request_id = getattr(request.state, "request_id", "unknown")
        
        # Process request
        try:
            response = await call_next(request)
            duration_ms = (time.time() - start_time) * 1000
            
            # Log based on path sensitivity
            if self._is_sensitive_path(request.url.path):
                # Minimal logging for analytics paths
                logger.info(
                    f"[{request_id}] {request.method} {request.url.path} "
                    f"→ {response.status_code} ({duration_ms:.1f}ms)"
                )
            else:
                # Standard logging for other paths
                logger.info(
                    f"[{request_id}] {request.method} {request.url.path} "
                    f"→ {response.status_code} ({duration_ms:.1f}ms) "
                    f"client={request.client.host if request.client else 'unknown'}"
                )
            
            return response
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"[{request_id}] {request.method} {request.url.path} "
                f"→ ERROR ({duration_ms:.1f}ms): {type(e).__name__}"
            )
            raise
    
    def _is_sensitive_path(self, path: str) -> bool:
        """Check if path contains sensitive data."""
        return any(path.startswith(p) for p in self.SENSITIVE_PATHS)


def configure_logging():
    """Configure structured logging for production."""
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    
    # Set specific loggers
    logging.getLogger("edumetrics").setLevel(log_level)
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    logger.info(f"Logging configured: level={logging.getLevelName(log_level)}")
