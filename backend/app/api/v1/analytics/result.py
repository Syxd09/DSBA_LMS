"""
EduMetrics Analytics API - Result & Backlog Endpoints

READ-ONLY endpoints for student results and backlog analytics.

RBAC: RESULT_READ, BACKLOG_READ permissions required
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import PermissionChecker, Permission
from app.services.analytics.schemas import AnalyticsResponse
from app.services.analytics.result_service import (
    get_student_result,
    get_offering_results,
    get_student_backlog_summary,
)


router = APIRouter(prefix="/analytics/result", tags=["Analytics - Results"])


@router.get(
    "/student/{usn}/offering/{offering_id}",
    response_model=AnalyticsResponse,
    summary="Get student result for offering",
    description="Get final result for a student. RBAC: RESULT_READ.",
    dependencies=[Depends(PermissionChecker(Permission.RESULT_READ))]
)
async def get_result(
    usn: str,
    offering_id: UUID,
    subject_code: str = Query(default="", description="Subject code"),
    subject_name: str = Query(default="", description="Subject name"),
    regulation_year: int = Query(default=2021),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get student result."""
    try:
        return await get_student_result(
            db=db,
            usn=usn,
            offering_id=offering_id,
            subject_code=subject_code,
            subject_name=subject_name,
            regulation_year=regulation_year
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get(
    "/offering/{offering_id}",
    response_model=AnalyticsResponse,
    summary="Get all student results for offering",
    description="Get results for all students (paginated). RBAC: RESULT_READ.",
    dependencies=[Depends(PermissionChecker(Permission.RESULT_READ))]
)
async def get_offering_result(
    offering_id: UUID,
    page: int = Query(default=0, ge=0),
    page_size: int = Query(default=50, ge=1, le=100),
    regulation_year: int = Query(default=2021),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get all student results for offering."""
    try:
        return await get_offering_results(
            db=db,
            offering_id=offering_id,
            page=page,
            page_size=page_size,
            regulation_year=regulation_year
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get(
    "/backlog/student/{usn}",
    response_model=AnalyticsResponse,
    summary="Get student backlog summary",
    description="Get backlog summary for a student. RBAC: BACKLOG_READ.",
    dependencies=[Depends(PermissionChecker(Permission.BACKLOG_READ))]
)
async def get_backlogs(
    usn: str,
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get student backlog summary."""
    try:
        return await get_student_backlog_summary(db=db, usn=usn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

