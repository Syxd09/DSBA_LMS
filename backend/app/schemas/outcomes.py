"""
EduMetrics Backend - Outcomes Schemas
Pydantic models for CO, PO, and mapping endpoints
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from uuid import UUID


# Course Outcome schemas
class CourseOutcomeBase(BaseModel):
    """Base course outcome schema."""
    subject_id: UUID
    co_number: int
    description: str
    bloom_level: str  # Remember, Understand, Apply, Analyze, Evaluate, Create


class CourseOutcomeCreate(CourseOutcomeBase):
    """Create course outcome schema."""
    pass


class CourseOutcomeUpdate(BaseModel):
    """Update course outcome schema."""
    description: Optional[str] = None
    bloom_level: Optional[str] = None


class CourseOutcomeResponse(CourseOutcomeBase):
    """Course outcome response schema."""
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Program Outcome schemas
class ProgramOutcomeBase(BaseModel):
    """Base program outcome schema."""
    program_id: UUID
    po_number: int
    description: str


class ProgramOutcomeCreate(ProgramOutcomeBase):
    """Create program outcome schema."""
    pass


class ProgramOutcomeResponse(ProgramOutcomeBase):
    """Program outcome response schema."""
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# CO-PO Mapping schemas
class COPOMappingBase(BaseModel):
    """Base CO-PO mapping schema."""
    co_id: UUID
    po_id: UUID
    correlation_level: int  # 1=Low, 2=Medium, 3=High


class COPOMappingCreate(COPOMappingBase):
    """Create CO-PO mapping schema."""
    pass


class COPOMappingBulkCreate(BaseModel):
    """Bulk create CO-PO mappings."""
    mappings: List[COPOMappingCreate]


class COPOMappingResponse(COPOMappingBase):
    """CO-PO mapping response schema."""
    id: UUID
    
    class Config:
        from_attributes = True
