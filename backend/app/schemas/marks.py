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


# Computed marks schemas
class MarksComputedResponse(BaseModel):
    """Computed marks response schema."""
    id: UUID
    exam_id: UUID
    student_id: UUID
    total_marks: float
    selected_questions: List[str]
    computed_at: datetime
    
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


class FinalMarksResponse(FinalMarksBase):
    """Final marks response schema."""
    id: UUID
    internal_1: Optional[float] = None
    internal_2: Optional[float] = None
    best_internal: Optional[float] = None
    external_marks: Optional[float] = None
    total_marks: Optional[float] = None
    percentage: Optional[float] = None
    grade: Optional[str] = None
    grade_point: Optional[float] = None
    created_at: datetime
    student: Optional[ProfileResponse] = None
    
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
