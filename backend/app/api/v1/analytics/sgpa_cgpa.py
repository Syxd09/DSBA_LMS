"""
EduMetrics Analytics API - SGPA/CGPA Endpoints

READ-ONLY endpoints for SGPA and CGPA analytics.

RBAC: SGPA_READ, CGPA_READ permissions required
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import PermissionChecker, Permission
from app.services.analytics.schemas import AnalyticsResponse
from app.services.analytics.sgpa_service import (
    get_student_sgpa,
    get_student_cgpa,
)


router = APIRouter(prefix="/analytics", tags=["Analytics - SGPA/CGPA"])


class OfferingInput(BaseModel):
    """Subject offering for SGPA calculation."""
    offering_id: UUID
    subject_code: str
    subject_name: str
    credits: float


class SemesterInput(BaseModel):
    """Semester data for CGPA calculation."""
    semester_id: UUID
    semester_number: int
    offerings: List[OfferingInput]


class SGPARequest(BaseModel):
    """Request body for SGPA calculation."""
    offerings: List[OfferingInput]


class CGPARequest(BaseModel):
    """Request body for CGPA calculation."""
    semesters: List[SemesterInput]


@router.post(
    "/sgpa/student/{usn}/semester/{semester_id}",
    response_model=AnalyticsResponse,
    summary="Get student SGPA for semester",
    description="Get SGPA for a student. RBAC: SGPA_READ.",
    dependencies=[Depends(PermissionChecker(Permission.SGPA_READ))]
)
async def get_sgpa(
    usn: str,
    semester_id: UUID,
    request: SGPARequest,
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get student SGPA."""
    try:
        offerings_data = [
            {
                "offering_id": o.offering_id,
                "subject_code": o.subject_code,
                "subject_name": o.subject_name,
                "credits": o.credits
            }
            for o in request.offerings
        ]
        return await get_student_sgpa(
            db=db,
            usn=usn,
            semester_id=semester_id,
            offerings=offerings_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post(
    "/cgpa/student/{usn}",
    response_model=AnalyticsResponse,
    summary="Get student CGPA",
    description="Get cumulative CGPA for a student. RBAC: CGPA_READ.",
    dependencies=[Depends(PermissionChecker(Permission.CGPA_READ))]
)
async def get_cgpa(
    usn: str,
    request: CGPARequest,
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get student CGPA."""
    try:
        semesters_data = [
            {
                "semester_id": s.semester_id,
                "semester_number": s.semester_number,
                "offerings": [
                    {
                        "offering_id": o.offering_id,
                        "subject_code": o.subject_code,
                        "subject_name": o.subject_name,
                        "credits": o.credits
                    }
                    for o in s.offerings
                ]
            }
            for s in request.semesters
        ]
        return await get_student_cgpa(db=db, usn=usn, semesters=semesters_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


