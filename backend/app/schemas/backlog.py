"""
EduMetrics Backend - Backlog Schemas

Pydantic schemas for Backlog API endpoints.
"""
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, validator


class BacklogAttemptBase(BaseModel):
    """Base schema for backlog attempt."""
    student_usn: str = Field(..., description="Student USN")
    offering_id: UUID = Field(..., description="Subject offering ID")
    exam_type: str = Field(..., description="Exam type: EXT1, EXT2, BACKLOG, SUPPLY")
    semester_attempted: int = Field(..., ge=1, le=8, description="Semester when attempt was made")
    academic_year: Optional[str] = Field(None, description="Academic year e.g., '2025-26'")


class BacklogAttemptCreate(BacklogAttemptBase):
    """Schema for creating a backlog attempt."""
    external_marks: Optional[Decimal] = Field(None, ge=0, le=60)
    internal_marks_carried: Optional[Decimal] = Field(None, ge=0, le=40)
    result: Optional[str] = Field(None, description="PASS, FAIL, ABSENT, DETAINED")
    grade: Optional[str] = None
    exam_date: Optional[datetime] = None
    result_date: Optional[datetime] = None


class BacklogAttemptUpdate(BaseModel):
    """Schema for updating a backlog attempt."""
    external_marks: Optional[Decimal] = Field(None, ge=0, le=60)
    result: Optional[str] = None
    grade: Optional[str] = None
    is_best_attempt: Optional[bool] = None
    is_cleared: Optional[bool] = None
    result_date: Optional[datetime] = None


class BacklogAttemptInDB(BacklogAttemptBase):
    """Schema for backlog attempt from database."""
    id: UUID
    attempt_number: int
    external_marks: Optional[Decimal] = None
    external_max_marks: Optional[Decimal] = 60
    internal_marks_carried: Optional[Decimal] = None
    internal_max_marks: Optional[Decimal] = 40
    total_marks: Optional[Decimal] = None
    result: Optional[str] = None
    grade: Optional[str] = None
    grade_points: Optional[Decimal] = None
    is_best_attempt: bool = False
    is_cleared: bool = False
    exam_date: Optional[datetime] = None
    result_date: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class BacklogAttemptResponse(BacklogAttemptInDB):
    """Response schema with additional fields."""
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    student_name: Optional[str] = None


class StudentBacklogSummary(BaseModel):
    """Summary of a student's backlog status."""
    student_usn: str
    student_name: str
    total_backlogs: int
    cleared_backlogs: int
    pending_backlogs: int
    subjects: List[str]  # List of subject codes with pending backlog


class BacklogAttemptHistory(BaseModel):
    """Complete backlog history for a student-subject pair."""
    student_usn: str
    offering_id: UUID
    subject_code: str
    subject_name: str
    attempts: List[BacklogAttemptInDB]
    best_attempt: Optional[BacklogAttemptInDB] = None
    is_cleared: bool


class BacklogAnalytics(BaseModel):
    """Analytics for backlog management."""
    total_students: int
    students_with_backlog: int
    total_backlogs: int
    cleared_backlogs: int
    pending_backlogs: int
    pass_rate: float
    by_subject: List[dict]  # [{subject_code, subject_name, backlog_count, pass_rate}]
    by_semester: List[dict]  # [{semester, backlog_count}]


class BacklogListFilters(BaseModel):
    """Filters for listing backlog students."""
    cohort_id: Optional[UUID] = None
    offering_id: Optional[UUID] = None
    semester: Optional[int] = None
    result: Optional[str] = None
    is_cleared: Optional[bool] = None
