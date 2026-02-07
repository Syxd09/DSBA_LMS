"""
EduMetrics Computation Layer - SGPA Computation

SGPA = Σ(credit × grade_point) / Σ(credit)

PURE FUNCTIONS: All functions are read-only and stateless.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List

from app.services.computation.warnings import (
    ComputationWarning,
    WarningCode,
)


@dataclass
class SubjectResult:
    """Result for a single subject."""
    subject_code: str
    credits: Decimal
    grade: str
    grade_point: Decimal
    passed: bool


@dataclass
class SGPAResult:
    """Result of SGPA computation."""
    sgpa: Decimal
    total_credits: Decimal
    total_credit_points: Decimal
    subjects_passed: int
    subjects_failed: int
    warnings: List[ComputationWarning] = field(default_factory=list)
    is_complete: bool = True


def compute_sgpa(
    subject_results: List[SubjectResult]
) -> SGPAResult:
    """
    Compute SGPA from subject results.
    
    Formula: SGPA = Σ(credit × grade_point) / Σ(credit)
    
    LOCKED RULE: DETAINED-004
    Detained students are excluded from SGPA calculation.
    Absent students are INCLUDED as 0.
    
    Args:
        subject_results: List of SubjectResult for all subjects in semester
        
    Returns:
        SGPAResult with SGPA and breakdown
    """
    warnings = []
    
    if not subject_results:
        return SGPAResult(
            sgpa=Decimal("0"),
            total_credits=Decimal("0"),
            total_credit_points=Decimal("0"),
            subjects_passed=0,
            subjects_failed=0,
            warnings=[ComputationWarning(
                code=WarningCode.INSUFFICIENT_DATA,
                message="No subject results found",
                affected_entities=[]
            )],
            is_complete=False
        )
    
    total_credit_points = Decimal("0")
    total_credits = Decimal("0")
    subjects_passed = 0
    subjects_failed = 0
    
    for result in subject_results:
        credit_points = result.credits * result.grade_point
        total_credit_points += credit_points
        total_credits += result.credits
        
        if result.passed:
            subjects_passed += 1
        else:
            subjects_failed += 1
    
    # Compute SGPA
    if total_credits > 0:
        sgpa = total_credit_points / total_credits
    else:
        sgpa = Decimal("0")
        warnings.append(ComputationWarning(
            code=WarningCode.DIVISION_BY_ZERO,
            message="Total credits is zero, SGPA set to 0",
            affected_entities=[]
        ))
    
    # Round to 2 decimal places
    sgpa = round(sgpa, 2)
    
    return SGPAResult(
        sgpa=sgpa,
        total_credits=total_credits,
        total_credit_points=total_credit_points,
        subjects_passed=subjects_passed,
        subjects_failed=subjects_failed,
        warnings=warnings,
        is_complete=subjects_failed == 0
    )
