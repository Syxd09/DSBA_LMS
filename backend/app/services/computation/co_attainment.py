"""
EduMetrics Computation Layer - CO Attainment Computation

LOCKED RULES IMPLEMENTED:
- CO-DENOM-001: Denominator = students with >= 1 mark for CO-mapped question
- CO-MAX-001: Max marks is STATIC per CO with section adjustment
- CO-MAX-002: Section selection adjustment
- CO-MAX-003: Obtainable max based on achievable questions
- CO-MAX-004: Unanswered optional = 0 obtained, max unchanged

COMPUTATION INVARIANTS:
- #1: CO denominator definition
- #2: CO max marks calculation
- #9: CO attainment per exam category
- #10: Final CO attainment (40-60 weighted)

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


@dataclass
class StudentCOScore:
    """Individual student's score for a CO."""
    usn: str
    obtained: Decimal
    max_marks: Decimal
    percentage: Decimal
    meets_threshold: bool


@dataclass
class COAttainmentResult:
    """
    Result of CO attainment computation for a single exam category.
    
    COMPUTATION INVARIANT #9
    """
    co_id: UUID
    exam_category: str  # "INTERNAL" or "EXTERNAL"
    threshold: Decimal
    appeared_students: int
    passing_students: int
    attainment_percentage: Decimal
    attainment_level: int
    max_marks: Decimal
    student_scores: List[StudentCOScore] = field(default_factory=list)
    warnings: List[ComputationWarning] = field(default_factory=list)
    is_complete: bool = True
    
    @classmethod
    def empty(cls, co_id: UUID, reason: str) -> "COAttainmentResult":
        """Create empty result when no data available."""
        return cls(
            co_id=co_id,
            exam_category="UNKNOWN",
            threshold=Decimal("60"),
            appeared_students=0,
            passing_students=0,
            attainment_percentage=Decimal("0"),
            attainment_level=0,
            max_marks=Decimal("0"),
            warnings=[ComputationWarning(
                code=WarningCode.NO_QUESTIONS_MAPPED,
                message=reason,
                affected_entities=[str(co_id)]
            )],
            is_complete=False
        )


@dataclass
class COAttainmentFinal:
    """
    Final CO attainment combining internal and external.
    
    COMPUTATION INVARIANT #10
    CO_Final = (CO_Internal × 0.4) + (CO_External × 0.6)
    """
    co_id: UUID
    internal_attainment: COAttainmentResult
    external_attainment: COAttainmentResult
    final_attainment_percentage: Decimal
    final_attainment_level: int
    warnings: List[ComputationWarning] = field(default_factory=list)


def compute_co_max_marks(
    co_sub_questions: List[Dict],
    section_configs: Dict[UUID, Dict]  # section_id -> {selection_mode, required_questions}
) -> Decimal:
    """
    Compute static max marks for a CO.
    
    LOCKED RULE: CO-MAX-001
    Max marks is STATIC per CO, calculated with section adjustment.
    
    LOCKED RULE: CO-MAX-002
    For BEST_N/FIRST_N sections: max = top N question max_marks
    
    COMPUTATION INVARIANT #2
    
    Args:
        co_sub_questions: List of sub_question dicts with {id, max_marks, section_id, question_id}
        section_configs: Dict mapping section_id to {selection_mode, required_questions}
        
    Returns:
        Static max marks for this CO
    """
    if not co_sub_questions:
        return Decimal("0")
    
    # Group by section
    by_section: Dict[UUID, List[Decimal]] = {}
    for sq in co_sub_questions:
        section_id = sq["section_id"]
        if section_id not in by_section:
            by_section[section_id] = []
        by_section[section_id].append(sq["max_marks"])
    
    total_max = Decimal("0")
    
    for section_id, max_marks_list in by_section.items():
        config = section_configs.get(section_id, {
            "selection_mode": "ALL",
            "required_questions": len(max_marks_list)
        })
        
        selection_mode = config.get("selection_mode", "ALL")
        required = config.get("required_questions", len(max_marks_list))
        
        if selection_mode == "ALL":
            section_max = sum(max_marks_list)
        else:
            # BEST_N or FIRST_N: max = top N max marks
            sorted_max = sorted(max_marks_list, reverse=True)
            n = min(required, len(sorted_max))
            section_max = sum(sorted_max[:n])
        
        total_max += section_max
    
    return total_max


