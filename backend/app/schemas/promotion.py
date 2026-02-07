"""
EduMetrics Backend - Promotion Schemas

Pydantic schemas for Semester Promotion API endpoints.
"""
from datetime import datetime
from typing import Optional, List, Dict
from uuid import UUID

from pydantic import BaseModel, Field


class PromotionStudentStatus(BaseModel):
    """Status of a single student in promotion preview."""
    student_usn: str
    student_name: str
    status: str  # ELIGIBLE, DETAINED, ON_HOLD
    reason: Optional[str] = None
    backlog_count: int = 0
    attendance_percentage: Optional[int] = None
    cgpa: Optional[str] = None


class PromotionPreview(BaseModel):
    """Preview of promotion before execution."""
    cohort_id: UUID
    cohort_name: str
    from_semester: int
    to_semester: int
    total_students: int
    eligible_count: int
    detained_count: int
    on_hold_count: int
    students: List[PromotionStudentStatus]


class PromotionRequest(BaseModel):
    """Request to execute promotion."""
    confirm: bool = Field(..., description="Must be True to execute")
    approval_notes: Optional[str] = None
    override_detained: Optional[List[str]] = None  # List of USNs to force-promote


class PromotionExecuteResponse(BaseModel):
    """Response after executing promotion."""
    promotion_id: UUID
    cohort_id: UUID
    from_semester: int
    to_semester: int
    students_promoted: int
    students_detained: int
    executed_at: datetime
    approved_by: UUID


class SemesterPromotionInDB(BaseModel):
    """Schema for promotion record from database."""
    id: UUID
    cohort_id: UUID
    from_semester: int
    to_semester: int
    academic_year: str
    approved_by: UUID
    approved_at: datetime
    approval_notes: Optional[str] = None
    total_students: int
    students_promoted: int
    students_detained: int
    students_on_hold: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class PromotionWithDetails(SemesterPromotionInDB):
    """Promotion record with additional details."""
    cohort_name: Optional[str] = None
    approver_name: Optional[str] = None
    promoted_students: Optional[List[str]] = None  # List of USNs
    detained_students: Optional[List[str]] = None  # List of USNs


class PromotionHistory(BaseModel):
    """Promotion history for a cohort."""
    cohort_id: UUID
    cohort_name: str
    current_semester: int
    promotions: List[SemesterPromotionInDB]


class DetentionReason(BaseModel):
    """Reason for student detention."""
    reason_type: str  # BACKLOG_LIMIT, ATTENDANCE_SHORTAGE, CGPA_LOW, OTHER
    description: str
    threshold: Optional[str] = None
    actual_value: Optional[str] = None
