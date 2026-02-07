"""
EduMetrics Analytics API - PSO Attainment Endpoints

READ-ONLY endpoints for PSO (Program Specific Outcomes) attainment analytics.

RBAC: PSO_ATTAINMENT_READ permission required (shares with PO permissions)
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import PermissionChecker, Permission
from app.services.analytics.schemas import AnalyticsResponse
from app.services.computation import (
    compute_pso_attainment,
    compute_all_pso_attainments,
    PSOAttainmentResult,
)
from app.models import ProgramSpecificOutcome, CourseOutcome, COPSOMapping


router = APIRouter(prefix="/analytics/pso", tags=["Analytics - PSO Attainment"])


@router.get(
    "/program/{program_id}/year/{year}",
    response_model=AnalyticsResponse,
    summary="Get all PSO attainments for program-year",
    description="""
    Get PSO attainment for all Program Specific Outcomes in a program for a year.
    
    PSOs are domain-specific outcomes (e.g., programming skills for BCA).
    
    RBAC: Requires PO_ATTAINMENT_READ permission.
    """,
    dependencies=[Depends(PermissionChecker(Permission.PO_ATTAINMENT_READ))]
)
async def get_program_pso_attainment(
    program_id: UUID,
    year: int,
    offering_ids: List[UUID] = Query(..., description="Offering IDs for this program-year"),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get PSO attainment for all PSOs in a program."""
    try:
        # Get all PSOs for program
        psos = db.query(ProgramSpecificOutcome).filter(
            ProgramSpecificOutcome.program_id == program_id
        ).all()
        
        if not psos:
            return AnalyticsResponse(
                success=True,
                data={"program_id": str(program_id), "psos": [], "message": "No PSOs defined"},
                warnings=["No PSOs found for this program"]
            )
        
        # Get all CO-PSO mappings for these PSOs
        pso_ids = [pso.id for pso in psos]
        mappings = db.query(COPSOMapping).filter(
            COPSOMapping.pso_id.in_(pso_ids)
        ).all()
        
        # Get COs from offerings
        cos = db.query(CourseOutcome).filter(
            CourseOutcome.offering_id.in_(offering_ids)
        ).all()
        co_map = {co.id: co for co in cos}
        
        # Compute PSO attainments
        results = []
        for pso in psos:
            pso_mappings = [m for m in mappings if m.pso_id == pso.id]
            
            # Get CO attainments for this PSO (would need CO computation service)
            co_attainments = {}
            correlation_levels = {}
            for mapping in pso_mappings:
                if mapping.co_id in co_map:
                    # For now, return mapping info - real implementation calls CO service
                    correlation_levels[str(mapping.co_id)] = mapping.correlation_level
            
            results.append({
                "pso_id": str(pso.id),
                "pso_code": pso.pso_code,
                "pso_number": pso.pso_number,
                "description": pso.description,
                "threshold": float(pso.threshold),
                "contributing_cos": len(pso_mappings),
                "mappings": [
                    {"co_id": str(m.co_id), "level": m.correlation_level}
                    for m in pso_mappings
                ]
            })
        
        return AnalyticsResponse(
            success=True,
            data={
                "program_id": str(program_id),
                "academic_year": year,
                "pso_count": len(results),
                "psos": results
            },
            warnings=[]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get(
    "/{pso_id}/program/{program_id}",
    response_model=AnalyticsResponse,
    summary="Get single PSO attainment detail",
    description="""
    Get detailed attainment for a specific PSO.
    
    RBAC: Requires PO_ATTAINMENT_READ permission.
    """,
    dependencies=[Depends(PermissionChecker(Permission.PO_ATTAINMENT_READ))]
)
async def get_pso_attainment_detail(
    pso_id: UUID,
    program_id: UUID,
    year: int = Query(..., description="Academic year"),
    offering_ids: List[UUID] = Query(..., description="Offering IDs"),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Get detailed PSO attainment with contributing COs."""
    try:
        pso = db.query(ProgramSpecificOutcome).filter(
            ProgramSpecificOutcome.id == pso_id,
            ProgramSpecificOutcome.program_id == program_id
        ).first()
        
        if not pso:
            raise HTTPException(status_code=404, detail=f"PSO {pso_id} not found")
        
        # Get CO-PSO mappings
        mappings = db.query(COPSOMapping).filter(
            COPSOMapping.pso_id == pso_id
        ).all()
        
        # Get contributing COs
        co_ids = [m.co_id for m in mappings]
        cos = db.query(CourseOutcome).filter(
            CourseOutcome.id.in_(co_ids),
            CourseOutcome.offering_id.in_(offering_ids)
        ).all() if co_ids else []
        
        contributing_cos = []
        for co in cos:
            mapping = next((m for m in mappings if m.co_id == co.id), None)
            contributing_cos.append({
                "co_id": str(co.id),
                "co_code": co.co_code,
                "description": co.description,
                "correlation_level": mapping.correlation_level if mapping else None
            })
        
        return AnalyticsResponse(
            success=True,
            data={
                "pso_id": str(pso.id),
                "pso_code": pso.pso_code,
                "pso_number": pso.pso_number,
                "description": pso.description,
                "threshold": float(pso.threshold),
                "contributing_cos": contributing_cos,
                "total_cos": len(contributing_cos)
            },
            warnings=[]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get(
    "/po-pso-comparison/{program_id}",
    response_model=AnalyticsResponse,
    summary="Compare PO and PSO attainments",
    description="""
    Get side-by-side comparison of PO and PSO attainments for a program.
    
    RBAC: Requires PO_ATTAINMENT_READ permission.
    """,
    dependencies=[Depends(PermissionChecker(Permission.PO_ATTAINMENT_READ))]
)
async def get_po_pso_comparison(
    program_id: UUID,
    year: int = Query(..., description="Academic year"),
    offering_ids: List[UUID] = Query(..., description="Offering IDs"),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    """Compare PO and PSO attainments for comprehensive program analysis."""
    try:
        from app.models import ProgramOutcome
        
        # Get all POs and PSOs
        pos = db.query(ProgramOutcome).filter(
            ProgramOutcome.program_id == program_id
        ).all()
        psos = db.query(ProgramSpecificOutcome).filter(
            ProgramSpecificOutcome.program_id == program_id
        ).all()
        
        return AnalyticsResponse(
            success=True,
            data={
                "program_id": str(program_id),
                "academic_year": year,
                "po_count": len(pos),
                "pso_count": len(psos),
                "pos": [
                    {"po_id": str(po.id), "code": po.po_code, "threshold": float(po.threshold)}
                    for po in pos
                ],
                "psos": [
                    {"pso_id": str(pso.id), "code": pso.pso_code, "threshold": float(pso.threshold)}
                    for pso in psos
                ],
                "note": "Full attainment values require CO computation - use dedicated endpoints"
            },
            warnings=[]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
