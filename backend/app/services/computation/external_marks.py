"""
EduMetrics Computation Layer - External Marks Computation

Handles external exam marks with section-wise Best-N logic.

LOCKED RULES IMPLEMENTED:
- Section selection modes: ALL, BEST_N, FIRST_N
- CO-MAX-001: Section selection adjustment for max marks

PURE FUNCTIONS: All functions are read-only and stateless.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Dict, Optional

from app.services.computation.warnings import (
    ComputationWarning,
    ComputationResult,
    WarningCode,
)


@dataclass
class SectionMarksResult:
    """Result of section marks computation with selection applied."""
    section_marks: Decimal
    section_max: Decimal
    selection_mode: str
    required_questions: int
    questions_attempted: int
    question_marks: List[Decimal]
    warnings: List[ComputationWarning] = field(default_factory=list)


@dataclass
class ExternalMarksResult:
    """Result of external exam marks computation."""
    total: Decimal
    max_marks: Decimal
    sections: List[SectionMarksResult]
    warnings: List[ComputationWarning] = field(default_factory=list)
    is_complete: bool = True


def get_section_marks_with_selection(
    question_marks: List[Optional[Decimal]],
    question_max_marks: List[Decimal],
    selection_mode: str,
    required_questions: int
) -> SectionMarksResult:
    """
    Apply section selection mode to compute section marks.
    
    LOCKED RULE: Section Selection Adjustment (from Phase-2A design)
    
    For selection_mode = 'ALL':
        section_marks = sum(all question marks)
        section_max = sum(all question max_marks)
        
    For selection_mode = 'BEST_N' or 'FIRST_N':
        BEST_N: Take top N scores
        FIRST_N: Take first N attempted
        section_max = sum of TOP N question max_marks
    
    Args:
        question_marks: List of marks per question (None if not attempted)
        question_max_marks: List of max marks per question
        selection_mode: 'ALL', 'BEST_N', or 'FIRST_N'
        required_questions: Number of questions to consider for BEST_N/FIRST_N
        
    Returns:
        SectionMarksResult with computed marks and details
    """
    warnings = []
    
    # Count attempted questions (non-None marks)
    attempted = [m for m in question_marks if m is not None]
    questions_attempted = len(attempted)
    
    if selection_mode == "ALL":
        # Sum all marks (None treated as 0)
        section_marks = sum(
            m if m is not None else Decimal("0")
            for m in question_marks
        )
        section_max = sum(question_max_marks)
        
    elif selection_mode == "BEST_N":
        # Sort by marks descending, take top N
        # Pair marks with max_marks for proper selection
        paired = list(zip(question_marks, question_max_marks))
        
        # Sort by marks descending (None treated as -1 for sorting)
        sorted_pairs = sorted(
            paired,
            key=lambda x: x[0] if x[0] is not None else Decimal("-1"),
            reverse=True
        )
        
        # Take top required_questions
        n = min(required_questions, len(sorted_pairs))
        selected = sorted_pairs[:n]
        
        section_marks = sum(
            m if m is not None else Decimal("0")
            for m, _ in selected
        )
        # Max marks = top N max marks (sorted descending)
        sorted_max = sorted(question_max_marks, reverse=True)[:n]
        section_max = sum(sorted_max)
        
    elif selection_mode == "FIRST_N":
        # Take first N questions
        n = min(required_questions, len(question_marks))
        
        section_marks = sum(
            m if m is not None else Decimal("0")
            for m in question_marks[:n]
        )
        section_max = sum(question_max_marks[:n])
        
    else:
        raise ValueError(f"Unknown selection_mode: {selection_mode}")
    
    return SectionMarksResult(
        section_marks=section_marks,
        section_max=section_max,
        selection_mode=selection_mode,
        required_questions=required_questions,
        questions_attempted=questions_attempted,
        question_marks=[m if m is not None else Decimal("0") for m in question_marks],
        warnings=warnings
    )


def compute_external_marks(
    sections_data: List[Dict]
) -> ExternalMarksResult:
    """
    Compute total external exam marks across all sections.
    
    Each section dict should contain:
    - question_marks: List of marks per question
    - question_max_marks: List of max marks per question
    - selection_mode: 'ALL', 'BEST_N', or 'FIRST_N'
    - required_questions: Number of questions for BEST_N/FIRST_N
    
    Args:
        sections_data: List of section configuration dicts
        
    Returns:
        ExternalMarksResult with total and section breakdown
    """
    warnings = []
    sections = []
    total = Decimal("0")
    max_marks = Decimal("0")
    is_complete = True
    
    if not sections_data:
        warnings.append(ComputationWarning(
            code=WarningCode.EXTERNAL_NOT_CONDUCTED,
            message="No external exam sections found",
            affected_entities=[]
        ))
        return ExternalMarksResult(
            total=Decimal("0"),
            max_marks=Decimal("0"),
            sections=[],
            warnings=warnings,
            is_complete=False
        )
    
    for section in sections_data:
        section_result = get_section_marks_with_selection(
            question_marks=section["question_marks"],
            question_max_marks=section["question_max_marks"],
            selection_mode=section["selection_mode"],
            required_questions=section["required_questions"]
        )
        
        sections.append(section_result)
        total += section_result.section_marks
        max_marks += section_result.section_max
        warnings.extend(section_result.warnings)
        
        if section_result.questions_attempted == 0:
            is_complete = False
    
    return ExternalMarksResult(
        total=total,
        max_marks=max_marks,
        sections=sections,
        warnings=warnings,
        is_complete=is_complete
    )


# =============================================================================
# Extended External Exam Analytics (Phase 3)
# =============================================================================

@dataclass
class GradeDistribution:
    """Grade distribution for external exam."""
    grade: str
    count: int
    percentage: Decimal


@dataclass
class ExternalAnalyticsResult:
    """Extended analytics for external exam results."""
    total_students: int
    appeared_count: int
    absent_count: int
    pass_count: int
    fail_count: int
    pass_percentage: Decimal
    average_marks: Decimal
    highest_marks: Decimal
    lowest_marks: Decimal
    grade_distribution: List[GradeDistribution]
    warnings: List[ComputationWarning] = field(default_factory=list)


def compute_external_analytics(
    student_marks: List[Dict],  # [{usn, marks, max_marks, grade, passed}]
    grade_order: List[str] = None
) -> ExternalAnalyticsResult:
    """
    Compute deep analytics for external exam results.
    
    EXTENDED ANALYTICS: EXT-DEEP-001
    Provides grade distribution, pass rate, and statistical analysis.
    
    Args:
        student_marks: List of student mark records
        grade_order: Order of grades for distribution (default: O, A+, A, B+, B, C, P, F)
        
    Returns:
        ExternalAnalyticsResult with comprehensive statistics
    """
    if grade_order is None:
        grade_order = ["O", "A+", "A", "B+", "B", "C", "P", "F"]
    
    warnings = []
    total_students = len(student_marks)
    
    if total_students == 0:
        return ExternalAnalyticsResult(
            total_students=0,
            appeared_count=0,
            absent_count=0,
            pass_count=0,
            fail_count=0,
            pass_percentage=Decimal("0"),
            average_marks=Decimal("0"),
            highest_marks=Decimal("0"),
            lowest_marks=Decimal("0"),
            grade_distribution=[],
            warnings=[ComputationWarning(
                code=WarningCode.INSUFFICIENT_DATA,
                message="No student marks provided",
                affected_entities=[]
            )]
        )
    
    # Separate appeared vs absent
    appeared = [s for s in student_marks if s.get("marks") is not None]
    absent = [s for s in student_marks if s.get("marks") is None]
    
    appeared_count = len(appeared)
    absent_count = len(absent)
    
    if appeared_count == 0:
        return ExternalAnalyticsResult(
            total_students=total_students,
            appeared_count=0,
            absent_count=absent_count,
            pass_count=0,
            fail_count=0,
            pass_percentage=Decimal("0"),
            average_marks=Decimal("0"),
            highest_marks=Decimal("0"),
            lowest_marks=Decimal("0"),
            grade_distribution=[],
            warnings=[ComputationWarning(
                code=WarningCode.NO_STUDENTS_APPEARED,
                message="No students appeared for external exam",
                affected_entities=[]
            )]
        )
    
    # Calculate statistics
    marks_list = [Decimal(str(s["marks"])) for s in appeared]
    pass_list = [s for s in appeared if s.get("passed", False)]
    fail_list = [s for s in appeared if not s.get("passed", False)]
    
    pass_count = len(pass_list)
    fail_count = len(fail_list)
    pass_percentage = Decimal(str(pass_count)) / Decimal(str(appeared_count)) * Decimal("100")
    
    average_marks = sum(marks_list) / Decimal(str(len(marks_list)))
    highest_marks = max(marks_list)
    lowest_marks = min(marks_list)
    
    # Grade distribution
    grade_counts = {}
    for s in appeared:
        grade = s.get("grade", "F")
        grade_counts[grade] = grade_counts.get(grade, 0) + 1
    
    grade_distribution = []
    for grade in grade_order:
        count = grade_counts.get(grade, 0)
        pct = Decimal(str(count)) / Decimal(str(appeared_count)) * Decimal("100") if appeared_count > 0 else Decimal("0")
        grade_distribution.append(GradeDistribution(
            grade=grade,
            count=count,
            percentage=pct
        ))
    
    return ExternalAnalyticsResult(
        total_students=total_students,
        appeared_count=appeared_count,
        absent_count=absent_count,
        pass_count=pass_count,
        fail_count=fail_count,
        pass_percentage=pass_percentage,
        average_marks=average_marks,
        highest_marks=highest_marks,
        lowest_marks=lowest_marks,
        grade_distribution=grade_distribution,
        warnings=warnings
    )


@dataclass
class ExternalCOAnalysis:
    """CO-level analysis from external exam (if question-level data available)."""
    co_id: str
    co_code: str
    total_marks_possible: Decimal
    total_marks_obtained: Decimal
    attainment_percentage: Decimal
    question_count: int


@dataclass
class ExternalCOAnalyticsResult:
    """Result of CO-level external analysis."""
    co_analyses: List[ExternalCOAnalysis]
    overall_attainment: Decimal
    has_question_level_data: bool
    warnings: List[ComputationWarning] = field(default_factory=list)


def compute_external_co_analytics(
    question_marks_by_co: Dict[str, List[Dict]]  # {co_code: [{usn, marks, max_marks}]}
) -> ExternalCOAnalyticsResult:
    """
    Compute CO-level attainment from external exam question-level data.
    
    EXTENDED ANALYTICS: EXT-DEEP-002
    Only applicable when external exam has question-level data with CO mapping.
    
    Args:
        question_marks_by_co: Dict mapping CO codes to question-level marks
        
    Returns:
        ExternalCOAnalyticsResult with per-CO analysis
    """
    if not question_marks_by_co:
        return ExternalCOAnalyticsResult(
            co_analyses=[],
            overall_attainment=Decimal("0"),
            has_question_level_data=False,
            warnings=[ComputationWarning(
                code=WarningCode.EXTERNAL_NO_QUESTION_DATA,
                message="No question-level data available for external exam",
                affected_entities=[]
            )]
        )
    
    co_analyses = []
    total_possible = Decimal("0")
    total_obtained = Decimal("0")
    
    for co_code, questions in question_marks_by_co.items():
        co_possible = Decimal("0")
        co_obtained = Decimal("0")
        
        for q in questions:
            marks = Decimal(str(q.get("marks", 0)))
            max_m = Decimal(str(q.get("max_marks", 0)))
            co_possible += max_m
            co_obtained += marks
        
        pct = co_obtained / co_possible * Decimal("100") if co_possible > 0 else Decimal("0")
        
        co_analyses.append(ExternalCOAnalysis(
            co_id=questions[0].get("co_id", "") if questions else "",
            co_code=co_code,
            total_marks_possible=co_possible,
            total_marks_obtained=co_obtained,
            attainment_percentage=pct,
            question_count=len(questions)
        ))
        
        total_possible += co_possible
        total_obtained += co_obtained
    
    overall = total_obtained / total_possible * Decimal("100") if total_possible > 0 else Decimal("0")
    
    return ExternalCOAnalyticsResult(
        co_analyses=sorted(co_analyses, key=lambda x: x.co_code),
        overall_attainment=overall,
        has_question_level_data=True
    )

