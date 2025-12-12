"""
EduMetrics Backend - Common Schemas
Shared Pydantic models for API responses
"""
from typing import Generic, TypeVar, Optional, List
from pydantic import BaseModel
from datetime import datetime

T = TypeVar("T")


class ResponseBase(BaseModel):
    """Base response model."""
    success: bool = True
    message: Optional[str] = None


class PaginatedResponse(ResponseBase, Generic[T]):
    """Paginated response model."""
    data: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorResponse(BaseModel):
    """Error response model."""
    success: bool = False
    error: str
    code: Optional[str] = None
    details: Optional[dict] = None


class TimestampMixin(BaseModel):
    """Mixin for timestamps."""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
