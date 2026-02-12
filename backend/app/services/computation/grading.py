"""
EduMetrics Computation Layer - Grading Computation

Computes grade and grade point based on regulation-specific rules.

LOCKED RULES IMPLEMENTED:
- Regulation-specific grading rules
- Pass criteria checks before grading

PURE FUNCTIONS: All functions are read-only and stateless.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Optional

from app.services.computation.warnings import (
    ComputationWarning,
    WarningCode,
)


@dataclass
class GradeResult:
    """Result of grade computation."""
    grade: str
    grade_point: Decimal
    passed: bool
    warnings: List[ComputationWarning] = field(default_factory=list)
    is_complete: bool = True


@dataclass
class PassCriteria:
    """Configuration for pass criteria per regulation."""
    min_internal: Decimal  # Minimum internal marks to pass (e.g., 16)
    min_external: Decimal  # Minimum external marks to pass (e.g., 24)
    min_total: Optional[Decimal] = None  # Optional minimum total


@dataclass
class GradingRule:
    """Configuration for a single grading rule."""
    min_marks: Decimal  # Minimum total marks for this grade
    max_marks: Decimal  # Maximum total marks for this grade
    grade: str          # Grade string (e.g., "A+", "A", "B")
    grade_point: Decimal  # Grade point (e.g., 10, 9, 8)


def meets_pass_criteria(
    internal: Decimal,
    external: Decimal,
    criteria: PassCriteria
) -> tuple:
    """
    Check if student meets pass criteria.
    
    Pass criteria typically requires:
    - Minimum marks in internal (e.g., 40% of 40 = 16)
    - Minimum marks in external (e.g., 40% of 60 = 24)
    
    Args:
        internal: Internal marks obtained
        external: External marks obtained
        criteria: Pass criteria configuration
        
    Returns:
        Tuple of (passed: bool, failure_reasons: List[str])
    """
    reasons = []
    passed = True
    
    if internal < criteria.min_internal:
        passed = False
        reasons.append(f"Internal marks {internal} < minimum {criteria.min_internal}")
    
    if external < criteria.min_external:
        passed = False
        reasons.append(f"External marks {external} < minimum {criteria.min_external}")
    
    if criteria.min_total is not None:
        total = internal + external
        if total < criteria.min_total:
            passed = False
            reasons.append(f"Total marks {total} < minimum {criteria.min_total}")
    
    return passed, reasons


def compute_grade(
    total: Decimal,
    internal: Decimal,
    external: Decimal,
    grading_rules: List[GradingRule],
    pass_criteria: PassCriteria
) -> GradeResult:
    """
    Compute grade and grade point based on total marks.
    
    COMPUTATION INVARIANT #14
    
    Steps:
    1. Check pass criteria first
    2. If failed, return F with GP 0
    3. Apply grading rules (sorted descending by min_marks)
    4. Return matching grade
    
    Args:
        total: Total marks obtained
        internal: Internal marks (for pass criteria check)
        external: External marks (for pass criteria check)
        grading_rules: List of grading rules (from regulation config)
        pass_criteria: Pass criteria for this regulation
        
    Returns:
        GradeResult with grade, grade_point, and pass status
    """
    warnings = []
    
    # Check pass criteria first
    passed, failure_reasons = meets_pass_criteria(internal, external, pass_criteria)
    
    if not passed:
        return GradeResult(
            grade="F",
            grade_point=Decimal("0"),
            passed=False,
            warnings=[ComputationWarning(
                code=WarningCode.INSUFFICIENT_DATA,
                message="; ".join(failure_reasons),
                affected_entities=[]
            )]
        )
    
    # Apply grading rules
    if not grading_rules:
        warnings.append(ComputationWarning(
            code=WarningCode.CONFIG_NOT_FOUND,
            message="No grading rules found for this regulation",
            affected_entities=[]
        ))
        return GradeResult(
            grade="?",
            grade_point=Decimal("0"),
            passed=False,
            warnings=warnings
        )
    
    # Sort rules by min_marks descending
    sorted_rules = sorted(grading_rules, key=lambda r: r.min_marks, reverse=True)
    
    for rule in sorted_rules:
        if total >= rule.min_marks:
            return GradeResult(
                grade=rule.grade,
                grade_point=rule.grade_point,
                passed=True,
                warnings=warnings
            )
    
    # No rule matched (shouldn't happen if rules are complete)
    return GradeResult(
        grade="F",
        grade_point=Decimal("0"),
        passed=False,
        warnings=warnings
    )


# Default grading rules (can be overridden by regulation config)
def get_default_grading_rules() -> List[GradingRule]:
    """
    Get default VTU-style grading rules.
    These are for reference only - actual rules should come from DB.
    """
    return [
        GradingRule(min_marks=Decimal("90"), max_marks=Decimal("100"), grade="S", grade_point=Decimal("10")),
        GradingRule(min_marks=Decimal("80"), max_marks=Decimal("89"), grade="A", grade_point=Decimal("9")),
        GradingRule(min_marks=Decimal("70"), max_marks=Decimal("79"), grade="B", grade_point=Decimal("8")),
        GradingRule(min_marks=Decimal("60"), max_marks=Decimal("69"), grade="C", grade_point=Decimal("7")),
        GradingRule(min_marks=Decimal("50"), max_marks=Decimal("59"), grade="D", grade_point=Decimal("6")),
        GradingRule(min_marks=Decimal("40"), max_marks=Decimal("49"), grade="E", grade_point=Decimal("5")),
        GradingRule(min_marks=Decimal("0"), max_marks=Decimal("39"), grade="F", grade_point=Decimal("0")),
    ]


def get_default_pass_criteria() -> PassCriteria:
    """
    Get default pass criteria (40% internal, 40% external).
    These are for reference only - actual criteria should come from DB.
    """
    return PassCriteria(
        min_internal=Decimal("16"),  # 40% of 40
        min_external=Decimal("24"),  # 40% of 60
        min_total=None
    )
