"""EduMetrics Backend - Unit and Topic Schemas"""
from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


# ============================================================================
# UNIT SCHEMAS
# ============================================================================

class UnitBase(BaseModel):
    """Base schema for Unit."""
    unit_no: int = Field(..., ge=1, le=20, description="Unit number (1-20)")
    name: str = Field(..., min_length=1, max_length=200, description="Unit name")


class UnitCreate(UnitBase):
    """Schema for creating a Unit."""
    pass


class UnitUpdate(BaseModel):
    """Schema for updating a Unit."""
    unit_no: Optional[int] = Field(None, ge=1, le=20)
    name: Optional[str] = Field(None, min_length=1, max_length=200)


class UnitResponse(UnitBase):
    """Schema for Unit response."""
    id: UUID
    offering_id: UUID
    created_at: datetime
    topics_count: Optional[int] = 0
    
    class Config:
        from_attributes = True


class UnitWithTopicsResponse(UnitResponse):
    """Schema for Unit with nested topics."""
    topics: List["TopicResponse"] = []
    
    class Config:
        from_attributes = True


# ============================================================================
# TOPIC SCHEMAS
# ============================================================================

class TopicBase(BaseModel):
    """Base schema for Topic."""
    name: str = Field(..., min_length=1, max_length=200, description="Topic name")


class TopicCreate(TopicBase):
    """Schema for creating a Topic."""
    pass


class TopicUpdate(BaseModel):
    """Schema for updating a Topic."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)


class TopicResponse(TopicBase):
    """Schema for Topic response."""
    id: UUID
    unit_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# BULK OPERATIONS
# ============================================================================

class UnitReorderRequest(BaseModel):
    """Schema for reordering units."""
    unit_ids: List[UUID] = Field(..., description="Ordered list of unit IDs")


class BulkTopicCreate(BaseModel):
    """Schema for bulk topic creation."""
    topics: List[TopicCreate] = Field(..., min_length=1, max_length=50)


# Forward references
UnitWithTopicsResponse.model_rebuild()
