"""
EduMetrics Backend - Global Error Handlers

Unified error response structure for production.

PRODUCTION CONSTRAINT:
- All errors follow consistent structure
- Computation warnings propagated correctly
- No raw marks or PII in error details
"""
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import (
    EduMetricsException,
    NotFoundError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    ExamLockedError,
)


class ErrorResponse:
    """Standardized error response structure."""
    
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        warnings: Optional[List[Dict]] = None,
    ):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        self.request_id = request_id or str(uuid4())
        self.warnings = warnings or []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response."""
        return {
            "error": {
                "code": self.error_code,
                "message": self.message,
                "details": self.details,
            },
            "request_id": self.request_id,
            "warnings": self.warnings,
        }
    
    def to_response(self) -> JSONResponse:
        """Convert to FastAPI JSONResponse."""
        return JSONResponse(
            status_code=self.status_code,
            content=self.to_dict(),
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on app."""
    
    @app.exception_handler(EduMetricsException)
    async def edumetrics_exception_handler(
        request: Request,
        exc: EduMetricsException
    ) -> JSONResponse:
        """Handle custom EduMetrics exceptions."""
        status_code = _get_status_code_for_exception(exc)
        request_id = getattr(request.state, "request_id", str(uuid4()))
        
        return ErrorResponse(
            status_code=status_code,
            error_code=exc.code,
            message=exc.message,
            request_id=request_id,
        ).to_response()
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors."""
        request_id = getattr(request.state, "request_id", str(uuid4()))
        
        # Extract field errors without exposing raw values
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "type": error["type"],
                "message": error["msg"],
            })
        
        return ErrorResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            message="Request validation failed",
            details={"errors": errors},
            request_id=request_id,
        ).to_response()
    
    @app.exception_handler(SQLAlchemyError)
    async def database_exception_handler(
        request: Request,
        exc: SQLAlchemyError
    ) -> JSONResponse:
        """Handle database errors safely."""
        request_id = getattr(request.state, "request_id", str(uuid4()))
        
        # Log full error internally but don't expose to client
        import logging
        logging.error(f"Database error [request_id={request_id}]: {str(exc)}")
        
        return ErrorResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DATABASE_ERROR",
            message="A database error occurred. Please try again.",
            request_id=request_id,
        ).to_response()
    
    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request,
        exc: Exception
    ) -> JSONResponse:
        """Handle uncaught exceptions."""
        request_id = getattr(request.state, "request_id", str(uuid4()))
        
        # Log full error internally
        import logging
        logging.exception(f"Unhandled exception [request_id={request_id}]")
        
        return ErrorResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="INTERNAL_ERROR",
            message="An unexpected error occurred.",
            request_id=request_id,
        ).to_response()


def _get_status_code_for_exception(exc: EduMetricsException) -> int:
    """Map exception type to HTTP status code."""
    mapping = {
        NotFoundError: status.HTTP_404_NOT_FOUND,
        ValidationError: status.HTTP_400_BAD_REQUEST,
        AuthenticationError: status.HTTP_401_UNAUTHORIZED,
        AuthorizationError: status.HTTP_403_FORBIDDEN,
        ConflictError: status.HTTP_409_CONFLICT,
        ExamLockedError: status.HTTP_423_LOCKED,
    }
    
    for exception_type, status_code in mapping.items():
        if isinstance(exc, exception_type):
            return status_code
    
    return status.HTTP_500_INTERNAL_SERVER_ERROR
