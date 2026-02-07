"""
EduMetrics Analytics Layer - Query Helpers

READ-ONLY database access functions for analytics APIs.

EXECUTION GUARD #2: Query helpers fetch raw data only.
They MUST NOT:
- Aggregate marks
- Compute sums
- Filter "appeared" students
- Apply thresholds

If logic resembles math → it belongs to Phase-2A.
"""
from typing import List, Dict, Optional, Tuple
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

# Import models - use __init__.py exports or direct paths
try:
    from app.models import (
        Student, Exam, ExamSection, Question, SubQuestion,
        StudentQuestionMark, FinalMarks, Assignment, AssignmentMark,
        AttendanceMark, ActivityMark, CourseOutcome, ProgramOutcome, COPOMapping
    )
    from app.models.subject_offering import SubjectOffering
except ImportError:
    # Fallback for models that may not be in __init__.py
    Student = None
    SubjectOffering = None


# =============================================================================
# DTOs for Query Results
# =============================================================================

class StudentMarkDTO:
    """Raw student question marks."""
    def __init__(self, usn: str, sub_question_id: UUID, marks: Decimal):
        self.usn = usn
        self.sub_question_id = sub_question_id
        self.marks = marks


class SubQuestionDTO:
    """Sub-question details."""
    def __init__(
        self,
        id: UUID,
        question_id: UUID,
        section_id: UUID,
        max_marks: Decimal,
        co_id: Optional[UUID]
    ):
        self.id = id
        self.question_id = question_id
        self.section_id = section_id
        self.max_marks = max_marks
        self.co_id = co_id


class SectionConfigDTO:
    """Section configuration."""
    def __init__(
        self,
        id: UUID,
        selection_mode: str,
        required_questions: int
    ):
        self.id = id
        self.selection_mode = selection_mode
        self.required_questions = required_questions


class ExamDTO:
    """Exam details."""
    def __init__(
        self,
        id: UUID,
        exam_type: str,
        offering_id: UUID,
        exists: bool = True
    ):
        self.id = id
        self.exam_type = exam_type
        self.offering_id = offering_id
        self.exists = exists


class COPOMappingDTO:
    """CO-PO mapping."""
    def __init__(
        self,
        co_id: UUID,
        po_id: UUID,
        correlation_level: int,
        co_code: str = "",
        po_code: str = ""
    ):
        self.co_id = co_id
        self.po_id = po_id
        self.correlation_level = correlation_level
        self.co_code = co_code
        self.po_code = po_code


# =============================================================================
# Student Data Queries
# =============================================================================

async def get_offering_enrolled_students(
    db: Session,
    offering_id: UUID
) -> List[str]:
    """
    Fetch all enrolled student USNs for an offering.
    
    Returns raw list of USNs. No filtering applied.
    """
    # Get students via subject_offerings.enrollments or similar relation
    result = db.execute(
        select(Student.usn)
        .join(FinalMarks, FinalMarks.usn == Student.usn)
        .where(FinalMarks.offering_id == offering_id)
        .distinct()
        .order_by(Student.usn)  # Deterministic ordering
    )
    return [row[0] for row in result.fetchall()]


async def get_student_statuses(
    db: Session,
    usns: List[str]
) -> Dict[str, Optional[str]]:
    """
    Fetch student statuses (ACTIVE, DETAINED, WITHDRAWN).
    
    Returns dict: {usn: status}
    """
    result = db.execute(
        select(Student.usn, Student.status)
        .where(Student.usn.in_(usns))
    )
    return {row[0]: row[1] for row in result.fetchall()}


async def get_student_by_usn(
    db: Session,
    usn: str
) -> Optional[Student]:
    """Fetch single student by USN."""
    return db.query(Student).filter(Student.usn == usn).first()


# =============================================================================
# Exam & Section Queries
# =============================================================================

async def get_offering_exams(
    db: Session,
    offering_id: UUID
) -> List[ExamDTO]:
    """
    Fetch exams for an offering (INT1, INT2, EXT).
    
    Returns list of ExamDTO.
    """
    result = db.execute(
        select(Exam.id, Exam.exam_type, Exam.offering_id)
        .where(Exam.offering_id == offering_id)
    )
    return [
        ExamDTO(id=row[0], exam_type=row[1], offering_id=row[2])
        for row in result.fetchall()
    ]


async def get_exam_by_type(
    db: Session,
    offering_id: UUID,
    exam_type: str
) -> Optional[ExamDTO]:
    """Fetch specific exam by type."""
    result = db.execute(
        select(Exam.id, Exam.exam_type, Exam.offering_id)
        .where(and_(
            Exam.offering_id == offering_id,
            Exam.exam_type == exam_type
        ))
    )
    row = result.fetchone()
    if row:
        return ExamDTO(id=row[0], exam_type=row[1], offering_id=row[2])
    return None