def compute_co_attainment(
    co_id: UUID,
    co_threshold: Decimal,
    exam_category: str,  # "INTERNAL" or "EXTERNAL"
    valid_usns: List[str],  # Pre-filtered: no detained, no absent
    student_marks: Dict[str, Decimal],  # {usn: obtained_marks}
    max_marks: Decimal
) -> COAttainmentResult:
    """
    Compute CO attainment for a single exam category.
    
    LOCKED RULE: CO-DENOM-001
    Denominator = appeared students only (pre-filtered via valid_usns)
    
    COMPUTATION INVARIANT #9
    
    Args:
        co_id: Course Outcome ID
        co_threshold: Threshold percentage for this CO
        exam_category: "INTERNAL" or "EXTERNAL"
        valid_usns: List of valid student USNs (already filtered)
        student_marks: Dict mapping USN to obtained marks for this CO
        max_marks: Maximum marks achievable for this CO
        
    Returns:
        COAttainmentResult with attainment percentage and level
    """
    warnings = []
    
    if not valid_usns:
        return COAttainmentResult.empty(co_id, "No valid students for attainment")
    
    if max_marks <= 0:
        return COAttainmentResult.empty(co_id, "Max marks is zero")
    
    passing_count = 0
    student_scores = []
    
    for usn in valid_usns:
        obtained = student_marks.get(usn, Decimal("0"))
        percentage = (obtained / max_marks * 100) if max_marks > 0 else Decimal("0")
        meets_threshold = percentage >= co_threshold
        
        if meets_threshold:
            passing_count += 1
        
        student_scores.append(StudentCOScore(
            usn=usn,
            obtained=obtained,
            max_marks=max_marks,
            percentage=percentage,
            meets_threshold=meets_threshold
        ))
    
    # CO-DENOM-001: Denominator = appeared students
    appeared = len(valid_usns)
    attainment_pct = (Decimal(passing_count) / Decimal(appeared) * 100) if appeared > 0 else Decimal("0")
    
    # Classify attainment level
    from app.services.computation.po_attainment import classify_attainment_static
    attainment_level = classify_attainment_static(attainment_pct)
    
    return COAttainmentResult(
        co_id=co_id,
        exam_category=exam_category,
        threshold=co_threshold,
        appeared_students=appeared,
        passing_students=passing_count,
        attainment_percentage=attainment_pct,
        attainment_level=attainment_level,
        max_marks=max_marks,
        student_scores=student_scores,
        warnings=warnings,
        is_complete=True
    )


def compute_co_attainment_final(
    co_id: UUID,
    internal_result: COAttainmentResult,
    external_result: COAttainmentResult,
    internal_weight: Decimal = Decimal("0.4"),
    external_weight: Decimal = Decimal("0.6")
) -> COAttainmentFinal:
    """
    Compute final CO attainment combining internal and external.
    
    COMPUTATION INVARIANT #10
    CO_Final = (CO_Internal × 0.4) + (CO_External × 0.6)
    
    Args:
        co_id: Course Outcome ID
        internal_result: CO attainment result for internal exams
        external_result: CO attainment result for external exam
        internal_weight: Weight for internal (default 0.4)
        external_weight: Weight for external (default 0.6)
        
    Returns:
        COAttainmentFinal with weighted average
    """
    warnings = []
    warnings.extend(internal_result.warnings)
    warnings.extend(external_result.warnings)
    
    # Weighted average
    final_pct = (
        internal_result.attainment_percentage * internal_weight +
        external_result.attainment_percentage * external_weight
    )
    
    # Classify final level
    from app.services.computation.po_attainment import classify_attainment_static
    final_level = classify_attainment_static(final_pct)
    
    return COAttainmentFinal(
        co_id=co_id,
        internal_attainment=internal_result,
        external_attainment=external_result,
        final_attainment_percentage=final_pct,
        final_attainment_level=final_level,
        warnings=warnings
    )
