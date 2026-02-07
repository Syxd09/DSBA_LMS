"""
EduMetrics Computation Layer - Internal Marks Computation

LOCKED RULES IMPLEMENTED:
- SCALE-001: Student absent in one internal -> use available
- SCALE-002: Student absent in both internals -> 0 with warning
- SCALE-003: One internal cancelled/not conducted -> use existing
- SCALE-004: Partial evaluation -> compute with warning

COMPUTATION INVARIANT #5: Best internal with NULL handling

Internal Total = Best(INT1, INT2) scaled + Asgn1 + Asgn2 + Att + Act = 40 max

PURE FUNCTIONS: All functions are read-only and stateless.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional, Dict, List

from app.services.computation.warnings import (
    ComputationWarning,
    ComputationResult,
    WarningCode,
)


@dataclass
class InternalExamResult:
    """
    Result of best internal exam computation.
    
    Attributes:
        best_raw: Best raw marks (out of 40)
        best_scaled: Best marks scaled to 20
        int1: INT1 marks (None if absent)
        int2: INT2 marks (None if absent)
        warnings: List of warnings
        is_complete: True if at least one exam was attempted
    """
    best_raw: Decimal
    best_scaled: Decimal
    int1: Optional[Decimal]
    int2: Optional[Decimal]
    warnings: List[ComputationWarning] = field(default_factory=list)
    is_complete: bool = True


@dataclass
class InternalTotalResult:
    """
    Result of complete internal marks computation.
    
    Attributes:
        total: Total internal marks (max 40)
        components: Breakdown of each component
        best_exam: Best internal exam scaled marks
        warnings: List of warnings
        is_complete: True if all required components present
    """
    total: Decimal
    components: Dict[str, Decimal]
    best_exam: Decimal
    warnings: List[ComputationWarning] = field(default_factory=list)
    is_complete: bool = True


def scale_internal_exam(
    raw_marks: Decimal,
    raw_max: int = 40,
    scaled_max: int = 20
) -> Decimal:
    """
    Scale internal exam marks from raw to scaled.
    
    Formula: scaled = (raw / raw_max) × scaled_max
    
    Args:
        raw_marks: Raw marks obtained (out of raw_max)
        raw_max: Maximum raw marks (default 40)
        scaled_max: Target scaled marks (default 20)
        
    Returns:
        Scaled marks (out of scaled_max)
    """
    if raw_max <= 0:
        return Decimal("0")
    
    return (raw_marks / Decimal(str(raw_max))) * Decimal(str(scaled_max))


def compute_best_internal(
    int1_marks: Optional[Decimal],
    int2_marks: Optional[Decimal],
    int1_exists: bool = True,
    int2_exists: bool = True,
    raw_max: int = 40,
    scaled_max: int = 20
) -> InternalExamResult:
    """
    Compute best internal exam score with proper NULL handling.
    
    LOCKED RULE: SCALE-001
    Student absent in one internal -> best = available score
    NULL is treated as "did not appear", NOT as 0
    
    LOCKED RULE: SCALE-002
    Student absent in both internals -> best = 0 with warning
    
    LOCKED RULE: SCALE-003
    One internal cancelled/not conducted -> use the one that exists
    
    COMPUTATION INVARIANT #5
    
    Args:
        int1_marks: INT1 marks (None if absent)
        int2_marks: INT2 marks (None if absent)
        int1_exists: Whether INT1 exam was conducted
        int2_exists: Whether INT2 exam was conducted
        raw_max: Maximum raw marks (default 40)
        scaled_max: Target scaled marks (default 20)
        
    Returns:
        InternalExamResult with best score and warnings
    """
    warnings = []
    
    # Check exam existence (SCALE-003)
    if not int1_exists:
        warnings.append(ComputationWarning(
            code=WarningCode.INT1_NOT_CONDUCTED,
            message="Internal Exam 1 was not conducted",
            affected_entities=[]
        ))
    
    if not int2_exists:
        warnings.append(ComputationWarning(
            code=WarningCode.INT2_NOT_CONDUCTED,
            message="Internal Exam 2 was not conducted",
            affected_entities=[]
        ))
    
    # Handle both absent (SCALE-002)
    if int1_marks is None and int2_marks is None:
        warnings.append(ComputationWarning(
            code=WarningCode.NO_INTERNAL_APPEARANCE,
            message="Student did not appear for any internal exam",
            affected_entities=[]
        ))
        return InternalExamResult(
            best_raw=Decimal("0"),
            best_scaled=Decimal("0"),
            int1=None,
            int2=None,
            warnings=warnings,
            is_complete=False
        )
    
    # Best of available (SCALE-001)
    # NULL means did not appear, not 0
    # We compare only the available scores
    available_scores = []
    if int1_marks is not None:
        available_scores.append(int1_marks)
    if int2_marks is not None:
        available_scores.append(int2_marks)
    
    best_raw = max(available_scores)
    best_scaled = scale_internal_exam(best_raw, raw_max, scaled_max)
    
    return InternalExamResult(
        best_raw=best_raw,
        best_scaled=best_scaled,
        int1=int1_marks,
        int2=int2_marks,
        warnings=warnings,
        is_complete=True
    )


def compute_internal_total(
    best_exam_scaled: Decimal,
    assignment_1: Optional[Decimal],
    assignment_2: Optional[Decimal],
    attendance: Optional[Decimal],
    activity: Optional[Decimal]
) -> InternalTotalResult:
    """
    Compute total internal marks (max 40).
    
    Formula: Internal Total = Best Exam (20) + Asgn1 (5) + Asgn2 (5) + Att (5) + Act (5)
    
    LOCKED RULE: SCALE-004
    If any component is missing, compute with available and add warning.
    
    Args:
        best_exam_scaled: Best internal exam scaled to 20
        assignment_1: Assignment 1 marks (max 5), None if missing
        assignment_2: Assignment 2 marks (max 5), None if missing
        attendance: Attendance marks (max 5), None if missing
        activity: Activity marks (max 5), None if missing
        
    Returns:
        InternalTotalResult with total and breakdown
    """
    warnings = []
    is_complete = True
    
    # Check for missing components
    asgn1 = assignment_1 if assignment_1 is not None else Decimal("0")
    asgn2 = assignment_2 if assignment_2 is not None else Decimal("0")
    att = attendance if attendance is not None else Decimal("0")
    act = activity if activity is not None else Decimal("0")
    
    if assignment_1 is None:
        warnings.append(ComputationWarning(
            code=WarningCode.MISSING_ASSIGNMENT_1,
            message="Assignment 1 marks not found, treating as 0",
            affected_entities=[]
        ))
        is_complete = False
    
    if assignment_2 is None:
        warnings.append(ComputationWarning(
            code=WarningCode.MISSING_ASSIGNMENT_2,
            message="Assignment 2 marks not found, treating as 0",
            affected_entities=[]
        ))
        is_complete = False
    
    if attendance is None:
        warnings.append(ComputationWarning(
            code=WarningCode.MISSING_ATTENDANCE,
            message="Attendance marks not found, treating as 0",
            affected_entities=[]
        ))
        is_complete = False
    
    if activity is None:
        warnings.append(ComputationWarning(
            code=WarningCode.MISSING_ACTIVITY,
            message="Activity marks not found, treating as 0",
            affected_entities=[]
        ))
        is_complete = False
    
    # Compute total with caps
    best_exam_capped = min(best_exam_scaled, Decimal("20"))
    asgn1_capped = min(asgn1, Decimal("5"))
    asgn2_capped = min(asgn2, Decimal("5"))
    att_capped = min(att, Decimal("5"))
    act_capped = min(act, Decimal("5"))
    
    total = best_exam_capped + asgn1_capped + asgn2_capped + att_capped + act_capped
    total_capped = min(total, Decimal("40"))
    
    return InternalTotalResult(
        total=total_capped,
        components={
            "best_exam": best_exam_capped,
            "assignment_1": asgn1_capped,
            "assignment_2": asgn2_capped,
            "attendance": att_capped,
            "activity": act_capped
        },
        best_exam=best_exam_capped,
        warnings=warnings,
        is_complete=is_complete
    )
