"""
EduMetrics Backend - Custom Exceptions
"""
from fastapi import HTTPException, status


class EduMetricsException(Exception):
    """Base exception for EduMetrics."""
    def __init__(self, message: str, code: str = "EDUMETRICS_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class NotFoundError(EduMetricsException):
    """Resource not found."""
    def __init__(self, resource: str, identifier: str = ""):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with id '{identifier}' not found"
        super().__init__(message, "NOT_FOUND")


class ValidationError(EduMetricsException):
    """Validation error."""
    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR")


class AuthenticationError(EduMetricsException):
    """Authentication error."""
    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message, "AUTHENTICATION_ERROR")


class AuthorizationError(EduMetricsException):
    """Authorization error."""
    def __init__(self, message: str = "Not authorized"):
        super().__init__(message, "AUTHORIZATION_ERROR")


class ConflictError(EduMetricsException):
    """Conflict error (duplicate, etc.)."""
    def __init__(self, message: str):
        super().__init__(message, "CONFLICT_ERROR")


class ExamLockedError(EduMetricsException):
    """Exam is locked and cannot be modified."""
    def __init__(self, exam_id: str):
        super().__init__(f"Exam {exam_id} is locked and cannot be modified", "EXAM_LOCKED")


def raise_not_found(resource: str, identifier: str = ""):
    """Raise HTTP 404 exception."""
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=NotFoundError(resource, identifier).message
    )


def raise_forbidden(message: str = "Not authorized"):
    """Raise HTTP 403 exception."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=message
    )


def raise_conflict(message: str):
    """Raise HTTP 409 exception."""
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message
    )
