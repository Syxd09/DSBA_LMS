"""
EduMetrics Computation Layer - Detention and Absence Logic

LOCKED RULES IMPLEMENTED:
- DETAINED-001: Detained student identification
- DETAINED-002: Absent student identification
- DETAINED-003: Absence vs zero differentiation
- DETAINED-004: Exclusion rules per context

PURE FUNCTIONS: All functions are read-only and stateless.
"""
from typing import List, Optional
from uuid import UUID

from app.services.computation.warnings import ComputationWarning, WarningCode


def is_detained(student_status: Optional[str]) -> bool:
    """
    Check if a student is detained.
    
    LOCKED RULE: DETAINED-001
    A student is DETAINED if students.status = 'DETAINED'
    
    Args:
        student_status: The status field from students table
        
    Returns:
        True if student is detained, False otherwise
    """
    return student_status == "DETAINED"


def is_absent_for_exam(
    usn: str,
    exam_sub_question_ids: List[UUID],
    student_question_marks: dict  # {(usn, sub_question_id): marks}
) -> bool:
    """
    Check if a student is absent for an exam.
    
    LOCKED RULE: DETAINED-002
    A student is ABSENT for an exam if:
    - NO records exist in student_question_marks for ANY sub_question of that exam
    
    LOCKED RULE: DETAINED-003
    - NULL (no row) means absent
    - 0 (row with marks=0) means attempted and scored zero
    
    Args:
        usn: Student USN
        exam_sub_question_ids: List of sub_question IDs for the exam
        student_question_marks: Dict mapping (usn, sub_question_id) to marks
        
    Returns:
        True if student has no marks for any sub_question (absent)
        False if student has at least one mark entry (appeared)
    """
    for sq_id in exam_sub_question_ids:
        key = (usn, sq_id)
        if key in student_question_marks:
            # Has at least one mark entry = appeared
            return False
    
    # No mark entries at all = absent
    return True


def get_valid_students_for_attainment(
    enrolled_usns: List[str],
    student_statuses: dict,  # {usn: status}
    student_question_marks: dict,  # {(usn, sub_question_id): marks}
    co_sub_question_ids: List[UUID]
) -> tuple:
    """
    Get students valid for CO attainment calculation.
    
    LOCKED RULE: DETAINED-004
    Excludes:
    - Detained students (status = 'DETAINED')
    - Absent students (no marks for CO-mapped questions)
    
    LOCKED RULE: CO-DENOM-001 (supports this)
    Denominator = students with >= 1 mark entry for CO-mapped questions
    
    Args:
        enrolled_usns: List of enrolled student USNs
        student_statuses: Dict mapping USN to status
        student_question_marks: Dict mapping (usn, sub_question_id) to marks
        co_sub_question_ids: List of sub_question IDs mapped to the CO
        
    Returns:
        Tuple of (valid_usns: List[str], exclusions: List[ComputationWarning])
    """
    valid = []
    exclusions = []
    
    for usn in enrolled_usns:
        status = student_statuses.get(usn)
        
        # Check detained
        if is_detained(status):
            exclusions.append(ComputationWarning(
                code=WarningCode.STUDENT_DETAINED,
                message=f"Student {usn} excluded: detained status",
                affected_entities=[usn]
            ))
            continue
        
        # Check absent (no marks for any CO-mapped question)
        if is_absent_for_exam(usn, co_sub_question_ids, student_question_marks):
            exclusions.append(ComputationWarning(
                code=WarningCode.STUDENT_ABSENT,
                message=f"Student {usn} excluded: no marks for CO-mapped questions",
                affected_entities=[usn]
            ))
            continue
        
        valid.append(usn)
    
    return valid, exclusions


def get_exclusion_status(
    usn: str,
    student_status: Optional[str],
    exam_sub_question_ids: List[UUID],
    student_question_marks: dict,
    context: str  # "CO_ATTAINMENT", "SGPA", "CGPA", etc.
) -> tuple:
    """
    Determine if a student should be excluded from a specific context.
    
    LOCKED RULE: DETAINED-004
    | Context           | Detained | Absent |
    |-------------------|----------|--------|
    | CO Attainment     | EXCLUDE  | EXCLUDE|
    | PO Attainment     | EXCLUDE  | EXCLUDE|
    | SGPA              | EXCLUDE  | INCLUDE as 0 |
    | CGPA              | EXCLUDE  | INCLUDE |
    | Individual Report | INCLUDE  | INCLUDE |
    | Batch Statistics  | EXCLUDE  | EXCLUDE |
    
    Args:
        usn: Student USN
        student_status: Status from students table
        exam_sub_question_ids: Sub-question IDs for the exam
        student_question_marks: Dict of marks
        context: The computation context
        
    Returns:
        Tuple of (should_exclude: bool, reason: Optional[str])
    """
    is_det = is_detained(student_status)
    is_abs = is_absent_for_exam(usn, exam_sub_question_ids, student_question_marks)
    
    # Context-specific rules
    if context in ("CO_ATTAINMENT", "PO_ATTAINMENT", "BATCH_STATISTICS"):
        if is_det:
            return True, "detained"
        if is_abs:
            return True, "absent"
        return False, None
    
    if context in ("SGPA", "CGPA"):
        if is_det:
            return True, "detained"
        # Absent students are INCLUDED in SGPA/CGPA (as 0)
        return False, None
    
    if context == "INDIVIDUAL_REPORT":
        # Never exclude for individual reports
        return False, None
    
    # Default: exclude detained, exclude absent
    if is_det:
        return True, "detained"
    if is_abs:
        return True, "absent"
    return False, None
