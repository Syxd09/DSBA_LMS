"""
EduMetrics Analytics Layer - Marks Orchestration Service

Orchestrates Phase-2A computation functions for marks-related APIs.

EXECUTION GUARD #1: API layer remains thin.
- Controllers ONLY call orchestration functions
- All computation delegated to Phase-2A
"""
from typing import List, Dict, Optional, Tuple
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from sqlalchemy.orm import Session

from app.services.analytics.query_helpers import (
    get_offering_enrolled_students,
    get_student_statuses,
    get_offering_exams,
    get_exam_by_type,
    get_exam_sections,
    get_exam_sub_questions,
    get_student_question_marks,
    get_assignment_marks,
    get_attendance_mark,
    get_activity_mark,
    get_student_attempts,
    get_grading_rules,
    get_pass_criteria,
    paginate_usns,
)
from app.services.analytics.schemas import (
    WarningDTO,
    PaginationDTO,
    AnalyticsResponse,
    InternalMarksDTO,
    ExternalMarksDTO,
    SectionMarksDTO,
    TotalMarksDTO,
    GradeDTO,
    StudentMarksResponse,
)
from app.services.computation import (
    # Computation functions (Phase-2A)
    compute_best_internal,
    compute_internal_total,
    get_section_marks_with_selection,
    compute_total_marks,
    compute_grade as compute_grade_fn,
    get_result_marks,
    AttemptData,
    PassCriteria,
    GradingRule,
    WarningCode,
    ComputationWarning,
)


def _warning_to_dto(w: ComputationWarning) -> WarningDTO:
    """Convert computation warning to DTO."""
    return WarningDTO(
        code=w.code.value,
        message=w.message,
        affected=w.affected_entities
    )


def compute_student_internal_marks(
    db: Session,
    usn: str,
    offering_id: UUID
) -> Tuple[InternalMarksDTO, List[WarningDTO], bool]:
    """
    Compute internal marks for a student.
    
    Orchestrates:
    - get_exam_by_type (INT1, INT2)
    - get_student_question_marks
    - compute_best_internal
    - compute_internal_total
    
    Returns (InternalMarksDTO, warnings, is_complete)
    """
    all_warnings = []
    is_complete = True
    
    # Get INT1 and INT2 exams
    int1_exam = get_exam_by_type(db, offering_id, "INT1")
    int2_exam = get_exam_by_type(db, offering_id, "INT2")
    
    int1_raw = None
    int2_raw = None
    
    # Fetch INT1 marks
    if int1_exam:
        int1_marks = get_student_question_marks(db, usn, int1_exam.id)
        if int1_marks:
            int1_raw = sum(int1_marks.values())
    
    # Fetch INT2 marks
    if int2_exam:
        int2_marks = get_student_question_marks(db, usn, int2_exam.id)
        if int2_marks:
            int2_raw = sum(int2_marks.values())
    
    # Compute best internal (Phase-2A)
    best_result = compute_best_internal(
        int1_marks=int1_raw,
        int2_marks=int2_raw,
        int1_exists=int1_exam is not None,
        int2_exists=int2_exam is not None
    )
    all_warnings.extend([_warning_to_dto(w) for w in best_result.warnings])
    is_complete = is_complete and best_result.is_complete
    
    # Fetch component marks
    assignments = get_assignment_marks(db, usn, offering_id)
    attendance = get_attendance_mark(db, usn, offering_id)
    activity = get_activity_mark(db, usn, offering_id)
    
    # Compute internal total (Phase-2A)
    total_result = compute_internal_total(
        best_exam_scaled=best_result.best_scaled,
        assignment_1=assignments.get(1),
        assignment_2=assignments.get(2),
        attendance=attendance,
        activity=activity
    )
    all_warnings.extend([_warning_to_dto(w) for w in total_result.warnings])
    is_complete = is_complete and total_result.is_complete
    
    return InternalMarksDTO(
        best_exam_scaled=best_result.best_scaled,
        int1_raw=int1_raw,
        int2_raw=int2_raw,
        assignment_1=assignments.get(1, Decimal("0")),
        assignment_2=assignments.get(2, Decimal("0")),
        attendance=attendance or Decimal("0"),
        activity=activity or Decimal("0"),
        total=total_result.total
    ), all_warnings, is_complete


