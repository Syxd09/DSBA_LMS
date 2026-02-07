"""
EduMetrics Computation Layer - PSO Attainment Computation

LOCKED RULES IMPLEMENTED:
- PSO-001: PSO attainment computed from weighted CO averages via CO-PSO mapping
- PSO-002: Same classification levels as PO (70/55/40)

COMPUTATION INVARIANTS:
- PSO_Final = Weighted average of CO attainments based on CO-PSO mapping

PURE FUNCTIONS: All functions are read-only and stateless.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Dict, Optional
from uuid import UUID

from app.services.computation.warnings import (
    ComputationWarning,
    WarningCode,
)
from app.services.computation.co_attainment import COAttainmentFinal
from app.services.computation.po_attainment import (
    AttainmentThresholds,
    classify_attainment_static,
)


@dataclass
class COContributionPSO:
    """CO contribution to PSO attainment."""
    co_id: UUID
    co_code: str
    correlation_level: int  # 1, 2, or 3
    attainment_percentage: Decimal


@dataclass
class PSOAttainmentResult:
    """
    Result of PSO attainment computation.
    
    COMPUTATION INVARIANT:
    PSO = Weighted average of CO attainments via CO-PSO mapping
    """
    pso_id: UUID
    pso_code: str
    attainment_percentage: Decimal
    attainment_level: int
    contributing_cos: List[COContributionPSO] = field(default_factory=list)
    warnings: List[ComputationWarning] = field(default_factory=list)
    is_complete: bool = True
    
    @classmethod
    def empty(cls, pso_id: UUID, pso_code: str = "") -> "PSOAttainmentResult":
        """Create empty result when no CO mapping exists."""
        return cls(
            pso_id=pso_id,
            pso_code=pso_code,
            attainment_percentage=Decimal("0"),
            attainment_level=0,
            warnings=[ComputationWarning(
                code=WarningCode.NO_CO_PO_MAPPING,  # Reuse warning code
                message=f"No CO-PSO mapping found for PSO {pso_code}",
                affected_entities=[str(pso_id)]
            )],
            is_complete=False
        )


def compute_pso_attainment(
    pso_id: UUID,
    pso_code: str,
    co_attainments: List[COAttainmentFinal],
    co_pso_mappings: List[Dict],  # [{co_id, correlation_level, co_code}]
    thresholds: Optional[AttainmentThresholds] = None
) -> PSOAttainmentResult:
    """
    Compute PSO attainment from weighted average of CO attainments.
    
    LOCKED RULE: PSO-001
    PSO = Weighted average of CO attainments based on CO-PSO mapping.
    Weights = correlation levels (1, 2, 3)
    
    Formula:
    PSO_Attainment = Σ(CO_Final × correlation_level) / Σ(correlation_level)
    
    Args:
        pso_id: Program Specific Outcome ID
        pso_code: PSO code (e.g., "PSO1")
        co_attainments: List of final CO attainment results
        co_pso_mappings: List of mappings with co_id and correlation_level
        thresholds: Optional custom thresholds for classification
        
    Returns:
        PSOAttainmentResult with weighted average
    """
    warnings = []
    
    if not co_pso_mappings:
        return PSOAttainmentResult.empty(pso_id, pso_code)
    
    # Create lookup for CO attainments
    co_lookup = {a.co_id: a for a in co_attainments}
    
    weighted_sum = Decimal("0")
    weight_total = Decimal("0")
    contributing_cos = []
    
    for mapping in co_pso_mappings:
        co_id = mapping["co_id"]
        correlation = mapping["correlation_level"]
        co_code = mapping.get("co_code", str(co_id))
        
        if co_id not in co_lookup:
            warnings.append(ComputationWarning(
                code=WarningCode.INSUFFICIENT_DATA,
                message=f"CO {co_code} attainment not found for PSO calculation",
                affected_entities=[str(co_id)]
            ))
            continue
        
        co_final = co_lookup[co_id]
        weight = Decimal(str(correlation))
        
        weighted_sum += co_final.final_attainment_percentage * weight
        weight_total += weight
        
        contributing_cos.append(COContributionPSO(
            co_id=co_id,
            co_code=co_code,
            correlation_level=correlation,
            attainment_percentage=co_final.final_attainment_percentage
        ))
    
    # Calculate weighted average
    if weight_total > 0:
        pso_pct = weighted_sum / weight_total
    else:
        pso_pct = Decimal("0")
        warnings.append(ComputationWarning(
            code=WarningCode.DIVISION_BY_ZERO,
            message="No valid CO mappings with weights for PSO",
            affected_entities=[str(pso_id)]
        ))
    
    # Classify level (same thresholds as PO)
    level = classify_attainment_static(pso_pct, thresholds)
    
    return PSOAttainmentResult(
        pso_id=pso_id,
        pso_code=pso_code,
        attainment_percentage=pso_pct,
        attainment_level=level,
        contributing_cos=contributing_cos,
        warnings=warnings,
        is_complete=len(warnings) == 0
    )


def compute_all_pso_attainments(
    psos: List[Dict],  # [{pso_id, pso_code}]
    co_attainments: List[COAttainmentFinal],
    all_co_pso_mappings: Dict[UUID, List[Dict]],  # {pso_id: [mappings]}
    thresholds: Optional[AttainmentThresholds] = None
) -> List[PSOAttainmentResult]:
    """
    Compute attainment for all PSOs in a program.
    
    Args:
        psos: List of PSO dicts with pso_id and pso_code
        co_attainments: List of all CO attainment results
        all_co_pso_mappings: Dict mapping pso_id to its CO-PSO mappings
        thresholds: Optional custom thresholds
        
    Returns:
        List of PSOAttainmentResult for all PSOs
    """
    results = []
    
    for pso in psos:
        pso_id = pso["pso_id"]
        pso_code = pso.get("pso_code", str(pso_id))
        mappings = all_co_pso_mappings.get(pso_id, [])
        
        result = compute_pso_attainment(
            pso_id=pso_id,
            pso_code=pso_code,
            co_attainments=co_attainments,
            co_pso_mappings=mappings,
            thresholds=thresholds
        )
        results.append(result)
    
    return results
