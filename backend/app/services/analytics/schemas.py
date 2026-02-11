"""
EduMetrics Analytics Layer - Response Schemas

Pydantic models for analytics API responses.

EXECUTION GUARD #4: Warnings are first-class data.
All responses include warnings and is_complete flag.
"""
from typing import List, Optional, Any, Dict
from uuid import UUID
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field


# =============================================================================
# Common Response Components
# =============================================================================

class WarningDTO(BaseModel):
    """Warning propagated from computation layer."""
    code: str
    message: str
    affected: List[str] = Field(default_factory=list)


class PaginationDTO(BaseModel):
    """Pagination metadata."""
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool


class AnalyticsResponse(BaseModel):
    """
    Standard wrapper for all analytics responses.
    
    EXECUTION GUARD #4: Warnings must be returned even when data exists.
    """
    data: Any
    warnings: List[WarningDTO] = Field(default_factory=list)
    is_complete: bool = True
    computed_at: datetime = Field(default_factory=datetime.utcnow)
    pagination: Optional[PaginationDTO] = None


# =============================================================================
# Student Marks Schemas
# =============================================================================

class InternalMarksDTO(BaseModel):
    """Internal marks breakdown."""
    best_exam_scaled: Decimal = Field(description="Best internal exam scaled to 20")
    int1_raw: Optional[Decimal] = Field(description="INT1 raw marks (max 40)")
    int2_raw: Optional[Decimal] = Field(description="INT2 raw marks (max 40)")
    assignment_1: Decimal = Field(description="Assignment 1 marks (max 5)")
    assignment_2: Decimal = Field(description="Assignment 2 marks (max 5)")
    attendance: Decimal = Field(description="Attendance marks (max 5)")
    activity: Decimal = Field(description="Activity marks (max 5)")
    total: Decimal = Field(description="Total internal marks (max 40)")


class SectionMarksDTO(BaseModel):
    """Section marks with selection mode."""
    section_id: UUID
    section_marks: Decimal
    section_max: Decimal
    selection_mode: str
    questions_attempted: int


class ExternalMarksDTO(BaseModel):
    """External marks breakdown."""
    total: Decimal = Field(description="Total external marks (max 60)")
    sections: List[SectionMarksDTO] = Field(default_factory=list)


class TotalMarksDTO(BaseModel):
    """Total marks summary."""
    internal: Decimal
    external: Decimal
    total: Decimal
    percentage: Decimal


class GradeDTO(BaseModel):
    """Grade result."""
    grade: str
    grade_point: Decimal
    passed: bool


class StudentMarksResponse(BaseModel):
    """Complete student marks for an offering."""
    usn: str
    offering_id: UUID
    internal: InternalMarksDTO
    external: ExternalMarksDTO
    total: TotalMarksDTO
    grade: GradeDTO
    is_backlog: bool
    attempt_count: int


# =============================================================================
# CO Attainment Schemas
# =============================================================================

class AttainmentDTO(BaseModel):
    """Attainment result for a category."""
    percentage: Decimal
    level: int = Field(ge=0, le=3)
    appeared_students: int
    passing_students: int
    threshold: Decimal


class COAttainmentDTO(BaseModel):
    """Single CO attainment."""
    co_id: UUID
    co_code: str
    co_statement: str
    internal_attainment: AttainmentDTO
    external_attainment: AttainmentDTO
    final_attainment: AttainmentDTO


class COSummaryDTO(BaseModel):
    """CO attainment summary."""
    total_cos: int
    cos_attained: int = Field(description="COs with level >= 1")
    average_attainment: Decimal


class COAttainmentListResponse(BaseModel):
    """All CO attainments for an offering."""
    offering_id: UUID
    cos: List[COAttainmentDTO]
    summary: COSummaryDTO


class QuestionMarkDTO(BaseModel):
    """Question-level marks evidence."""
    question_id: UUID
    question_number: str
    sub_question_id: UUID
    marks_obtained: Decimal
    max_marks: Decimal


class StudentCOEvidenceDTO(BaseModel):
    """Student-level CO evidence for drill-down."""
    usn: str
    obtained_marks: Decimal
    max_marks: Decimal
    percentage: Decimal
    meets_threshold: bool
    question_breakdown: List[QuestionMarkDTO] = Field(default_factory=list)