async def get_exam_sections(
    db: Session,
    exam_id: UUID
) -> List[SectionConfigDTO]:
    """
    Fetch section configurations for an exam.
    
    Returns list of SectionConfigDTO.
    """
    result = db.execute(
        select(
            ExamSection.id,
            ExamSection.selection_mode,
            ExamSection.required_questions
        )
        .where(ExamSection.exam_id == exam_id)
        .order_by(ExamSection.section_order)
    )
    return [
        SectionConfigDTO(
            id=row[0],
            selection_mode=row[1],
            required_questions=row[2]
        )
        for row in result.fetchall()
    ]


# =============================================================================
# Question & Marks Queries
# =============================================================================

async def get_exam_sub_questions(
    db: Session,
    exam_id: UUID
) -> List[SubQuestionDTO]:
    """
    Fetch all sub-questions for an exam with their details.
    """
    result = db.execute(
        select(
            SubQuestion.id,
            SubQuestion.question_id,
            Question.section_id,
            SubQuestion.max_marks,
            SubQuestion.co_id
        )
        .join(Question, Question.id == SubQuestion.question_id)
        .join(ExamSection, ExamSection.id == Question.section_id)
        .where(ExamSection.exam_id == exam_id)
    )
    return [
        SubQuestionDTO(
            id=row[0],
            question_id=row[1],
            section_id=row[2],
            max_marks=row[3],
            co_id=row[4]
        )
        for row in result.fetchall()
    ]


async def get_co_sub_questions(
    db: Session,
    co_id: UUID,
    exam_id: UUID
) -> List[SubQuestionDTO]:
    """
    Fetch sub-questions mapped to a specific CO in an exam.
    """
    result = db.execute(
        select(
            SubQuestion.id,
            SubQuestion.question_id,
            Question.section_id,
            SubQuestion.max_marks,
            SubQuestion.co_id
        )
        .join(Question, Question.id == SubQuestion.question_id)
        .join(ExamSection, ExamSection.id == Question.section_id)
        .where(and_(
            ExamSection.exam_id == exam_id,
            SubQuestion.co_id == co_id
        ))
    )
    return [
        SubQuestionDTO(
            id=row[0],
            question_id=row[1],
            section_id=row[2],
            max_marks=row[3],
            co_id=row[4]
        )
        for row in result.fetchall()
    ]


async def get_student_question_marks(
    db: Session,
    usn: str,
    exam_id: UUID
) -> Dict[UUID, Decimal]:
    """
    Fetch student's marks for all sub-questions in an exam.
    
    Returns dict: {sub_question_id: marks}
    No aggregation, no filtering applied.
    """
    result = db.execute(
        select(StudentQuestionMark.sub_question_id, StudentQuestionMark.marks)
        .where(and_(
            StudentQuestionMark.usn == usn,
            StudentQuestionMark.exam_id == exam_id
        ))
    )
    return {row[0]: row[1] for row in result.fetchall()}


async def get_all_student_marks_for_exam(
    db: Session,
    exam_id: UUID
) -> Dict[Tuple[str, UUID], Decimal]:
    """
    Fetch all student marks for an exam.
    
    Returns dict: {(usn, sub_question_id): marks}
    Used for CO attainment calculations.
    """
    result = db.execute(
        select(
            StudentQuestionMark.usn,
            StudentQuestionMark.sub_question_id,
            StudentQuestionMark.marks
        )
        .where(StudentQuestionMark.exam_id == exam_id)
    )
    return {(row[0], row[1]): row[2] for row in result.fetchall()}


# =============================================================================
# Component Marks Queries (Assignment, Attendance, Activity)
# =============================================================================

async def get_assignment_marks(
    db: Session,
    usn: str,
    offering_id: UUID
) -> Dict[int, Decimal]:
    """
    Fetch student's assignment marks.
    
    Returns dict: {assignment_number: marks}
    """
    result = db.execute(
        select(Assignment.assignment_number, AssignmentMark.marks)
        .join(AssignmentMark, AssignmentMark.assignment_id == Assignment.id)
        .where(and_(
            Assignment.offering_id == offering_id,
            AssignmentMark.usn == usn
        ))
    )
    return {row[0]: row[1] for row in result.fetchall()}


async def get_attendance_mark(
    db: Session,
    usn: str,
    offering_id: UUID
) -> Optional[Decimal]:
    """Fetch student's attendance mark."""
    result = db.execute(
        select(AttendanceMark.marks)
        .where(and_(
            AttendanceMark.offering_id == offering_id,
            AttendanceMark.usn == usn
        ))
    )
    row = result.fetchone()
    return row[0] if row else None


