"""
EduMetrics Computation Layer - PO Attainment Computation

LOCKED RULES IMPLEMENTED:
- LEVEL-001: Standard NBA attainment levels (70/55/40)
- LEVEL-002: Institution override capability per program
- LEVEL-003: Historical batch threshold retention

COMPUTATION INVARIANTS:
- #6: Attainment level classification
- #11: PO attainment from weighted CO averages

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


@dataclass
class AttainmentThresholds:
    """
    Configurable attainment level thresholds.
    
    LOCKED RULE: LEVEL-002
    """
    level_3_threshold: Decimal = Decimal("70")  # >= 70%
    level_2_threshold: Decimal = Decimal("55")  # >= 55%
    level_1_threshold: Decimal = Decimal("40")  # >= 40%


@dataclass
class COContribution:
    """CO contribution to PO attainment."""
    co_id: UUID
    co_code: str
    correlation_level: int  # 1, 2, or 3
    attainment_percentage: Decimal


@dataclass
class POAttainmentResult:
    """
    Result of PO attainment computation.
    
    COMPUTATION INVARIANT #11
    """
    po_id: UUID
    po_code: str
    attainment_percentage: Decimal
    attainment_level: int
    contributing_cos: List[COContribution] = field(default_factory=list)
    warnings: List[ComputationWarning] = field(default_factory=list)
    is_complete: bool = True
    
    @classmethod
    def empty(cls, po_id: UUID, po_code: str = "") -> "POAttainmentResult":
        """Create empty result when no CO mapping exists."""
        return cls(
            po_id=po_id,
            po_code=po_code,
            attainment_percentage=Decimal("0"),
            attainment_level=0,
            warnings=[ComputationWarning(
                code=WarningCode.NO_CO_PO_MAPPING,
                message=f"No CO-PO mapping found for PO {po_code}",
                affected_entities=[str(po_id)]
            )],
            is_complete=False
        )


def classify_attainment_static(
    percentage: Decimal,
    thresholds: Optional[AttainmentThresholds] = None
) -> int:
    """
    Classify attainment level based on percentage.
    
    LOCKED RULE: LEVEL-001
    NBA-standard attainment levels (defaults):
    - Level 3: >= 70% students meet threshold
    - Level 2: >= 55% students meet threshold
    - Level 1: >= 40% students meet threshold
    - Level 0: < 40%
    
    COMPUTATION INVARIANT #6
    
    Args:
        percentage: Attainment percentage
        thresholds: Optional custom thresholds (for institution override)
        
    Returns:
        Attainment level (0, 1, 2, or 3)
    """
    if thresholds is None:
        thresholds = AttainmentThresholds()
    
    if percentage >= thresholds.level_3_threshold:
        return 3
    elif percentage >= thresholds.level_2_threshold:
        return 2
    elif percentage >= thresholds.level_1_threshold:
        return 1
    return 0


def classify_attainment(
    percentage: Decimal,
    program_id: UUID,
    cohort_year: int,
    config_lookup: Optional[Dict[UUID, Dict[int, AttainmentThresholds]]] = None
) -> int:
    """
    Classify attainment level with program-specific thresholds.
    
    LOCKED RULE: LEVEL-002
    Institutions MAY customize level thresholds per program.
    
    LOCKED RULE: LEVEL-003
    Old batches RETAIN their effective thresholds.
    
    COMPUTATION INVARIANT #6
    
    Args:
        percentage: Attainment percentage
        program_id: Program ID for threshold lookup
        cohort_year: Cohort year for historical threshold resolution
        config_lookup: Optional dict of {program_id: {year: thresholds}}
        
    Returns:
        Attainment level (0, 1, 2, or 3)
    """
    thresholds = None
    
    if config_lookup and program_id in config_lookup:
        program_configs = config_lookup[program_id]
        # Find effective config for this cohort year (LEVEL-003)
        effective_years = [y for y in program_configs.keys() if y <= cohort_year]
        if effective_years:
            effective_year = max(effective_years)
            thresholds = program_configs[effective_year]
    
    return classify_attainment_static(percentage, thresholds)


def compute_po_attainment(
    po_id: UUID,
    po_code: str,
    co_attainments: List[COAttainmentFinal],
    co_po_mappings: List[Dict],  # [{co_id, correlation_level, co_code}]
    thresholds: Optional[AttainmentThresholds] = None
) -> POAttainmentResult:
    """
    Compute PO attainment from weighted average of CO attainments.
    
    COMPUTATION INVARIANT #11
    PO = Weighted average of CO attainments based on CO-PO mapping.
    Weights = correlation levels (1, 2, 3)
    
    Formula:
    PO_Attainment = Σ(CO_Final × correlation_level) / Σ(correlation_level)
    
    Args:
        po_id: Program Outcome ID
        po_code: PO code (e.g., "PO1")
        co_attainments: List of final CO attainment results
        co_po_mappings: List of mappings with co_id and correlation_level
        thresholds: Optional custom thresholds for classification
        
    Returns:
        POAttainmentResult with weighted average
    """
    warnings = []
    
    if not co_po_mappings:
        return POAttainmentResult.empty(po_id, po_code)
    
    # Create lookup for CO attainments
    co_lookup = {a.co_id: a for a in co_attainments}
    
    weighted_sum = Decimal("0")
    weight_total = Decimal("0")
    contributing_cos = []
    
    for mapping in co_po_mappings:
        co_id = mapping["co_id"]
        correlation = mapping["correlation_level"]
        co_code = mapping.get("co_code", str(co_id))
        
        if co_id not in co_lookup:
            warnings.append(ComputationWarning(
                code=WarningCode.INSUFFICIENT_DATA,
                message=f"CO {co_code} attainment not found",
                affected_entities=[str(co_id)]
            ))
            continue
        
        co_final = co_lookup[co_id]
        weight = Decimal(str(correlation))
        
        weighted_sum += co_final.final_attainment_percentage * weight
        weight_total += weight
        
        contributing_cos.append(COContribution(
            co_id=co_id,
            co_code=co_code,
            correlation_level=correlation,
            attainment_percentage=co_final.final_attainment_percentage
        ))
    
    # Calculate weighted average
    if weight_total > 0:
        po_pct = weighted_sum / weight_total
    else:
        po_pct = Decimal("0")
        warnings.append(ComputationWarning(
            code=WarningCode.DIVISION_BY_ZERO,
            message="No valid CO mappings with weights",
            affected_entities=[str(po_id)]
        ))
    
    # Classify level
    level = classify_attainment_static(po_pct, thresholds)
    
    return POAttainmentResult(
        po_id=po_id,
        po_code=po_code,
        attainment_percentage=po_pct,
        attainment_level=level,
        contributing_cos=contributing_cos,
        warnings=warnings,
        is_complete=len(warnings) == 0
    )


def compute_all_po_attainments(
    pos: List[Dict],  # [{po_id, po_code}]
    co_attainments: List[COAttainmentFinal],
    all_co_po_mappings: Dict[UUID, List[Dict]],  # {po_id: [mappings]}
    thresholds: Optional[AttainmentThresholds] = None
) -> List[POAttainmentResult]:
    """
    Compute attainment for all POs in a program.
    
    Args:
        pos: List of PO dicts with po_id and po_code
        co_attainments: List of all CO attainment results
        all_co_po_mappings: Dict mapping po_id to its CO-PO mappings
        thresholds: Optional custom thresholds
        
    Returns:
        List of POAttainmentResult for all POs
    """
    results = []
    
    for po in pos:
        po_id = po["po_id"]
        po_code = po.get("po_code", str(po_id))
        mappings = all_co_po_mappings.get(po_id, [])
        
        result = compute_po_attainment(
            po_id=po_id,
            po_code=po_code,
            co_attainments=co_attainments,
            co_po_mappings=mappings,
            thresholds=thresholds
        )
        results.append(result)
    
    return results
