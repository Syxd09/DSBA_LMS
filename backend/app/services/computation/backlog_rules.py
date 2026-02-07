"""
EduMetrics Computation Layer - Backlog Rules

LOCKED RULES IMPLEMENTED:
- BACKLOG-001: Internal marks FROZEN from attempt 1
- BACKLOG-002: External marks = HIGHEST across all attempts
- BACKLOG-003: Total = Frozen internal + Best external
- BACKLOG-004: Feed rules per system (CO, SGPA, transcript)

COMPUTATION INVARIANT #3: Backlog marks handling

PURE FUNCTIONS: All functions are read-only and stateless.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Dict, Optional

from app.services.computation.warnings import (
    ComputationWarning,
    WarningCode,
)


@dataclass
class AttemptData:
    """Data for a single attempt."""
    attempt_number: int
    internal: Decimal
    external: Optional[Decimal]
    is_backlog: bool


@dataclass
class ResultMarks:
    """
    Final result marks after applying backlog rules.
    
    LOCKED RULE: BACKLOG-003
    Total = Frozen internal (from attempt 1) + Best external (max across attempts)
    """
    internal: Decimal       # FROZEN from first attempt
    external: Decimal       # BEST across all attempts
    total: Decimal          # internal + external
    attempt_count: int
    is_backlog: bool
    frozen_from_attempt: int
    best_external_attempt: int
    warnings: List[ComputationWarning] = field(default_factory=list)


def get_result_marks(
    attempts: List[AttemptData]
) -> ResultMarks:
    """
    Compute final result marks from multiple attempts.
    
    LOCKED RULE: BACKLOG-001
    Internal marks NEVER change after first attempt.
    Internal = FROZEN from attempt_number = 1
    
    LOCKED RULE: BACKLOG-002
    External = MAX(external_marks) across all attempts
    
    LOCKED RULE: BACKLOG-003
    Total = Frozen_Internal + Best_External
    
    COMPUTATION INVARIANT #3
    
    Args:
        attempts: List of AttemptData for each attempt
        
    Returns:
        ResultMarks with frozen internal and best external
    """
    warnings = []
    
    if not attempts:
        return ResultMarks(
            internal=Decimal("0"),
            external=Decimal("0"),
            total=Decimal("0"),
            attempt_count=0,
            is_backlog=False,
            frozen_from_attempt=0,
            best_external_attempt=0,
            warnings=[ComputationWarning(
                code=WarningCode.INSUFFICIENT_DATA,
                message="No attempts found",
                affected_entities=[]
            )]
        )
    
    # Sort by attempt number to get first attempt
    sorted_attempts = sorted(attempts, key=lambda a: a.attempt_number)
    
    # BACKLOG-001: Internal FROZEN from first attempt
    first_attempt = sorted_attempts[0]
    frozen_internal = first_attempt.internal
    frozen_from_attempt = first_attempt.attempt_number
    
    # BACKLOG-002: External = MAX across all attempts
    # Only consider attempts with external marks (not None)
    externals = [
        (a.external, a.attempt_number)
        for a in sorted_attempts
        if a.external is not None
    ]
    
    if externals:
        best_external, best_external_attempt = max(externals, key=lambda x: x[0])
    else:
        best_external = Decimal("0")
        best_external_attempt = 0
        warnings.append(ComputationWarning(
            code=WarningCode.NO_EXTERNAL_MARKS,
            message="No external marks found across all attempts",
            affected_entities=[]
        ))
    
    # BACKLOG-003: Total
    total = frozen_internal + best_external
    
    # Flag for multiple attempts
    is_backlog = len(attempts) > 1
    if is_backlog:
        warnings.append(ComputationWarning(
            code=WarningCode.MULTIPLE_ATTEMPTS,
            message=f"Student has {len(attempts)} attempts",
            affected_entities=[]
        ))
        warnings.append(ComputationWarning(
            code=WarningCode.INTERNAL_FROZEN,
            message=f"Internal marks frozen from attempt {frozen_from_attempt}",
            affected_entities=[]
        ))
    
    return ResultMarks(
        internal=frozen_internal,
        external=best_external,
        total=total,
        attempt_count=len(attempts),
        is_backlog=is_backlog,
        frozen_from_attempt=frozen_from_attempt,
        best_external_attempt=best_external_attempt,
        warnings=warnings
    )


def get_attempt_for_context(
    attempts: List[AttemptData],
    context: str
) -> tuple:
    """
    Determine which attempt(s) to use for a specific context.
    
    LOCKED RULE: BACKLOG-004
    | System         | Attempt Used | Logic |
    |----------------|--------------|-------|
    | CO Attainment  | ALL attempts | Each contributes |
    | PO Attainment  | ALL attempts | Same as CO |
    | SGPA           | BEST TOTAL   | Frozen internal + best external |
    | CGPA           | Same as SGPA | Aggregated |
    | Transcript     | BEST TOTAL   | Only final shown |
    | NBA Evidence   | ALL attempts | Full breakdown |
    
    Args:
        attempts: List of all attempts
        context: "CO_ATTAINMENT", "SGPA", "TRANSCRIPT", "NBA_EVIDENCE"
        
    Returns:
        Tuple of (selected_attempts: List, logic_description: str)
    """
    if context in ("CO_ATTAINMENT", "PO_ATTAINMENT", "NBA_EVIDENCE"):
        # Return all attempts
        return attempts, "All attempts included"
    
    if context in ("SGPA", "CGPA", "TRANSCRIPT"):
        # Return single best result
        result = get_result_marks(attempts)
        return [AttemptData(
            attempt_number=result.best_external_attempt or result.frozen_from_attempt,
            internal=result.internal,
            external=result.external,
            is_backlog=result.is_backlog
        )], "Best total (frozen internal + best external)"
    
    # Default: return all
    return attempts, "All attempts (default)"


# =============================================================================
# Extended Backlog Analytics (Phase 2)
# =============================================================================

@dataclass
class BacklogTrendPoint:
    """Single point in backlog trend analysis."""
    semester: int
    subject_id: str
    subject_code: str
    total_students: int
    backlog_count: int
    backlog_percentage: Decimal
    cleared_count: int  # Cleared in subsequent attempt


@dataclass
class BacklogTrendResult:
    """Result of backlog trend analysis."""
    trend_points: List[BacklogTrendPoint]
    overall_backlog_rate: Decimal
    improving: bool
    warnings: List[ComputationWarning] = field(default_factory=list)


def get_backlog_trend_by_subject(
    subject_attempts_map: Dict[str, List[Dict]]  # {subject_code: [{usn, attempts}]}
) -> BacklogTrendResult:
    """
    Analyze backlog trends across subjects.
    
    EXTENDED ANALYTICS: BACKLOG-EXT-001
    Identifies subjects with high backlog rates and tracks clearing patterns.
    
    Args:
        subject_attempts_map: Dict mapping subject codes to student attempt data
        
    Returns:
        BacklogTrendResult with trend points per subject
    """
    trend_points = []
    total_backlogs = 0
    total_students = 0
    
    for subject_code, student_attempts in subject_attempts_map.items():
        subject_total = len(student_attempts)
        subject_backlogs = 0
        subject_cleared = 0
        
        for student_data in student_attempts:
            attempts = student_data.get("attempts", [])
            if len(attempts) > 1:
                subject_backlogs += 1
                # Check if latest attempt is pass (cleared)
                if attempts[-1].get("passed", False):
                    subject_cleared += 1
        
        backlog_pct = (
            Decimal(str(subject_backlogs)) / Decimal(str(subject_total)) * Decimal("100")
            if subject_total > 0 else Decimal("0")
        )
        
        trend_points.append(BacklogTrendPoint(
            semester=student_attempts[0].get("semester", 0) if student_attempts else 0,
            subject_id=student_attempts[0].get("subject_id", "") if student_attempts else "",
            subject_code=subject_code,
            total_students=subject_total,
            backlog_count=subject_backlogs,
            backlog_percentage=backlog_pct,
            cleared_count=subject_cleared
        ))
        
        total_backlogs += subject_backlogs
        total_students += subject_total
    
    overall_rate = (
        Decimal(str(total_backlogs)) / Decimal(str(total_students)) * Decimal("100")
        if total_students > 0 else Decimal("0")
    )
    
    # Determine if trend is improving (cleared > new backlogs in recent term)
    improving = sum(p.cleared_count for p in trend_points) > len(trend_points) // 2
    
    return BacklogTrendResult(
        trend_points=sorted(trend_points, key=lambda x: x.backlog_percentage, reverse=True),
        overall_backlog_rate=overall_rate,
        improving=improving
    )


@dataclass
class RecurringBacklogStudent:
    """Student with recurring backlogs."""
    usn: str
    student_name: Optional[str]
    backlog_subjects: List[str]  # subject codes
    backlog_count: int
    total_attempts: int
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL


@dataclass
class RecurringBacklogResult:
    """Result of recurring backlog analysis."""
    students: List[RecurringBacklogStudent]
    at_risk_count: int  # HIGH or CRITICAL
    total_analyzed: int
    warnings: List[ComputationWarning] = field(default_factory=list)


def get_recurring_backlog_students(
    student_subjects_map: Dict[str, List[Dict]]  # {usn: [{subject_code, attempts}]}
) -> RecurringBacklogResult:
    """
    Identify students with recurring backlogs across multiple subjects.
    
    EXTENDED ANALYTICS: BACKLOG-EXT-002
    Risk levels:
    - LOW: 1 backlog subject
    - MEDIUM: 2 backlog subjects
    - HIGH: 3-4 backlog subjects
    - CRITICAL: 5+ backlog subjects
    
    Args:
        student_subjects_map: Dict mapping USN to list of subject attempts
        
    Returns:
        RecurringBacklogResult with at-risk students
    """
    students = []
    at_risk = 0
    
    for usn, subjects in student_subjects_map.items():
        backlog_subjects = []
        total_attempts = 0
        
        for subject_data in subjects:
            attempts = subject_data.get("attempts", [])
            total_attempts += len(attempts)
            if len(attempts) > 1:
                backlog_subjects.append(subject_data.get("subject_code", ""))
        
        backlog_count = len(backlog_subjects)
        
        if backlog_count == 0:
            continue  # Skip students with no backlogs
        
        # Determine risk level
        if backlog_count >= 5:
            risk_level = "CRITICAL"
            at_risk += 1
        elif backlog_count >= 3:
            risk_level = "HIGH"
            at_risk += 1
        elif backlog_count >= 2:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        students.append(RecurringBacklogStudent(
            usn=usn,
            student_name=subjects[0].get("student_name") if subjects else None,
            backlog_subjects=backlog_subjects,
            backlog_count=backlog_count,
            total_attempts=total_attempts,
            risk_level=risk_level
        ))
    
    # Sort by backlog count descending
    students.sort(key=lambda x: x.backlog_count, reverse=True)
    
    return RecurringBacklogResult(
        students=students,
        at_risk_count=at_risk,
        total_analyzed=len(student_subjects_map)
    )

