"""
EduMetrics Analytics Layer - Result & Backlog Orchestration Service

Orchestrates Phase-2A computation functions for result and backlog APIs.
"""
from typing import List, Dict, Optional
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from sqlalchemy.orm import Session

from app.services.analytics.query_helpers import (
    get_student_attempts,
    get_student_backlogs,
)
from app.services.analytics.schemas import (
    WarningDTO,
    PaginationDTO,
    AnalyticsResponse,
    ResultResponse,
    BacklogSubjectDTO,
    BacklogSummaryResponse,
)
from app.services.analytics.marks_service import (
    get_student_marks_for_offering,
    get_offering_marks_paginated,
    _warning_to_dto,
)
from app.services.computation import (
    get_result_marks,
    AttemptData,
    WarningCode,
)


async def get_student_result(
    db: Session,
    usn: str,
    offering_id: UUID,
    subject_code: str = "",
    subject_name: str = "",
    regulation_year: int = 2021
) -> AnalyticsResponse:
    """
    Get student result with grade for an offering.
    
    ACADEMIC INTENT: What is this student's result for this subject?
    
    Orchestrates:
    - get_student_marks_for_offering
    - get_result_marks (for backlog handling)
    """
    all_warnings = []
    
    # Get full marks
    marks_response = await get_student_marks_for_offering(
        db=db,
        usn=usn,
        offering_id=offering_id,
        regulation_year=regulation_year
    )
    all_warnings.extend(marks_response.warnings)
    
    marks_data = marks_response.data
    
    # Get attempt details
    attempts_data = await get_student_attempts(db, usn, offering_id)
    
    if len(attempts_data) > 1:
        # Multiple attempts - use backlog logic
        attempts = [
            AttemptData(
                attempt_number=a["attempt_number"],
                internal=a["internal"] or Decimal("0"),
                external=a["external"] or Decimal("0"),
                is_backlog=a["is_backlog"]
            )
            for a in attempts_data
        ]
        
        result_marks = get_result_marks(attempts)
        all_warnings.extend([_warning_to_dto(w) for w in result_marks.warnings])
        
        # Use result marks
        internal = result_marks.internal
        external = result_marks.external
        total = result_marks.total
        is_backlog = True
        attempt_count = result_marks.attempt_count
    else:
        internal = marks_data.total.internal
        external = marks_data.total.external
        total = marks_data.total.total
        is_backlog = False
        attempt_count = 1
    
    response_data = ResultResponse(
        usn=usn,
        offering_id=offering_id,
        subject_code=subject_code,
        subject_name=subject_name,
        internal=internal,
        external=external,
        total=total,
        grade=marks_data.grade.grade,
        grade_point=marks_data.grade.grade_point,
        passed=marks_data.grade.passed,
        is_backlog=is_backlog,
        attempt_count=attempt_count
    )
    
    return AnalyticsResponse(
        data=response_data,
        warnings=all_warnings,
        is_complete=marks_response.is_complete,
        computed_at=datetime.utcnow()
    )


async def get_offering_results(
    db: Session,
    offering_id: UUID,
    page: int = 0,
    page_size: int = 50,
    regulation_year: int = 2021
) -> AnalyticsResponse:
    """
    Get results for all students in an offering.
    
    ACADEMIC INTENT: What are all students' results for this subject?
    """
    # Delegate to existing paginated marks with result transformation
    return await get_offering_marks_paginated(
        db=db,
        offering_id=offering_id,
        page=page,
        page_size=page_size,
        regulation_year=regulation_year
    )


async def get_student_backlog_summary(
    db: Session,
    usn: str
) -> AnalyticsResponse:
    """
    Get backlog summary for a student.
    
    ACADEMIC INTENT: What backlogs does this student have?
    
    Orchestrates:
    - get_student_backlogs
    - get_result_marks (per backlog subject)
    """
    all_warnings = []
    
    # Get all backlog entries
    backlog_entries = await get_student_backlogs(db, usn)
    
    if not backlog_entries:
        return AnalyticsResponse(
            data=BacklogSummaryResponse(
                usn=usn,
                total_backlogs=0,
                cleared_backlogs=0,
                pending_backlogs=0,
                subjects=[]
            ),
            warnings=[],
            is_complete=True,
            computed_at=datetime.utcnow()
        )
    
    # Group by offering
    by_offering: Dict[UUID, List] = {}
    for entry in backlog_entries:
        oid = entry["offering_id"]
        if oid not in by_offering:
            by_offering[oid] = []
        by_offering[oid].append(entry)
    
    subjects = []
    cleared = 0
    pending = 0
    
    for offering_id, entries in by_offering.items():
        # Get all attempts for this offering
        attempts_data = await get_student_attempts(db, usn, offering_id)
        
        if not attempts_data:
            continue
        
        attempts = [
            AttemptData(
                attempt_number=a["attempt_number"],
                internal=a["internal"] or Decimal("0"),
                external=a["external"] or Decimal("0"),
                is_backlog=a["is_backlog"]
            )
            for a in attempts_data
        ]
        
        result = get_result_marks(attempts)
        all_warnings.extend([_warning_to_dto(w) for w in result.warnings])
        
        # Determine if passed (simplified - would need proper grade check)
        passed = result.total >= Decimal("40")
        
        if passed:
            cleared += 1
        else:
            pending += 1
        
        subjects.append(BacklogSubjectDTO(
            offering_id=offering_id,
            subject_code=entries[0]["subject_code"],
            subject_name=entries[0].get("subject_name", entries[0]["subject_code"]),
            attempt_count=result.attempt_count,
            latest_internal=result.internal,
            best_external=result.external,
            latest_total=result.total,
            passed=passed
        ))
    
    response_data = BacklogSummaryResponse(
        usn=usn,
        total_backlogs=len(subjects),
        cleared_backlogs=cleared,
        pending_backlogs=pending,
        subjects=subjects
    )
    
    return AnalyticsResponse(
        data=response_data,
        warnings=all_warnings,
        is_complete=True,
        computed_at=datetime.utcnow()
    )