def compute_student_external_marks(
    db: Session,
    usn: str,
    offering_id: UUID
) -> Tuple[ExternalMarksDTO, List[WarningDTO], bool]:
    """
    Compute external marks for a student.
    
    Orchestrates:
    - get_exam_by_type (EXT)
    - get_exam_sections
    - get_student_question_marks
    - get_section_marks_with_selection
    
    Returns (ExternalMarksDTO, warnings, is_complete)
    """
    all_warnings = []
    is_complete = True
    section_dtos = []
    total_marks = Decimal("0")
    
    # Get external exam
    ext_exam = get_exam_by_type(db, offering_id, "EXT")
    if not ext_exam:
        all_warnings.append(WarningDTO(
            code=WarningCode.EXAM_NOT_FOUND.value,
            message="External exam not found",
            affected=[str(offering_id)]
        ))
        return ExternalMarksDTO(total=Decimal("0"), sections=[]), all_warnings, False
    
    # Get sections
    sections = get_exam_sections(db, ext_exam.id)
    
    # Get all sub-questions
    sub_questions = get_exam_sub_questions(db, ext_exam.id)
    
    # Get student marks
    student_marks = get_student_question_marks(db, usn, ext_exam.id)
    
    # Group sub-questions by section
    sq_by_section: Dict[UUID, List] = {}
    for sq in sub_questions:
        if sq.section_id not in sq_by_section:
            sq_by_section[sq.section_id] = []
        sq_by_section[sq.section_id].append(sq)
    
    # Compute per section (Phase-2A)
    for section in sections:
        section_sqs = sq_by_section.get(section.id, [])
        
        # Get marks and max_marks lists
        marks_list = [student_marks.get(sq.id) for sq in section_sqs]
        max_list = [sq.max_marks for sq in section_sqs]
        
        section_result = get_section_marks_with_selection(
            question_marks=marks_list,
            question_max_marks=max_list,
            selection_mode=section.selection_mode,
            required_questions=section.required_questions
        )
        
        section_dtos.append(SectionMarksDTO(
            section_id=section.id,
            section_marks=section_result.section_marks,
            section_max=section_result.section_max,
            selection_mode=section.selection_mode,
            questions_attempted=section_result.questions_attempted
        ))
        total_marks += section_result.section_marks
    
    return ExternalMarksDTO(
        total=total_marks,
        sections=section_dtos
    ), all_warnings, is_complete


def compute_student_grade(
    internal: Decimal,
    external: Decimal,
    total: Decimal,
    regulation_year: int,
    db: Session
) -> Tuple[GradeDTO, List[WarningDTO], bool]:
    """
    Compute grade for a student.
    
    Orchestrates:
    - get_grading_rules
    - get_pass_criteria
    - compute_grade
    
    Returns (GradeDTO, warnings, is_complete)
    """
    all_warnings = []
    
    # Get grading config
    rules_data = get_grading_rules(db, regulation_year)
    criteria_data = get_pass_criteria(db, regulation_year)
    
    if not rules_data:
        # Use defaults
        all_warnings.append(WarningDTO(
            code="USING_DEFAULT_GRADING",
            message=f"No grading rules for regulation {regulation_year}, using defaults",
            affected=[]
        ))
    
    # Convert to computation types
    rules = [
        GradingRule(
            min_marks=r["min_marks"],
            max_marks=r["max_marks"],
            grade=r["grade"],
            grade_point=r["grade_point"]
        )
        for r in (rules_data or [])
    ]
    
    criteria = PassCriteria(
        min_internal=criteria_data.get("min_internal", Decimal("16")) if criteria_data else Decimal("16"),
        min_external=criteria_data.get("min_external", Decimal("24")) if criteria_data else Decimal("24")
    )
    
    # Compute grade (Phase-2A)
    grade_result = compute_grade_fn(
        total=total,
        internal=internal,
        external=external,
        grading_rules=rules,
        pass_criteria=criteria
    )
    all_warnings.extend([_warning_to_dto(w) for w in grade_result.warnings])
    
    return GradeDTO(
        grade=grade_result.grade,
        grade_point=grade_result.grade_point,
        passed=grade_result.passed
    ), all_warnings, grade_result.is_complete