async def get_activity_mark(
    db: Session,
    usn: str,
    offering_id: UUID
) -> Optional[Decimal]:
    """Fetch student's activity mark."""
    result = db.execute(
        select(ActivityMark.marks)
        .where(and_(
            ActivityMark.offering_id == offering_id,
            ActivityMark.usn == usn
        ))
    )
    row = result.fetchone()
    return row[0] if row else None


# =============================================================================
# CO / PO Queries
# =============================================================================

async def get_offering_cos(
    db: Session,
    offering_id: UUID
) -> List[Dict]:
    """
    Fetch all COs for an offering.
    
    Returns list of dicts with co_id, co_code, co_statement, threshold.
    """
    result = db.execute(
        select(
            CourseOutcome.id,
            CourseOutcome.co_code,
            CourseOutcome.description,
            CourseOutcome.threshold
        )
        .where(CourseOutcome.offering_id == offering_id)
        .order_by(CourseOutcome.co_code)
    )
    return [
        {
            "co_id": row[0],
            "co_code": row[1],
            "co_statement": row[2],
            "threshold": row[3] or Decimal("60")
        }
        for row in result.fetchall()
    ]


async def get_program_pos(
    db: Session,
    program_id: UUID
) -> List[Dict]:
    """
    Fetch all POs for a program.
    
    Returns list of dicts with po_id, po_code, po_statement.
    """
    result = db.execute(
        select(
            ProgramOutcome.id,
            ProgramOutcome.po_code,
            ProgramOutcome.po_statement
        )
        .where(ProgramOutcome.program_id == program_id)
        .order_by(ProgramOutcome.po_code)
    )
    return [
        {
            "po_id": row[0],
            "po_code": row[1],
            "po_statement": row[2]
        }
        for row in result.fetchall()
    ]


async def get_co_po_mappings(
    db: Session,
    po_id: UUID,
    academic_year: Optional[int] = None
) -> List[COPOMappingDTO]:
    """
    Fetch CO-PO mappings for a PO.
    
    Returns list of COPOMappingDTO.
    """
    query = (
        select(
            COPOMapping.co_id,
            COPOMapping.po_id,
            COPOMapping.correlation_level,
            CourseOutcome.co_code
        )
        .join(CourseOutcome, CourseOutcome.id == COPOMapping.co_id)
        .where(COPOMapping.po_id == po_id)
    )
    
    if academic_year:
        query = query.where(COPOMapping.academic_year == academic_year)
    
    result = db.execute(query)
    return [
        COPOMappingDTO(
            co_id=row[0],
            po_id=row[1],
            correlation_level=row[2],
            co_code=row[3]
        )
        for row in result.fetchall()
    ]


async def get_all_co_po_mappings_for_program(
    db: Session,
    program_id: UUID,
    academic_year: int
) -> Dict[UUID, List[COPOMappingDTO]]:
    """
    Fetch all CO-PO mappings for a program grouped by PO.
    
    Returns dict: {po_id: [COPOMappingDTO, ...]}
    """
    result = db.execute(
        select(
            COPOMapping.co_id,
            COPOMapping.po_id,
            COPOMapping.correlation_level,
            CourseOutcome.co_code,
            ProgramOutcome.po_code
        )
        .join(CourseOutcome, CourseOutcome.id == COPOMapping.co_id)
        .join(ProgramOutcome, ProgramOutcome.id == COPOMapping.po_id)
        .where(and_(
            ProgramOutcome.program_id == program_id,
            COPOMapping.academic_year == academic_year
        ))
    )
    
    mappings: Dict[UUID, List[COPOMappingDTO]] = {}
    for row in result.fetchall():
        po_id = row[1]
        if po_id not in mappings:
            mappings[po_id] = []
        mappings[po_id].append(COPOMappingDTO(
            co_id=row[0],
            po_id=row[1],
            correlation_level=row[2],
            co_code=row[3],
            po_code=row[4]
        ))
    
    return mappings


# =============================================================================
# Grading & Config Queries
# =============================================================================

async def get_grading_rules(
    db: Session,
    regulation_year: int
) -> List[Dict]:
    """
    Fetch grading rules for a regulation.
    
    Returns list of dicts with min_marks, max_marks, grade, grade_point.
    """
    from app.models.grading import GradingRule
    
    result = db.execute(
        select(
            GradingRule.min_marks,
            GradingRule.max_marks,
            GradingRule.grade,
            GradingRule.grade_point
        )
        .where(GradingRule.regulation_year == regulation_year)
        .order_by(GradingRule.min_marks.desc())
    )
    return [
        {
            "min_marks": row[0],
            "max_marks": row[1],
            "grade": row[2],
            "grade_point": row[3]
        }
        for row in result.fetchall()
    ]


