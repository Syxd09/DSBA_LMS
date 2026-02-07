"""
EduMetrics Analytics API - PO Attainment Endpoints

READ-ONLY endpoints for PO attainment analytics.

RBAC: PO_ATTAINMENT_READ permission required
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import PermissionChecker, Permission
from app.services.analytics.schemas import AnalyticsResponse
from app.services.analytics.po_service import (
    compute_program_po_attainments,
    get_po_contributing_cos,
)


router = APIRouter(prefix="/analytics/po", tags=["Analytics - PO Attainment"])


@router.get(
    "/program/{program_id}/year/{year}",
    response_model=AnalyticsResponse,
    summary="Get all PO attainments for program-year",
    description="""
    Get PO attainment for all Program Outcomes in a program for a year.
    
    RBAC: Requires PO_ATTAINMENT_READ permission.
    """,
    dependencies=[Depends(PermissionChecker(Permission.PO_ATTAINMENT_READ))]
)
async def get_program_po_attainment(
    program_id: UUID,
    year: int,
    offering_ids: List[UUID] = Query(..., description="Offering IDs for this program-year"),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get PO attainment for all POs in a program."""
    try:
        return await compute_program_po_attainments(
            db=db,
            program_id=program_id,
            academic_year=year,
            offering_ids=offering_ids
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get(
    "/{po_id}/program/{program_id}",
    response_model=AnalyticsResponse,
    summary="Get single PO attainment detail",
    description="""
    Get detailed attainment for a specific PO.
    
    RBAC: Requires PO_ATTAINMENT_READ permission.
    """,
    dependencies=[Depends(PermissionChecker(Permission.PO_ATTAINMENT_READ))]
)
async def get_po_attainment_detail(
    po_id: UUID,
    program_id: UUID,
    year: int = Query(..., description="Academic year"),
    offering_ids: List[UUID] = Query(..., description="Offering IDs"),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get detailed PO attainment."""
    try:
        full_response = await compute_program_po_attainments(
            db=db,
            program_id=program_id,
            academic_year=year,
            offering_ids=offering_ids
        )
        
        # Filter to specific PO
        if full_response.data and full_response.data.pos:
            po_data = next((p for p in full_response.data.pos if p.po_id == po_id), None)
            if po_data:
                full_response.data = po_data
            else:
                raise HTTPException(status_code=404, detail=f"PO {po_id} not found")
        
        return full_response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get(
    "/{po_id}/cos",
    response_model=AnalyticsResponse,
    summary="Get contributing COs for PO",
    description="""
    Get COs that contribute to a PO with their correlation levels and attainments.
    
    RBAC: Requires PO_ATTAINMENT_READ permission.
    """,
    dependencies=[Depends(PermissionChecker(Permission.PO_ATTAINMENT_READ))]
)
async def get_po_cos(
    po_id: UUID,
    program_id: UUID = Query(..., description="Program ID"),
    year: int = Query(..., description="Academic year"),
    offering_ids: List[UUID] = Query(..., description="Offering IDs"),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get contributing COs for a PO."""
    try:
        return await get_po_contributing_cos(
            db=db,
            po_id=po_id,
            program_id=program_id,
            academic_year=year,
            offering_ids=offering_ids
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

