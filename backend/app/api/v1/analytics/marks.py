"""
EduMetrics Analytics API - Student Marks Endpoints

READ-ONLY endpoints for student marks analytics.

RBAC: STUDENT_MARKS_READ permission required
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import PermissionChecker, Permission
from app.services.analytics.schemas import AnalyticsResponse
from app.services.analytics.marks_service import (
    get_student_marks_for_offering,
    get_offering_marks_paginated,
)


router = APIRouter(prefix="/analytics/marks", tags=["Analytics - Marks"])


@router.get(
    "/student/{usn}/offering/{offering_id}",
    response_model=AnalyticsResponse,
    summary="Get student marks for offering",
    description="Get complete marks breakdown for a student. RBAC: STUDENT_MARKS_READ.",
    dependencies=[Depends(PermissionChecker(Permission.STUDENT_MARKS_READ))]
)
async def get_student_marks(
    usn: str,
    offering_id: UUID,
    regulation_year: int = Query(default=2021, description="Regulation year for grading"),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """
    Get student marks for an offering.
    
    Orchestrates Phase-2A computation functions:
    - compute_best_internal
    - compute_internal_total
    - get_section_marks_with_selection
    - compute_total_marks
    - compute_grade
    """
    try:
        return await get_student_marks_for_offering(
            db=db,
            usn=usn,
            offering_id=offering_id,
            regulation_year=regulation_year
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get(
    "/offering/{offering_id}",
    response_model=AnalyticsResponse,
    summary="Get all student marks for offering",
    description="Get marks for all students (paginated). RBAC: STUDENT_MARKS_READ.",
    dependencies=[Depends(PermissionChecker(Permission.STUDENT_MARKS_READ))]
)
async def get_offering_marks(
    offering_id: UUID,
    page: int = Query(default=0, ge=0, description="Page number (0-indexed)"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page"),
    regulation_year: int = Query(default=2021, description="Regulation year"),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """
    Get paginated marks for all students in an offering.
    
    EXECUTION GUARD #5: USN-alphabetical ordering for determinism.
    """
    try:
        return await get_offering_marks_paginated(
            db=db,
            offering_id=offering_id,
            page=page,
            page_size=page_size,
            regulation_year=regulation_year
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get(
    "/internal/{offering_id}",
    response_model=AnalyticsResponse,
    summary="Get internal marks breakdown for offering",
    description="Internal marks breakdown (INT1, INT2, assignments). RBAC: STUDENT_MARKS_READ.",
    dependencies=[Depends(PermissionChecker(Permission.STUDENT_MARKS_READ))]
)
async def get_internal_marks(
    offering_id: UUID,
    page: int = Query(default=0, ge=0),
    page_size: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get internal marks for all students in offering."""
    from app.services.analytics.marks_service import (
        compute_student_internal_marks,
        paginate_usns
    )
    from app.services.analytics.schemas import PaginationDTO
    from datetime import datetime
    
    try:
        usns, total = await paginate_usns(db, offering_id, page, page_size)
        
        results = []
        all_warnings = []
        is_complete = True
        
        for usn in usns:
            internal, warnings, complete = await compute_student_internal_marks(
                db, usn, offering_id
            )
            results.append({"usn": usn, "internal": internal})
            all_warnings.extend(warnings)
            is_complete = is_complete and complete
        
        total_pages = (total + page_size - 1) // page_size
        
        return AnalyticsResponse(
            data=results,
            warnings=all_warnings,
            is_complete=is_complete,
            computed_at=datetime.utcnow(),
            pagination=PaginationDTO(
                page=page,
                page_size=page_size,
                total_items=total,
                total_pages=total_pages,
                has_next=page < total_pages - 1,
                has_prev=page > 0
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get(
    "/external/{offering_id}",
    response_model=AnalyticsResponse,
    summary="Get external marks breakdown for offering",
    description="External marks breakdown (per section). RBAC: STUDENT_MARKS_READ.",
    dependencies=[Depends(PermissionChecker(Permission.STUDENT_MARKS_READ))]
)
async def get_external_marks(
    offering_id: UUID,
    page: int = Query(default=0, ge=0),
    page_size: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get external marks for all students in offering."""
    from app.services.analytics.marks_service import (
        compute_student_external_marks,
        paginate_usns
    )
    from app.services.analytics.schemas import PaginationDTO
    from datetime import datetime
    
    try:
        usns, total = await paginate_usns(db, offering_id, page, page_size)
        
        results = []
        all_warnings = []
        is_complete = True
        
        for usn in usns:
            external, warnings, complete = await compute_student_external_marks(
                db, usn, offering_id
            )
            results.append({"usn": usn, "external": external})
            all_warnings.extend(warnings)
            is_complete = is_complete and complete
        
        total_pages = (total + page_size - 1) // page_size
        
        return AnalyticsResponse(
            data=results,
            warnings=all_warnings,
            is_complete=is_complete,
            computed_at=datetime.utcnow(),
            pagination=PaginationDTO(
                page=page,
                page_size=page_size,
                total_items=total,
                total_pages=total_pages,
                has_next=page < total_pages - 1,
                has_prev=page > 0
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
