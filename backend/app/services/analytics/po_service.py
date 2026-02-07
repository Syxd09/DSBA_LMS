"""
EduMetrics Analytics Layer - PO Attainment Orchestration Service

Orchestrates Phase-2A computation functions for PO attainment APIs.

EXECUTION GUARD #1: API layer remains thin.
"""
from typing import List, Dict, Optional
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from sqlalchemy.orm import Session

from app.services.analytics.query_helpers import (
    get_program_pos,
    get_all_co_po_mappings_for_program,
    get_attainment_config,
)
from app.services.analytics.schemas import (
    WarningDTO,
    AnalyticsResponse,
    COContributionDTO,
    POAttainmentDTO,
    POSummaryDTO,
    POAttainmentListResponse,
)
from app.services.analytics.co_service import (
    compute_offering_co_attainments,
)
from app.services.analytics.marks_service import _warning_to_dto
from app.services.computation import (
    compute_po_attainment,
    classify_attainment_static,
    AttainmentThresholds,
    WarningCode,
)
from app.services.computation.co_attainment import COAttainmentFinal


async def compute_program_po_attainments(
    db: Session,
    program_id: UUID,
    academic_year: int,
    offering_ids: List[UUID]  # All offerings for this program-year
) -> AnalyticsResponse:
    """
    Compute all PO attainments for a program-year.
    
    ACADEMIC INTENT: What is the PO attainment for this program?
    
    Orchestrates:
    - compute_offering_co_attainments (per offering)
    - compute_po_attainment (per PO)
    """
    all_warnings = []
    is_complete = True
    
    # Get all POs for program
    pos = await get_program_pos(db, program_id)
    if not pos:
        return AnalyticsResponse(
            data=POAttainmentListResponse(
                program_id=program_id,
                academic_year=academic_year,
                pos=[],
                summary=POSummaryDTO(
                    total_pos=0,
                    pos_attained=0,
                    average_attainment=Decimal("0")
                )
            ),
            warnings=[WarningDTO(
                code=WarningCode.NO_POS_DEFINED.value,
                message="No POs defined for this program",
                affected=[str(program_id)]
            )],
            is_complete=False,
            computed_at=datetime.utcnow()
        )
    
    # Get CO-PO mappings
    co_po_mappings = await get_all_co_po_mappings_for_program(db, program_id, academic_year)
    
    # Get attainment thresholds
    config_data = await get_attainment_config(db, program_id, academic_year)
    thresholds = None
    if config_data:
        thresholds = AttainmentThresholds(
            level_3_threshold=config_data["level_3_threshold"],
            level_2_threshold=config_data["level_2_threshold"],
            level_1_threshold=config_data["level_1_threshold"]
        )
    
    # Collect all CO attainments from offerings
    all_co_attainments: Dict[UUID, COAttainmentFinal] = {}
    
    for offering_id in offering_ids:
        co_response = await compute_offering_co_attainments(
            db=db,
            offering_id=offering_id,
            program_id=program_id
        )
        all_warnings.extend(co_response.warnings)
        is_complete = is_complete and co_response.is_complete
        
        if co_response.data and co_response.data.cos:
            for co_dto in co_response.data.cos:
                # Convert DTO to computation type
                from app.services.computation.co_attainment import (
                    COAttainmentResult,
                    COAttainmentFinal,
                )
                
                int_result = COAttainmentResult(
                    co_id=co_dto.co_id,
                    exam_category="INTERNAL",
                    threshold=co_dto.internal_attainment.threshold,
                    appeared_students=co_dto.internal_attainment.appeared_students,
                    passing_students=co_dto.internal_attainment.passing_students,
                    attainment_percentage=co_dto.internal_attainment.percentage,
                    attainment_level=co_dto.internal_attainment.level,
                    max_marks=Decimal("40")
                )
                
                ext_result = COAttainmentResult(
                    co_id=co_dto.co_id,
                    exam_category="EXTERNAL",
                    threshold=co_dto.external_attainment.threshold,
                    appeared_students=co_dto.external_attainment.appeared_students,
                    passing_students=co_dto.external_attainment.passing_students,
                    attainment_percentage=co_dto.external_attainment.percentage,
                    attainment_level=co_dto.external_attainment.level,
                    max_marks=Decimal("60")
                )
                
                all_co_attainments[co_dto.co_id] = COAttainmentFinal(
                    co_id=co_dto.co_id,
                    internal_attainment=int_result,
                    external_attainment=ext_result,
                    final_attainment_percentage=co_dto.final_attainment.percentage,
                    final_attainment_level=co_dto.final_attainment.level
                )
    
    # Compute PO attainments
    po_results = []
    
    for po in pos:
        po_id = po["po_id"]
        po_code = po["po_code"]
        
        mappings = co_po_mappings.get(po_id, [])
        
        # Convert mappings to computation format
        mapping_dicts = [
            {
                "co_id": m.co_id,
                "correlation_level": m.correlation_level,
                "co_code": m.co_code
            }
            for m in mappings
        ]
        
        # Get CO attainments for this PO's mapped COs
        co_attainments_list = [
            all_co_attainments[m.co_id]
            for m in mappings
            if m.co_id in all_co_attainments
        ]
        
        # Compute PO attainment (Phase-2A)
        po_result = compute_po_attainment(
            po_id=po_id,
            po_code=po_code,
            co_attainments=co_attainments_list,
            co_po_mappings=mapping_dicts,
            thresholds=thresholds
        )
        all_warnings.extend([_warning_to_dto(w) for w in po_result.warnings])
        
        # Build contributing COs DTOs
        contributing = [
            COContributionDTO(
                co_id=c.co_id,
                co_code=c.co_code,
                correlation_level=c.correlation_level,
                attainment_percentage=c.attainment_percentage
            )
            for c in po_result.contributing_cos
        ]
        
        po_results.append(POAttainmentDTO(
            po_id=po_id,
            po_code=po_code,
            po_statement=po["po_statement"],
            attainment_percentage=po_result.attainment_percentage,
            attainment_level=po_result.attainment_level,
            contributing_cos=contributing
        ))
    
    # Summary
    pos_attained = sum(1 for p in po_results if p.attainment_level >= 1)
    avg_attainment = (
        sum(p.attainment_percentage for p in po_results) / len(po_results)
        if po_results else Decimal("0")
    )
    
    response_data = POAttainmentListResponse(
        program_id=program_id,
        academic_year=academic_year,
        pos=po_results,
        summary=POSummaryDTO(
            total_pos=len(pos),
            pos_attained=pos_attained,
            average_attainment=avg_attainment
        )
    )
    
    return AnalyticsResponse(
        data=response_data,
        warnings=all_warnings,
        is_complete=is_complete,
        computed_at=datetime.utcnow()
    )


