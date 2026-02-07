"""
EduMetrics Computation Layer - Standalone Test Suite

This test file is independent of the main test conftest.py to avoid
import issues with other modules. Run with:

    python tests/test_computation_standalone.py

Or:

    python -m pytest tests/test_computation_standalone.py -v
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from decimal import Decimal
from uuid import uuid4

# Import computation modules
from app.services.computation.warnings import (
    ComputationWarning,
    ComputationResult,
    WarningCode,
)
from app.services.computation.detention_absence import (
    is_detained,
    is_absent_for_exam,
    get_valid_students_for_attainment,
    get_exclusion_status,
)
from app.services.computation.internal_marks import (
    scale_internal_exam,
    compute_best_internal,
    compute_internal_total,
)
from app.services.computation.external_marks import (
    get_section_marks_with_selection,
    compute_external_marks,
)
from app.services.computation.totals import compute_total_marks
from app.services.computation.grading import (
    compute_grade,
    meets_pass_criteria,
    PassCriteria,
    GradingRule,
)
from app.services.computation.backlog_rules import (
    get_result_marks,
    AttemptData,
)
from app.services.computation.sgpa import (
    compute_sgpa,
    SubjectResult,
)
from app.services.computation.cgpa import (
    compute_cgpa,
    SemesterSGPA,
)
from app.services.computation.co_attainment import (
    compute_co_max_marks,
    compute_co_attainment,
    compute_co_attainment_final,
)
from app.services.computation.po_attainment import (
    classify_attainment_static,
    classify_attainment,
    compute_po_attainment,
    AttainmentThresholds,
)


def test_detained_001_detained_status():
    """DETAINED-001: students.status = 'DETAINED' is detained"""
    assert is_detained("DETAINED") is True
    assert is_detained("ACTIVE") is False
    assert is_detained("WITHDRAWN") is False
    assert is_detained(None) is False
    print("✅ DETAINED-001: Passed")


def test_detained_002_absent_identification():
    """DETAINED-002: No records = absent"""
    sq_ids = [uuid4(), uuid4()]
    marks = {}
    assert is_absent_for_exam("USN001", sq_ids, marks) is True
    
    sq_id = uuid4()
    marks = {("USN001", sq_id): Decimal("5")}
    assert is_absent_for_exam("USN001", [sq_id], marks) is False
    print("✅ DETAINED-002: Passed")


def test_detained_003_null_vs_zero():
    """DETAINED-003: NULL (no row) != 0 (row with marks=0)"""
    sq_id = uuid4()
    
    marks_zero = {("USN001", sq_id): Decimal("0")}
    assert is_absent_for_exam("USN001", [sq_id], marks_zero) is False
    
    marks_none = {}
    assert is_absent_for_exam("USN001", [sq_id], marks_none) is True
    print("✅ DETAINED-003: Passed")


def test_detained_004_exclusion_rules():
    """DETAINED-004: Context-specific exclusion"""
    exclude, reason = get_exclusion_status(
        usn="USN001",
        student_status="DETAINED",
        exam_sub_question_ids=[],
        student_question_marks={},
        context="CO_ATTAINMENT"
    )
    assert exclude is True
    
    exclude, reason = get_exclusion_status(
        usn="USN001",
        student_status="DETAINED",
        exam_sub_question_ids=[],
        student_question_marks={},
        context="INDIVIDUAL_REPORT"
    )
    assert exclude is False
    print("✅ DETAINED-004: Passed")


def test_scale_001_absent_one_internal():
    """SCALE-001: Absent in one internal -> use available"""
    result = compute_best_internal(
        int1_marks=None,
        int2_marks=Decimal("30"),
    )
    assert result.best_raw == Decimal("30")
    assert result.best_scaled == Decimal("15")
    assert result.is_complete is True
    print("✅ SCALE-001: Passed")


def test_scale_002_absent_both_internals():
    """SCALE-002: Absent in both -> 0 with warning"""
    result = compute_best_internal(
        int1_marks=None,
        int2_marks=None,
    )
    assert result.best_raw == Decimal("0")
    assert result.is_complete is False
    assert WarningCode.NO_INTERNAL_APPEARANCE in [w.code for w in result.warnings]
    print("✅ SCALE-002: Passed")


def test_scale_003_one_not_conducted():
    """SCALE-003: One internal not conducted -> use existing"""
    result = compute_best_internal(
        int1_marks=None,
        int2_marks=Decimal("25"),
        int1_exists=False,
        int2_exists=True,
    )
    assert result.best_raw == Decimal("25")
    assert WarningCode.INT1_NOT_CONDUCTED in [w.code for w in result.warnings]
    print("✅ SCALE-003: Passed")


def test_scale_004_partial_evaluation():
    """SCALE-004: Partial evaluation -> compute with warning"""
    result = compute_internal_total(
        best_exam_scaled=Decimal("15"),
        assignment_1=Decimal("4"),
        assignment_2=None,
        attendance=Decimal("5"),
        activity=None,
    )
    assert result.total == Decimal("24")
    assert result.is_complete is False
    print("✅ SCALE-004: Passed")


def test_backlog_001_internal_frozen():
    """BACKLOG-001: Internal marks FROZEN from first attempt"""
    attempts = [
        AttemptData(attempt_number=1, internal=Decimal("25"), external=Decimal("20"), is_backlog=False),
        AttemptData(attempt_number=2, internal=Decimal("30"), external=Decimal("40"), is_backlog=True),
    ]
    result = get_result_marks(attempts)
    assert result.internal == Decimal("25")
    assert result.frozen_from_attempt == 1
    print("✅ BACKLOG-001: Passed")


def test_backlog_002_best_external():
    """BACKLOG-002: External = HIGHEST across attempts"""
    attempts = [
        AttemptData(attempt_number=1, internal=Decimal("25"), external=Decimal("20"), is_backlog=False),
        AttemptData(attempt_number=2, internal=Decimal("25"), external=Decimal("35"), is_backlog=True),
        AttemptData(attempt_number=3, internal=Decimal("25"), external=Decimal("30"), is_backlog=True),
    ]
    result = get_result_marks(attempts)
    assert result.external == Decimal("35")
    assert result.best_external_attempt == 2
    print("✅ BACKLOG-002: Passed")


def test_backlog_003_total():
    """BACKLOG-003: Total = Frozen internal + Best external"""
    attempts = [
        AttemptData(attempt_number=1, internal=Decimal("28"), external=Decimal("15"), is_backlog=False),
        AttemptData(attempt_number=2, internal=Decimal("28"), external=Decimal("42"), is_backlog=True),
    ]
    result = get_result_marks(attempts)
    assert result.total == Decimal("70")
    print("✅ BACKLOG-003: Passed")


def test_level_001_standard_thresholds():
    """LEVEL-001: NBA standard levels 70/55/40"""
    assert classify_attainment_static(Decimal("75")) == 3
    assert classify_attainment_static(Decimal("70")) == 3
    assert classify_attainment_static(Decimal("69")) == 2
    assert classify_attainment_static(Decimal("55")) == 2
    assert classify_attainment_static(Decimal("54")) == 1
    assert classify_attainment_static(Decimal("40")) == 1
    assert classify_attainment_static(Decimal("39")) == 0
    print("✅ LEVEL-001: Passed")


def test_level_002_custom_thresholds():
    """LEVEL-002: Institution can override thresholds"""
    custom = AttainmentThresholds(
        level_3_threshold=Decimal("80"),
        level_2_threshold=Decimal("60"),
        level_1_threshold=Decimal("50"),
    )
    
    assert classify_attainment_static(Decimal("85"), custom) == 3
    assert classify_attainment_static(Decimal("75"), custom) == 2
    assert classify_attainment_static(Decimal("55"), custom) == 1
    assert classify_attainment_static(Decimal("45"), custom) == 0
    print("✅ LEVEL-002: Passed")


def test_level_003_historical_retention():
    """LEVEL-003: Old batches retain thresholds"""
    program_id = uuid4()
    
    config = {
        program_id: {
            2020: AttainmentThresholds(
                level_3_threshold=Decimal("60"),
                level_2_threshold=Decimal("50"),
                level_1_threshold=Decimal("40"),
            ),
            2023: AttainmentThresholds(
                level_3_threshold=Decimal("70"),
                level_2_threshold=Decimal("55"),
                level_1_threshold=Decimal("45"),
            ),
        }
    }
    
    level_2021 = classify_attainment(Decimal("65"), program_id, 2021, config)
    assert level_2021 == 3
    
    level_2024 = classify_attainment(Decimal("65"), program_id, 2024, config)
    assert level_2024 == 2
    print("✅ LEVEL-003: Passed")


def test_best_n_selection():
    """Section Best-N picks highest N scores"""
    result = get_section_marks_with_selection(
        question_marks=[Decimal("2"), Decimal("4"), Decimal("3"), Decimal("1")],
        question_max_marks=[Decimal("4"), Decimal("4"), Decimal("4"), Decimal("4")],
        selection_mode="BEST_N",
        required_questions=2
    )
    assert result.section_marks == Decimal("7")
    assert result.section_max == Decimal("8")
    print("✅ Best-N selection: Passed")


def test_first_n_selection():
    """Section FIRST_N picks first N questions"""
    result = get_section_marks_with_selection(
        question_marks=[Decimal("2"), Decimal("4"), Decimal("3"), Decimal("1")],
        question_max_marks=[Decimal("4"), Decimal("4"), Decimal("4"), Decimal("4")],
        selection_mode="FIRST_N",
        required_questions=2
    )
    assert result.section_marks == Decimal("6")
    print("✅ FIRST_N selection: Passed")


def test_grading():
    """Grade assignment based on rules"""
    rules = [
        GradingRule(Decimal("90"), Decimal("100"), "S", Decimal("10")),
        GradingRule(Decimal("80"), Decimal("89"), "A", Decimal("9")),
        GradingRule(Decimal("70"), Decimal("79"), "B", Decimal("8")),
    ]
    criteria = PassCriteria(Decimal("16"), Decimal("24"))
    
    grade = compute_grade(Decimal("85"), Decimal("28"), Decimal("57"), rules, criteria)
    assert grade.grade == "A"
    assert grade.grade_point == Decimal("9")
    assert grade.passed is True
    print("✅ Grading: Passed")


def test_sgpa():
    """SGPA = Σ(credit × GP) / Σ(credit)"""
    subjects = [
        SubjectResult("CS101", Decimal("4"), "A", Decimal("9"), True),
        SubjectResult("CS102", Decimal("3"), "B", Decimal("8"), True),
        SubjectResult("CS103", Decimal("3"), "S", Decimal("10"), True),
    ]
    result = compute_sgpa(subjects)
    assert result.sgpa == Decimal("9")
    print("✅ SGPA: Passed")


def test_cgpa():
    """CGPA from semester SGPAs"""
    semesters = [
        SemesterSGPA(1, Decimal("8.0"), Decimal("20"), 6, 0),
        SemesterSGPA(2, Decimal("8.5"), Decimal("22"), 7, 0),
    ]
    result = compute_cgpa(semesters)
    assert result.cgpa == Decimal("8.26")
    print("✅ CGPA: Passed")


def test_co_max_marks():
    """CO max marks with section adjustment"""
    section_id = uuid4()
    sub_questions = [
        {"id": uuid4(), "max_marks": Decimal("4"), "section_id": section_id, "question_id": uuid4()},
        {"id": uuid4(), "max_marks": Decimal("4"), "section_id": section_id, "question_id": uuid4()},
        {"id": uuid4(), "max_marks": Decimal("4"), "section_id": section_id, "question_id": uuid4()},
        {"id": uuid4(), "max_marks": Decimal("4"), "section_id": section_id, "question_id": uuid4()},
    ]
    
    max_marks = compute_co_max_marks(
        sub_questions,
        {section_id: {"selection_mode": "BEST_N", "required_questions": 2}}
    )
    assert max_marks == Decimal("8")
    print("✅ CO Max Marks: Passed")


def test_co_attainment():
    """CO attainment with threshold"""
    co_id = uuid4()
    result = compute_co_attainment(
        co_id=co_id,
        co_threshold=Decimal("60"),
        exam_category="INTERNAL",
        valid_usns=["USN001", "USN002", "USN003"],
        student_marks={
            "USN001": Decimal("25"),
            "USN002": Decimal("15"),
            "USN003": Decimal("30"),
        },
        max_marks=Decimal("40")
    )
    # USN001: 25/40 = 62.5% >= 60% ✓
    # USN002: 15/40 = 37.5% < 60%
    # USN003: 30/40 = 75% >= 60% ✓
    assert result.appeared_students == 3
    assert result.passing_students == 2
    print("✅ CO Attainment: Passed")


def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("EduMetrics Computation Layer - Test Suite")
    print("=" * 60)
    print()
    
    # DETAINED tests
    test_detained_001_detained_status()
    test_detained_002_absent_identification()
    test_detained_003_null_vs_zero()
    test_detained_004_exclusion_rules()
    print()
    
    # SCALE tests
    test_scale_001_absent_one_internal()
    test_scale_002_absent_both_internals()
    test_scale_003_one_not_conducted()
    test_scale_004_partial_evaluation()
    print()
    
    # BACKLOG tests
    test_backlog_001_internal_frozen()
    test_backlog_002_best_external()
    test_backlog_003_total()
    print()
    
    # LEVEL tests
    test_level_001_standard_thresholds()
    test_level_002_custom_thresholds()
    test_level_003_historical_retention()
    print()
    
    # Selection tests
    test_best_n_selection()
    test_first_n_selection()
    print()
    
    # Grading tests
    test_grading()
    test_sgpa()
    test_cgpa()
    print()
    
    # CO/PO tests
    test_co_max_marks()
    test_co_attainment()
    print()
    
    print("=" * 60)
    print("🎉 ALL TESTS PASSED!")
    print("=" * 60)


if __name__ == "__main__":
    run_all_tests()
