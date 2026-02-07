"""
EduMetrics Analytics API - CO Attainment Endpoints

READ-ONLY endpoints for CO attainment analytics.

EXECUTION GUARDS:
#1: API layer remains thin
#3: One endpoint = one academic intent
#4: Warnings are first-class data

RBAC: CO_ATTAINMENT_READ permission required
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import PermissionChecker, Permission, require_authenticated
from app.services.analytics.schemas import AnalyticsResponse
from app.services.analytics.co_service import (
    compute_offering_co_attainments,
    get_co_student_evidence,
)


router = APIRouter(prefix="/analytics/co", tags=["Analytics - CO Attainment"])


@router.get(
    "/offering/{offering_id}",
    response_model=AnalyticsResponse,
    summary="Get all CO attainments for offering",
    description="""
    Get CO attainment for all Course Outcomes in a subject offering.
    
    Returns:
    - Per-CO internal and external attainment
    - Final weighted attainment (40% internal + 60% external)
    - Attainment level (0-3)
    - Summary statistics
    
    ACADEMIC INTENT: What is the CO attainment for this subject?
    
    RBAC: Requires CO_ATTAINMENT_READ permission.
    """,
    dependencies=[Depends(PermissionChecker(Permission.CO_ATTAINMENT_READ))]
)
async def get_offering_co_attainment(
    offering_id: UUID,
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """
    Get CO attainment for all COs in an offering.
    
    Orchestrates Phase-2A functions:
    - get_valid_students_for_attainment
    - compute_co_max_marks
    - compute_co_attainment
    - compute_co_attainment_final
    """
    try:
        return await compute_offering_co_attainments(db=db, offering_id=offering_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get(
    "/{co_id}/offering/{offering_id}",
    response_model=AnalyticsResponse,
    summary="Get single CO attainment detail",
    description="""
    Get detailed attainment for a specific CO.
    
    ACADEMIC INTENT: What is the attainment for this specific CO?
    
    RBAC: Requires CO_ATTAINMENT_READ permission.
    """,
    dependencies=[Depends(PermissionChecker(Permission.CO_ATTAINMENT_READ))]
)
async def get_co_attainment_detail(
    co_id: UUID,
    offering_id: UUID,
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get detailed CO attainment."""
    try:
        full_response = await compute_offering_co_attainments(db=db, offering_id=offering_id)
        
        # Filter to specific CO
        if full_response.data and full_response.data.cos:
            co_data = next((c for c in full_response.data.cos if c.co_id == co_id), None)
            if co_data:
                full_response.data = co_data
            else:
                raise HTTPException(status_code=404, detail=f"CO {co_id} not found")
        
        return full_response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get(
    "/{co_id}/students",
    response_model=AnalyticsResponse,
    summary="Get student-level CO evidence",
    description="""
    Get student-level evidence for CO attainment (drill-down).
    
    Returns per-student:
    - Obtained marks
    - Max marks
    - Percentage
    - Whether threshold was met
    - Question-level breakdown
    
    Used for NBA audit evidence.
    
    ACADEMIC INTENT: Which students met/didn't meet this CO threshold?
    
    RBAC: Requires CO_ATTAINMENT_READ permission.
    """,
    dependencies=[Depends(PermissionChecker(Permission.CO_ATTAINMENT_READ))]
)
async def get_co_students(
    co_id: UUID,
    offering_id: UUID = Query(..., description="Subject offering ID"),
    page: int = Query(default=0, ge=0),
    page_size: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """
    Get student-level CO evidence.
    
    EXECUTION GUARD #5: USN-alphabetical ordering for determinism.
    """
    try:
        return await get_co_student_evidence(
            db=db,
            co_id=co_id,
            offering_id=offering_id,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
