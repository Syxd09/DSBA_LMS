"""
EduMetrics Analytics Layer - SGPA/CGPA Orchestration Service

Orchestrates Phase-2A computation functions for SGPA/CGPA APIs.

EXECUTION GUARD #1: API layer remains thin.
"""
from typing import List, Dict, Optional, Tuple
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from sqlalchemy.orm import Session

from app.services.analytics.query_helpers import (
    get_student_statuses,
    get_student_attempts,
    get_grading_rules,
    get_pass_criteria,
)
from app.services.analytics.schemas import (
    WarningDTO,
    PaginationDTO,
    AnalyticsResponse,
    SubjectResultDTO,
    SGPAResponse,
    SemesterSGPADTO,
    CGPAResponse,
)
from app.services.analytics.marks_service import (
    get_student_marks_for_offering,
    _warning_to_dto,
)
from app.services.computation import (
    compute_sgpa,
    compute_cgpa,
    SubjectResult,
    SemesterSGPA,
    WarningCode,
)


async def get_student_sgpa(
    db: Session,
    usn: str,
    semester_id: UUID,
    offerings: List[Dict]  # [{offering_id, subject_code, subject_name, credits}]
) -> AnalyticsResponse:
    """
    Compute SGPA for a student in a semester.
    
    ACADEMIC INTENT: What is this student's SGPA for this semester?
    
    Orchestrates:
    - get_student_marks_for_offering (per subject)
    - compute_sgpa
    """
    all_warnings = []
    is_complete = True
    subject_results = []
    
    for offering in offerings:
        # Get marks for each subject
        marks_response = await get_student_marks_for_offering(
            db=db,
            usn=usn,
            offering_id=offering["offering_id"]
        )
        all_warnings.extend(marks_response.warnings)
        is_complete = is_complete and marks_response.is_complete
        
        grade_data = marks_response.data.grade
        
        subject_results.append(SubjectResult(
            subject_code=offering["subject_code"],
            credits=offering["credits"],
            grade=grade_data.grade,
            grade_point=grade_data.grade_point,
            passed=grade_data.passed
        ))
    
    # Compute SGPA (Phase-2A)
    sgpa_result = compute_sgpa(subject_results)
    all_warnings.extend([_warning_to_dto(w) for w in sgpa_result.warnings])
    is_complete = is_complete and sgpa_result.is_complete
    
    # Build response DTOs
    subject_dtos = [
        SubjectResultDTO(
            subject_code=sr.subject_code,
            subject_name=next((o["subject_name"] for o in offerings if o["subject_code"] == sr.subject_code), sr.subject_code),
            credits=sr.credits,
            grade=sr.grade,
            grade_point=sr.grade_point,
            passed=sr.passed
        )
        for sr in subject_results
    ]
    
    response_data = SGPAResponse(
        usn=usn,
        semester_id=semester_id,
        semester_number=1,  # Will be filled from semester data
        sgpa=sgpa_result.sgpa,
        total_credits=sgpa_result.total_credits,
        subjects=subject_dtos,
        subjects_passed=sgpa_result.subjects_passed,
        subjects_failed=sgpa_result.subjects_failed
    )
    
    return AnalyticsResponse(
        data=response_data,
        warnings=all_warnings,
        is_complete=is_complete,
        computed_at=datetime.utcnow()
    )


async def get_student_cgpa(
    db: Session,
    usn: str,
    semesters: List[Dict]  # [{semester_id, semester_number, offerings: [...]}]
) -> AnalyticsResponse:
    """
    Compute CGPA for a student across all semesters.
    
    ACADEMIC INTENT: What is this student's CGPA?
    
    Orchestrates:
    - get_student_sgpa (per semester)
    - compute_cgpa
    """
    all_warnings = []
    is_complete = True
    semester_sgpas = []
    has_backlogs = False
    
    for semester in semesters:
        # Get SGPA for each semester
        sgpa_response = await get_student_sgpa(
            db=db,
            usn=usn,
            semester_id=semester["semester_id"],
            offerings=semester["offerings"]
        )
        all_warnings.extend(sgpa_response.warnings)
        is_complete = is_complete and sgpa_response.is_complete
        
        sgpa_data = sgpa_response.data
        
        if sgpa_data.subjects_failed > 0:
            has_backlogs = True
        
        semester_sgpas.append(SemesterSGPA(
            semester=semester["semester_number"],
            sgpa=sgpa_data.sgpa,
            credits=sgpa_data.total_credits,
            subjects_passed=sgpa_data.subjects_passed,
            subjects_failed=sgpa_data.subjects_failed
        ))
    
    # Compute CGPA (Phase-2A)
    cgpa_result = compute_cgpa(semester_sgpas)
    all_warnings.extend([_warning_to_dto(w) for w in cgpa_result.warnings])
    is_complete = is_complete and cgpa_result.is_complete
    
    # Build response DTOs
    semester_dtos = [
        SemesterSGPADTO(
            semester_number=ss.semester,
            sgpa=ss.sgpa,
            credits=ss.credits,
            subjects_passed=ss.subjects_passed,
            subjects_failed=ss.subjects_failed
        )
        for ss in semester_sgpas
    ]
    
    response_data = CGPAResponse(
        usn=usn,
        cgpa=cgpa_result.cgpa,
        total_credits=cgpa_result.total_credits,
        semesters=semester_dtos,
        semesters_completed=len(semester_sgpas),
        has_backlogs=has_backlogs
    )
    
    return AnalyticsResponse(
        data=response_data,
        warnings=all_warnings,
        is_complete=is_complete,
        computed_at=datetime.utcnow()
    )
