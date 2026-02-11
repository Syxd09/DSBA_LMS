"""
EduMetrics Backend - Marks Schemas
Pydantic models for marks-related endpoints
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from uuid import UUID
from decimal import Decimal
from app.schemas.user import ProfileResponse


# Student marks schemas
class StudentMarkEntry(BaseModel):
    """Single mark entry."""
    student_id: str  # Changed to str to support USN
    sub_question_id: UUID
    marks: float


class BulkMarksCreate(BaseModel):
    """Bulk marks entry schema."""
    exam_id: UUID
    marks: List[StudentMarkEntry]


class StudentMarksResponse(BaseModel):
    """Student marks response schema."""
    id: UUID
    exam_id: UUID
    student_id: str  # Changed from UUID to str (returns USN)
    sub_question_id: UUID
    marks: float
    entered_at: datetime
    
    class Config:
        from_attributes = True


# Final marks schemas
class FinalMarksBase(BaseModel):
    """Base final marks schema."""
    student_id: UUID
    subject_id: UUID
    cohort_id: UUID


class FinalMarksCreate(FinalMarksBase):
    """Create final marks schema."""
    internal_1: Optional[float] = None
    internal_2: Optional[float] = None
    external_marks: Optional[float] = None


class FinalMarksResponse(BaseModel):
    """Final marks response schema — RAW INPUTS ONLY."""
    id: UUID
    usn: Optional[str] = None
    subject_id: Optional[UUID] = None
    cohort_id: UUID
    internal_1: Optional[float] = None
    internal_2: Optional[float] = None
    assignment_1: Optional[float] = None
    assignment_2: Optional[float] = None
    attendance: Optional[float] = None
    activity: Optional[float] = None
    external_marks: Optional[float] = None
    is_backlog: bool = False
    attempt_number: int = 1
    created_at: datetime
    
    class Config:
        from_attributes = True


# Semester result schemas
class SemesterResultResponse(BaseModel):
    """Semester result response schema."""
    id: UUID
    student_id: UUID
    cohort_id: UUID
    semester: int
    total_credits: Optional[int] = None
    earned_credits: Optional[int] = None
    sgpa: Optional[float] = None
    cgpa: Optional[float] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True
