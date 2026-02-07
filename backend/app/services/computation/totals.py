"""
EduMetrics Computation Layer - Total Marks Computation

Combines internal and external marks into final totals.

PURE FUNCTIONS: All functions are read-only and stateless.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Dict

from app.services.computation.warnings import (
    ComputationWarning,
    WarningCode,
)


@dataclass
class TotalMarksResult:
    """Result of total marks computation."""
    total: Decimal
    internal: Decimal
    external: Decimal
    internal_max: Decimal  # 40
    external_max: Decimal  # 60
    percentage: Decimal
    warnings: List[ComputationWarning] = field(default_factory=list)
    is_complete: bool = True


def compute_total_marks(
    internal: Decimal,
    external: Decimal,
    internal_max: Decimal = Decimal("40"),
    external_max: Decimal = Decimal("60")
) -> TotalMarksResult:
    """
    Compute total marks from internal and external.
    
    Formula: Total = Internal (40) + External (60) = 100
    
    Args:
        internal: Internal marks (out of internal_max)
        external: External marks (out of external_max)
        internal_max: Maximum internal marks (default 40)
        external_max: Maximum external marks (default 60)
        
    Returns:
        TotalMarksResult with total and percentage
    """
    warnings = []
    is_complete = True
    
    # Cap values
    internal_capped = min(internal, internal_max)
    external_capped = min(external, external_max)
    
    # Check for missing data
    if internal <= Decimal("0"):
        warnings.append(ComputationWarning(
            code=WarningCode.NO_INTERNAL_APPEARANCE,
            message="Internal marks are zero or missing",
            affected_entities=[]
        ))
        is_complete = False
    
    if external <= Decimal("0"):
        warnings.append(ComputationWarning(
            code=WarningCode.NO_EXTERNAL_MARKS,
            message="External marks are zero or missing",
            affected_entities=[]
        ))
        is_complete = False
    
    total = internal_capped + external_capped
    max_total = internal_max + external_max
    
    percentage = (total / max_total * 100) if max_total > 0 else Decimal("0")
    
    return TotalMarksResult(
        total=total,
        internal=internal_capped,
        external=external_capped,
        internal_max=internal_max,
        external_max=external_max,
        percentage=percentage,
        warnings=warnings,
        is_complete=is_complete
    )