async def get_po_contributing_cos(
    db: Session,
    po_id: UUID,
    program_id: UUID,
    academic_year: int,
    offering_ids: List[UUID]
) -> AnalyticsResponse:
    """
    Get contributing COs for a PO (drill-down).
    
    ACADEMIC INTENT: Which COs contribute to this PO and how?
    """
    all_warnings = []
    
    # Get CO-PO mappings for this PO
    all_mappings = await get_all_co_po_mappings_for_program(db, program_id, academic_year)
    po_mappings = all_mappings.get(po_id, [])
    
    if not po_mappings:
        return AnalyticsResponse(
            data=[],
            warnings=[WarningDTO(
                code="NO_CO_PO_MAPPING",
                message=f"No CO-PO mapping for PO {po_id}",
                affected=[str(po_id)]
            )],
            is_complete=False,
            computed_at=datetime.utcnow()
        )
    
    # Get CO attainments
    all_co_attainments = {}
    for offering_id in offering_ids:
        co_response = await compute_offering_co_attainments(
            db=db,
            offering_id=offering_id,
            program_id=program_id
        )
        if co_response.data and co_response.data.cos:
            for co_dto in co_response.data.cos:
                all_co_attainments[co_dto.co_id] = co_dto
    
    # Build contribution list
    contributions = []
    for mapping in po_mappings:
        co_dto = all_co_attainments.get(mapping.co_id)
        if co_dto:
            contributions.append(COContributionDTO(
                co_id=mapping.co_id,
                co_code=mapping.co_code,
                correlation_level=mapping.correlation_level,
                attainment_percentage=co_dto.final_attainment.percentage
            ))
    
    return AnalyticsResponse(
        data=contributions,
        warnings=all_warnings,
        is_complete=True,
        computed_at=datetime.utcnow()
    )
