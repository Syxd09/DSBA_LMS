"""
EduMetrics Backend - Student Schemas
Pydantic models for Student entity (USN-based)
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr
from uuid import UUID
from app.schemas.organization import CohortResponse, SectionResponse

class StudentBase(BaseModel):
    """Base student schema."""
    usn: str
    name: str
    email: Optional[EmailStr] = None
    cohort_id: UUID
    section_id: Optional[UUID] = None
    admission_semester: int = 1
    status: str = "active"

class StudentCreate(StudentBase):
    """Create student schema."""
    pass

class StudentUpdate(BaseModel):
    """Update student schema."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    cohort_id: Optional[UUID] = None
    section_id: Optional[UUID] = None
    admission_semester: Optional[int] = None
    status: Optional[str] = None

class StudentResponse(StudentBase):
    """Student response schema."""
    created_at: datetime
    cohort: Optional[CohortResponse] = None
    section: Optional[SectionResponse] = None
    
    class Config:
        from_attributes = True