class COStudentEvidenceResponse(BaseModel):
    """CO student evidence drill-down."""
    co_id: UUID
    co_code: str
    students: List[StudentCOEvidenceDTO]
    pagination: Optional[PaginationDTO] = None


# =============================================================================
# PO Attainment Schemas
# =============================================================================

class COContributionDTO(BaseModel):
    """CO contribution to PO attainment."""
    co_id: UUID
    co_code: str
    correlation_level: int = Field(ge=1, le=3)
    attainment_percentage: Decimal


class POAttainmentDTO(BaseModel):
    """Single PO attainment."""
    po_id: UUID
    po_code: str
    po_statement: str
    attainment_percentage: Decimal
    attainment_level: int = Field(ge=0, le=3)
    contributing_cos: List[COContributionDTO] = Field(default_factory=list)
    
    # NBA Breakdown
    direct_attainment: Optional[Decimal] = Field(default=None, description="Direct attainment from COs (80%)")
    indirect_attainment: Optional[Decimal] = Field(default=None, description="Indirect attainment from Surveys (20%)")


class POSummaryDTO(BaseModel):
    """PO attainment summary."""
    total_pos: int
    pos_attained: int = Field(description="POs with level >= 1")
    average_attainment: Decimal


class POAttainmentListResponse(BaseModel):
    """All PO attainments for a program-year."""
    program_id: UUID
    academic_year: int
    pos: List[POAttainmentDTO]
    summary: POSummaryDTO


# =============================================================================
# SGPA / CGPA Schemas
# =============================================================================

class SubjectResultDTO(BaseModel):
    """Subject result for SGPA calculation."""
    subject_code: str
    subject_name: str
    credits: Decimal
    grade: str
    grade_point: Decimal
    passed: bool


class SGPAResponse(BaseModel):
    """Student SGPA for a semester."""
    usn: str
    semester_id: UUID
    semester_number: int
    sgpa: Decimal
    total_credits: Decimal
    subjects: List[SubjectResultDTO]
    subjects_passed: int
    subjects_failed: int


class SemesterSGPADTO(BaseModel):
    """Semester SGPA for CGPA calculation."""
    semester_number: int
    sgpa: Decimal
    credits: Decimal
    subjects_passed: int
    subjects_failed: int


class CGPAResponse(BaseModel):
    """Student CGPA across all semesters."""
    usn: str
    cgpa: Decimal
    total_credits: Decimal
    semesters: List[SemesterSGPADTO]
    semesters_completed: int
    has_backlogs: bool


# =============================================================================
# Result & Backlog Schemas
# =============================================================================

class ResultResponse(BaseModel):
    """Student result with grade."""
    usn: str
    offering_id: UUID
    subject_code: str
    subject_name: str
    internal: Decimal
    external: Decimal
    total: Decimal
    grade: str
    grade_point: Decimal
    passed: bool
    is_backlog: bool
    attempt_count: int


class BacklogSubjectDTO(BaseModel):
    """Backlog subject details."""
    offering_id: UUID
    subject_code: str
    subject_name: str
    attempt_count: int
    latest_internal: Decimal
    best_external: Decimal
    latest_total: Decimal
    passed: bool


class BacklogSummaryResponse(BaseModel):
    """Student backlog summary."""
    usn: str
    total_backlogs: int
    cleared_backlogs: int
    pending_backlogs: int
    subjects: List[BacklogSubjectDTO]


# =============================================================================
# Bloom Analysis Schemas
# =============================================================================

class BloomLevelDTO(BaseModel):
    """Bloom level details."""
    level_name: str
    level_order: int
    version: str

class BloomStatsDTO(BaseModel):
    """Stats for a specific Bloom level."""
    level: BloomLevelDTO
    max_marks: Decimal = Field(description="Total marks allocated to this level")
    obtained_marks: Decimal = Field(description="Total marks obtained by students")
    percentage: Decimal = Field(description="Obtained / Max * 100")
    average_score: Decimal = Field(description="Average score per question")

class BloomAnalysisDTO(BaseModel):
    """Bloom analysis for an offering."""
    offering_id: UUID
    total_marks: Decimal
    bloom_distribution: List[BloomStatsDTO]
    weakest_levels: List[str]
