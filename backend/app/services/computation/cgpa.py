"""
EduMetrics Computation Layer - CGPA Computation

CGPA = Σ(semester_credits × SGPA) / Σ(semester_credits)

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
class SemesterSGPA:
    """SGPA for a single semester."""
    semester: int
    sgpa: Decimal
    credits: Decimal
    subjects_passed: int
    subjects_failed: int


@dataclass
class CGPAResult:
    """Result of CGPA computation."""
    cgpa: Decimal
    total_credits: Decimal
    total_credit_points: Decimal
    semesters_completed: int
    semesters_with_backlogs: int
    warnings: List[ComputationWarning] = field(default_factory=list)
    is_complete: bool = True


def compute_cgpa(
    semester_sgpas: List[SemesterSGPA]
) -> CGPAResult:
    """
    Compute CGPA from semester SGPAs.
    
    Formula: CGPA = Σ(semester_credits × SGPA) / Σ(semester_credits)
    
    Args:
        semester_sgpas: List of SemesterSGPA for all completed semesters
        
    Returns:
        CGPAResult with CGPA and breakdown
    """
    warnings = []
    
    if not semester_sgpas:
        return CGPAResult(
            cgpa=Decimal("0"),
            total_credits=Decimal("0"),
            total_credit_points=Decimal("0"),
            semesters_completed=0,
            semesters_with_backlogs=0,
            warnings=[ComputationWarning(
                code=WarningCode.INSUFFICIENT_DATA,
                message="No semester SGPAs found",
                affected_entities=[]
            )],
            is_complete=False
        )
    
    total_credit_points = Decimal("0")
    total_credits = Decimal("0")
    semesters_completed = 0
    semesters_with_backlogs = 0
    
    for semester in semester_sgpas:
        credit_points = semester.credits * semester.sgpa
        total_credit_points += credit_points
        total_credits += semester.credits
        semesters_completed += 1
        
        if semester.subjects_failed > 0:
            semesters_with_backlogs += 1
    
    # Compute CGPA
    if total_credits > 0:
        cgpa = total_credit_points / total_credits
    else:
        cgpa = Decimal("0")
        warnings.append(ComputationWarning(
            code=WarningCode.DIVISION_BY_ZERO,
            message="Total credits is zero, CGPA set to 0",
            affected_entities=[]
        ))
    
    # Round to 2 decimal places
    cgpa = round(cgpa, 2)
    
    return CGPAResult(
        cgpa=cgpa,
        total_credits=total_credits,
        total_credit_points=total_credit_points,
        semesters_completed=semesters_completed,
        semesters_with_backlogs=semesters_with_backlogs,
        warnings=warnings,
        is_complete=semesters_with_backlogs == 0
    )
