"""
EduMetrics Analytics Layer - Module Initialization

This module provides read-only analytics APIs that orchestrate
Phase-2A computation functions.

EXECUTION GUARDS (NON-NEGOTIABLE):
1. API layer remains thin - no computation logic
2. Query helpers fetch raw data only
3. One endpoint = one academic intent
4. Warnings are first-class data
5. Evidence stability guarantee
"""

from app.services.analytics.query_helpers import (
    # Student queries
    get_offering_enrolled_students,
    get_student_statuses,
    get_student_by_usn,
    # Exam queries
    get_offering_exams,
    get_exam_by_type,
    get_exam_sections,
    # Question queries
    get_exam_sub_questions,
    get_co_sub_questions,
    get_student_question_marks,
    get_all_student_marks_for_exam,
    # Component queries
    get_assignment_marks,
    get_attendance_mark,
    get_activity_mark,
    # CO/PO queries
    get_offering_cos,
    get_program_pos,
    get_co_po_mappings,
    get_all_co_po_mappings_for_program,
    # Config queries
    get_grading_rules,
    get_pass_criteria,
    get_attainment_config,
    # Final marks queries
    get_student_attempts,
    get_student_backlogs,
    # Pagination
    paginate_usns,
)

from app.services.analytics.schemas import (
    # Common
    WarningDTO,
    PaginationDTO,
    AnalyticsResponse,
    # Marks
    InternalMarksDTO,
    ExternalMarksDTO,
    SectionMarksDTO,
    TotalMarksDTO,
    GradeDTO,
    StudentMarksResponse,
    # CO
    AttainmentDTO,
    COAttainmentDTO,
    COSummaryDTO,
    COAttainmentListResponse,
    StudentCOEvidenceDTO,
    QuestionMarkDTO,
    COStudentEvidenceResponse,
    # PO
    COContributionDTO,
    POAttainmentDTO,
    POSummaryDTO,
    POAttainmentListResponse,
    # SGPA/CGPA
    SubjectResultDTO,
    SGPAResponse,
    SemesterSGPADTO,
    CGPAResponse,
    # Result
    ResultResponse,
    BacklogSubjectDTO,
    BacklogSubjectDTO,
    BacklogSummaryResponse,
)

from app.services.analytics.role_scoped import (
    StudentAnalyticsService,
    FacultyAnalyticsService,
    HODAnalyticsService,
    PrincipalAnalyticsService,
)

__all__ = [
    # Query helpers
    "get_offering_enrolled_students",
    "get_student_statuses",
    "get_student_by_usn",
    "get_offering_exams",
    "get_exam_by_type",
    "get_exam_sections",
    "get_exam_sub_questions",
    "get_co_sub_questions",
    "get_student_question_marks",
    "get_all_student_marks_for_exam",
    "get_assignment_marks",
    "get_attendance_mark",
    "get_activity_mark",
    "get_offering_cos",
    "get_program_pos",
    "get_co_po_mappings",
    "get_all_co_po_mappings_for_program",
    "get_grading_rules",
    "get_pass_criteria",
    "get_attainment_config",
    "get_student_attempts",
    "get_student_backlogs",
    "paginate_usns",
    # Schemas
    "WarningDTO",
    "PaginationDTO",
    "AnalyticsResponse",
    "InternalMarksDTO",
    "ExternalMarksDTO",
    "SectionMarksDTO",
    "TotalMarksDTO",
    "GradeDTO",
    "StudentMarksResponse",
    "AttainmentDTO",
    "COAttainmentDTO",
    "COSummaryDTO",
    "COAttainmentListResponse",
    "StudentCOEvidenceDTO",
    "QuestionMarkDTO",
    "COStudentEvidenceResponse",
    "COContributionDTO",
    "POAttainmentDTO",
    "POSummaryDTO",
    "POAttainmentListResponse",
    "SubjectResultDTO",
    "SGPAResponse",
    "SemesterSGPADTO",
    "CGPAResponse",
    "ResultResponse",
    "BacklogSubjectDTO",
    "BacklogSummaryResponse",
    # Role Scoped Services
    "StudentAnalyticsService",
    "FacultyAnalyticsService",
    "HODAnalyticsService",
    "PrincipalAnalyticsService",
]