async def get_pass_criteria(
    db: Session,
    regulation_year: int
) -> Optional[Dict]:
    """
    Fetch pass criteria for a regulation.
    
    Returns dict with min_internal, min_external, min_total.
    """
    from app.models.grading import PassCriteria
    
    result = db.execute(
        select(
            PassCriteria.min_internal,
            PassCriteria.min_external,
            PassCriteria.min_total
        )
        .where(PassCriteria.regulation_year == regulation_year)
    )
    row = result.fetchone()
    if row:
        return {
            "min_internal": row[0],
            "min_external": row[1],
            "min_total": row[2]
        }
    return None


async def get_attainment_config(
    db: Session,
    program_id: UUID,
    cohort_year: int
) -> Optional[Dict]:
    """
    Fetch attainment thresholds for program and cohort.
    
    LOCKED RULE: LEVEL-003 - Historical retention
    Returns config effective for cohort_year.
    """
    from app.models.config import AttainmentConfig
    
    result = db.execute(
        select(
            AttainmentConfig.level_3_threshold,
            AttainmentConfig.level_2_threshold,
            AttainmentConfig.level_1_threshold
        )
        .where(and_(
            AttainmentConfig.program_id == program_id,
            AttainmentConfig.effective_year <= cohort_year
        ))
        .order_by(AttainmentConfig.effective_year.desc())
        .limit(1)
    )
    row = result.fetchone()
    if row:
        return {
            "level_3_threshold": row[0],
            "level_2_threshold": row[1],
            "level_1_threshold": row[2]
        }
    return None


# =============================================================================
# Final Marks / Backlog Queries
# =============================================================================

async def get_student_attempts(
    db: Session,
    usn: str,
    offering_id: UUID
) -> List[Dict]:
    """
    Fetch all attempts for a student in an offering.
    
    Returns list of dicts with attempt_number, internal, external, is_backlog.
    """
    result = db.execute(
        select(
            FinalMarks.attempt_number,
            FinalMarks.internal_marks,
            FinalMarks.external_marks,
            FinalMarks.is_backlog
        )
        .where(and_(
            FinalMarks.usn == usn,
            FinalMarks.offering_id == offering_id
        ))
        .order_by(FinalMarks.attempt_number)
    )
    return [
        {
            "attempt_number": row[0],
            "internal": row[1],
            "external": row[2],
            "is_backlog": row[3]
        }
        for row in result.fetchall()
    ]


async def get_student_backlogs(
    db: Session,
    usn: str
) -> List[Dict]:
    """
    Fetch all backlog subjects for a student.
    
    Returns list of offering details where is_backlog = True.
    """
    result = db.execute(
        select(
            FinalMarks.offering_id,
            FinalMarks.attempt_number,
            FinalMarks.internal_marks,
            FinalMarks.external_marks,
            SubjectOffering.subject_code
        )
        .join(SubjectOffering, SubjectOffering.id == FinalMarks.offering_id)
        .where(and_(
            FinalMarks.usn == usn,
            FinalMarks.is_backlog == True
        ))
        .order_by(FinalMarks.offering_id, FinalMarks.attempt_number)
    )
    return [
        {
            "offering_id": row[0],
            "attempt_number": row[1],
            "internal": row[2],
            "external": row[3],
            "subject_code": row[4]
        }
        for row in result.fetchall()
    ]


# =============================================================================
# Pagination Helper
# =============================================================================

async def paginate_usns(
    db: Session,
    offering_id: UUID,
    page: int,
    page_size: int = 50
) -> Tuple[List[str], int]:
    """
    Paginate enrolled students by USN.
    
    EXECUTION GUARD: Deterministic USN-alphabetical ordering.
    
    Returns (usns, total_count)
    """
    # Get total count
    count_result = db.execute(
        select(func.count(Student.usn.distinct()))
        .join(FinalMarks, FinalMarks.usn == Student.usn)
        .where(FinalMarks.offering_id == offering_id)
    )
    total = count_result.scalar() or 0
    
    # Get paginated USNs
    result = db.execute(
        select(Student.usn)
        .join(FinalMarks, FinalMarks.usn == Student.usn)
        .where(FinalMarks.offering_id == offering_id)
        .distinct()
        .order_by(Student.usn)
        .offset(page * page_size)
        .limit(page_size)
    )
    usns = [row[0] for row in result.fetchall()]
    
    return usns, total