def get_student_marks_for_offering(
    db: Session,
    usn: str,
    offering_id: UUID,
    regulation_year: int = 2021
) -> AnalyticsResponse:
    """
    Get complete student marks for an offering.
    
    EXECUTION GUARD #3: One endpoint = one academic intent
    Intent: "What are this student's marks for this subject?"
    
    Orchestrates all marks computation functions.
    """
    all_warnings = []
    is_complete = True
    
    # Compute internal
    internal, int_warnings, int_complete = compute_student_internal_marks(
        db, usn, offering_id
    )
    all_warnings.extend(int_warnings)
    is_complete = is_complete and int_complete
    
    # Compute external
    external, ext_warnings, ext_complete = compute_student_external_marks(
        db, usn, offering_id
    )
    all_warnings.extend(ext_warnings)
    is_complete = is_complete and ext_complete
    
    # Compute total
    total_result = compute_total_marks(internal.total, external.total)
    
    # Compute grade
    grade, grade_warnings, grade_complete = compute_student_grade(
        internal=internal.total,
        external=external.total,
        total=total_result.total,
        regulation_year=regulation_year,
        db=db
    )
    all_warnings.extend(grade_warnings)
    is_complete = is_complete and grade_complete
    
    # Get attempt info
    attempts = get_student_attempts(db, usn, offering_id)
    attempt_count = len(attempts) if attempts else 1
    is_backlog = attempt_count > 1
    
    response_data = StudentMarksResponse(
        usn=usn,
        offering_id=offering_id,
        internal=internal,
        external=external,
        total=TotalMarksDTO(
            internal=internal.total,
            external=external.total,
            total=total_result.total,
            percentage=total_result.percentage
        ),
        grade=grade,
        is_backlog=is_backlog,
        attempt_count=attempt_count
    )
    
    return AnalyticsResponse(
        data=response_data,
        warnings=all_warnings,
        is_complete=is_complete,
        computed_at=datetime.utcnow()
    )


def get_offering_marks_paginated(
    db: Session,
    offering_id: UUID,
    page: int = 0,
    page_size: int = 50,
    regulation_year: int = 2021
) -> AnalyticsResponse:
    """
    Get marks for all students in an offering (paginated).
    
    EXECUTION GUARD #5: Deterministic USN-alphabetical ordering.
    """
    all_warnings = []
    is_complete = True
    
    # Paginate USNs
    usns, total_count = paginate_usns(db, offering_id, page, page_size)
    
    results = []
    for usn in usns:
        student_response = get_student_marks_for_offering(
            db, usn, offering_id, regulation_year
        )
        results.append(student_response.data)
        all_warnings.extend(student_response.warnings)
        is_complete = is_complete and student_response.is_complete
    
    total_pages = (total_count + page_size - 1) // page_size
    
    return AnalyticsResponse(
        data=results,
        warnings=all_warnings,
        is_complete=is_complete,
        computed_at=datetime.utcnow(),
        pagination=PaginationDTO(
            page=page,
            page_size=page_size,
            total_items=total_count,
            total_pages=total_pages,
            has_next=page < total_pages - 1,
            has_prev=page > 0
        )
    )


def compute_exam_marks(
    db: Session,
    exam_id: UUID,
    usn: str
) -> Tuple[Decimal, List[WarningDTO]]:
    """
    Compute total marks for a specific exam for a student.
    Handles Section Selection Mode (Best N).
    """
    all_warnings = []
    total_marks = Decimal("0")
    
    # Get sections
    sections = get_exam_sections(db, exam_id)
    if not sections:
        return Decimal("0"), []
    
    # Get all sub-questions
    sub_questions = get_exam_sub_questions(db, exam_id)
    
    # Get student marks
    student_marks = get_student_question_marks(db, usn, exam_id)
    
    # Group sub-questions by section
    sq_by_section: Dict[UUID, List] = {}
    for sq in sub_questions:
        if sq.section_id not in sq_by_section:
            sq_by_section[sq.section_id] = []
        sq_by_section[sq.section_id].append(sq)
    
    # Compute per section
    for section in sections:
        section_sqs = sq_by_section.get(section.id, [])
        
        # Get marks and max_marks lists
        marks_list = [student_marks.get(sq.id) for sq in section_sqs]
        max_list = [sq.max_marks for sq in section_sqs]
        
        section_result = get_section_marks_with_selection(
            question_marks=marks_list,
            question_max_marks=max_list,
            selection_mode=section.selection_mode,
            required_questions=section.required_questions
        )
        
        total_marks += section_result.section_marks
            
    return total_marks, all_warnings
