"""
EduMetrics Computation Layer - Test Suite

Tests for all LOCKED RULES and COMPUTATION INVARIANTS from Phase-2A design.

Test Categories:
1. DETAINED-001 to DETAINED-004: Detention and absence logic
2. SCALE-001 to SCALE-004: Internal exam scaling edge cases
3. BACKLOG-001 to BACKLOG-004: Backlog handling rules
4. CO-DENOM-001, CO-MAX-001 to CO-MAX-004: CO attainment
5. LEVEL-001 to LEVEL-003: Attainment classification
6. NULL vs 0 semantics
7. Best-N question selection
"""
import pytest
from decimal import Decimal
from uuid import uuid4

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


# =============================================================================
# DETAINED-001 to DETAINED-004: Detention and Absence Tests
# =============================================================================

class TestDetainedIdentification:
    """Tests for LOCKED RULE: DETAINED-001"""
    
    def test_detained_status(self):
        """DETAINED-001: students.status = 'DETAINED' is detained"""
        assert is_detained("DETAINED") is True
    
    def test_active_status_not_detained(self):
        """DETAINED-001: ACTIVE status is not detained"""
        assert is_detained("ACTIVE") is False
    
    def test_withdrawn_status_not_detained(self):
        """DETAINED-001: WITHDRAWN status is not detained"""
        assert is_detained("WITHDRAWN") is False
    
    def test_none_status_not_detained(self):
        """DETAINED-001: None status is not detained"""
        assert is_detained(None) is False


class TestAbsentIdentification:
    """Tests for LOCKED RULE: DETAINED-002 and DETAINED-003"""
    
    def test_no_marks_means_absent(self):
        """DETAINED-002: No records in student_question_marks = absent"""
        sq_ids = [uuid4(), uuid4()]
        marks = {}  # No marks at all
        assert is_absent_for_exam("USN001", sq_ids, marks) is True
    
    def test_has_marks_means_appeared(self):
        """DETAINED-002: At least one mark = appeared"""
        sq_id = uuid4()
        marks = {("USN001", sq_id): Decimal("5")}
        assert is_absent_for_exam("USN001", [sq_id], marks) is False
    
    def test_zero_marks_is_not_absent(self):
        """DETAINED-003: 0 marks (row exists) = attempted, scored zero"""
        sq_id = uuid4()
        marks = {("USN001", sq_id): Decimal("0")}  # 0 is not None
        assert is_absent_for_exam("USN001", [sq_id], marks) is False
    
    def test_null_vs_zero_distinction(self):
        """DETAINED-003: NULL (no row) != 0 (row with marks=0)"""
        sq_id1 = uuid4()
        sq_id2 = uuid4()
        
        # Student with zero marks (appeared)
        marks_zero = {("USN001", sq_id1): Decimal("0")}
        assert is_absent_for_exam("USN001", [sq_id1], marks_zero) is False
        
        # Student with no row (absent)
        marks_none = {}  # No row for this student
        assert is_absent_for_exam("USN001", [sq_id1], marks_none) is True


class TestExclusionRules:
    """Tests for LOCKED RULE: DETAINED-004"""
    
    def test_detained_excluded_from_co_attainment(self):
        """DETAINED-004: Detained excluded from CO attainment"""
        exclude, reason = get_exclusion_status(
            usn="USN001",
            student_status="DETAINED",
            exam_sub_question_ids=[uuid4()],
            student_question_marks={},
            context="CO_ATTAINMENT"
        )
        assert exclude is True
        assert reason == "detained"
    
    def test_detained_excluded_from_sgpa(self):
        """DETAINED-004: Detained excluded from SGPA"""
        exclude, reason = get_exclusion_status(
            usn="USN001",
            student_status="DETAINED",
            exam_sub_question_ids=[],
            student_question_marks={},
            context="SGPA"
        )
        assert exclude is True
    
    def test_absent_included_in_sgpa_as_zero(self):
        """DETAINED-004: Absent students included in SGPA as 0"""
        exclude, reason = get_exclusion_status(
            usn="USN001",
            student_status="ACTIVE",
            exam_sub_question_ids=[uuid4()],
            student_question_marks={},  # No marks = absent
            context="SGPA"
        )
        assert exclude is False
    
    def test_detained_included_in_individual_report(self):
        """DETAINED-004: Detained included in individual reports"""
        exclude, reason = get_exclusion_status(
            usn="USN001",
            student_status="DETAINED",
            exam_sub_question_ids=[],
            student_question_marks={},
            context="INDIVIDUAL_REPORT"
        )
        assert exclude is False


# =============================================================================
# SCALE-001 to SCALE-004: Internal Exam Scaling Tests
# =============================================================================

class TestInternalScaling:
    """Tests for LOCKED RULES: SCALE-001 to SCALE-004"""
    
    def test_scale_001_absent_one_internal(self):
        """SCALE-001: Student absent in one internal -> use available"""
        result = compute_best_internal(
            int1_marks=None,  # Absent
            int2_marks=Decimal("30"),
        )
        assert result.best_raw == Decimal("30")
        assert result.best_scaled == Decimal("15")  # 30/40 * 20
        assert result.is_complete is True
    
    def test_scale_001_null_not_zero(self):
        """SCALE-001: NULL is 'did not appear', NOT 0"""
        # If NULL was treated as 0, best would be 20
        # But NULL means skip, so best is 20
        result = compute_best_internal(
            int1_marks=Decimal("20"),
            int2_marks=None,  # Absent, not 0
        )
        assert result.best_raw == Decimal("20")
        # Would be wrong if None was treated as 0 and max(20, 0) picked wrong
    
    def test_scale_002_absent_both_internals(self):
        """SCALE-002: Student absent in both internals -> 0 with warning"""
        result = compute_best_internal(
            int1_marks=None,
            int2_marks=None,
        )
        assert result.best_raw == Decimal("0")
        assert result.is_complete is False
        assert WarningCode.NO_INTERNAL_APPEARANCE in [w.code for w in result.warnings]
    
    def test_scale_003_one_internal_not_conducted(self):
        """SCALE-003: One internal cancelled -> use the one that exists"""
        result = compute_best_internal(
            int1_marks=None,
            int2_marks=Decimal("25"),
            int1_exists=False,  # Not conducted
            int2_exists=True,
        )
        assert result.best_raw == Decimal("25")
        assert WarningCode.INT1_NOT_CONDUCTED in [w.code for w in result.warnings]
    
    def test_scale_004_partial_evaluation(self):
        """SCALE-004: Partial evaluation -> compute with warning"""
        # This is handled by internal_total when components are missing
        result = compute_internal_total(
            best_exam_scaled=Decimal("15"),
            assignment_1=Decimal("4"),
            assignment_2=None,  # Missing
            attendance=Decimal("5"),
            activity=None,  # Missing
        )
        assert result.total == Decimal("24")  # 15 + 4 + 0 + 5 + 0
        assert result.is_complete is False
        assert WarningCode.MISSING_ASSIGNMENT_2 in [w.code for w in result.warnings]
        assert WarningCode.MISSING_ACTIVITY in [w.code for w in result.warnings]


class TestBestInternal:
    """Additional tests for best internal computation"""
    
    def test_best_of_two_both_present(self):
        """Normal case: both internals present, pick best"""
        result = compute_best_internal(
            int1_marks=Decimal("32"),
            int2_marks=Decimal("28"),
        )
        assert result.best_raw == Decimal("32")
        assert result.best_scaled == Decimal("16")  # 32/40 * 20
    
    def test_scaling_formula(self):
        """Verify scaling formula: (raw/40) * 20"""
        assert scale_internal_exam(Decimal("40")) == Decimal("20")
        assert scale_internal_exam(Decimal("20")) == Decimal("10")
        assert scale_internal_exam(Decimal("0")) == Decimal("0")


# =============================================================================
# BACKLOG-001 to BACKLOG-004: Backlog Tests
# =============================================================================

class TestBacklogRules:
    """Tests for LOCKED RULES: BACKLOG-001 to BACKLOG-004"""
    
    def test_backlog_001_internal_frozen(self):
        """BACKLOG-001: Internal marks FROZEN from first attempt"""
        attempts = [
            AttemptData(attempt_number=1, internal=Decimal("25"), external=Decimal("20"), is_backlog=False),
            AttemptData(attempt_number=2, internal=Decimal("30"), external=Decimal("40"), is_backlog=True),
        ]
        result = get_result_marks(attempts)
        assert result.internal == Decimal("25")  # From attempt 1, not 30
        assert result.frozen_from_attempt == 1
    
    def test_backlog_002_best_external(self):
        """BACKLOG-002: External = HIGHEST across all attempts"""
        attempts = [
            AttemptData(attempt_number=1, internal=Decimal("25"), external=Decimal("20"), is_backlog=False),
            AttemptData(attempt_number=2, internal=Decimal("25"), external=Decimal("35"), is_backlog=True),
            AttemptData(attempt_number=3, internal=Decimal("25"), external=Decimal("30"), is_backlog=True),
        ]
        result = get_result_marks(attempts)
        assert result.external == Decimal("35")  # Best of 20, 35, 30
        assert result.best_external_attempt == 2
    
    def test_backlog_003_total_calculation(self):
        """BACKLOG-003: Total = Frozen internal + Best external"""
        attempts = [
            AttemptData(attempt_number=1, internal=Decimal("28"), external=Decimal("15"), is_backlog=False),
            AttemptData(attempt_number=2, internal=Decimal("28"), external=Decimal("42"), is_backlog=True),
        ]
        result = get_result_marks(attempts)
        assert result.internal == Decimal("28")  # Frozen
        assert result.external == Decimal("42")  # Best
        assert result.total == Decimal("70")  # 28 + 42
    
    def test_backlog_flag_single_attempt(self):
        """Single attempt is not a backlog"""
        attempts = [
            AttemptData(attempt_number=1, internal=Decimal("30"), external=Decimal("45"), is_backlog=False),
        ]
        result = get_result_marks(attempts)
        assert result.is_backlog is False
        assert result.attempt_count == 1
    
    def test_backlog_flag_multiple_attempts(self):
        """Multiple attempts flag as backlog"""
        attempts = [
            AttemptData(attempt_number=1, internal=Decimal("30"), external=Decimal("20"), is_backlog=False),
            AttemptData(attempt_number=2, internal=Decimal("30"), external=Decimal("45"), is_backlog=True),
        ]
        result = get_result_marks(attempts)
        assert result.is_backlog is True
        assert WarningCode.MULTIPLE_ATTEMPTS in [w.code for w in result.warnings]
        assert WarningCode.INTERNAL_FROZEN in [w.code for w in result.warnings]


# =============================================================================
# CO-DENOM-001, CO-MAX-001 to CO-MAX-004: CO Attainment Tests
# =============================================================================

class TestCODenominator:
    """Tests for LOCKED RULE: CO-DENOM-001"""
    
    def test_denominator_appeared_only(self):
        """CO-DENOM-001: Denominator = appeared students only"""
        co_id = uuid4()
        
        # Only 2 students have marks (appeared)
        valid_usns = ["USN001", "USN002"]  # Pre-filtered by attendance
        student_marks = {
            "USN001": Decimal("25"),
            "USN002": Decimal("15"),
        }
        
        result = compute_co_attainment(
            co_id=co_id,
            co_threshold=Decimal("60"),
            exam_category="INTERNAL",
            valid_usns=valid_usns,
            student_marks=student_marks,
            max_marks=Decimal("40")
        )
        
        assert result.appeared_students == 2  # Not 10 (enrolled)


class TestCOMaxMarks:
    """Tests for LOCKED RULES: CO-MAX-001 to CO-MAX-004"""
    
    def test_max_marks_all_section(self):
        """CO-MAX-001/002: Max marks with selection_mode = ALL"""
        sq1 = {"id": uuid4(), "max_marks": Decimal("10"), "section_id": uuid4(), "question_id": uuid4()}
        sq2 = {"id": uuid4(), "max_marks": Decimal("10"), "section_id": sq1["section_id"], "question_id": uuid4()}
        
        max_marks = compute_co_max_marks(
            co_sub_questions=[sq1, sq2],
            section_configs={sq1["section_id"]: {"selection_mode": "ALL", "required_questions": 2}}
        )
        
        assert max_marks == Decimal("20")
    
    def test_max_marks_best_n(self):
        """CO-MAX-002: Max marks with BEST_N = top N max marks"""
        section_id = uuid4()
        sub_questions = [
            {"id": uuid4(), "max_marks": Decimal("4"), "section_id": section_id, "question_id": uuid4()},
            {"id": uuid4(), "max_marks": Decimal("4"), "section_id": section_id, "question_id": uuid4()},
            {"id": uuid4(), "max_marks": Decimal("4"), "section_id": section_id, "question_id": uuid4()},
            {"id": uuid4(), "max_marks": Decimal("4"), "section_id": section_id, "question_id": uuid4()},
            {"id": uuid4(), "max_marks": Decimal("4"), "section_id": section_id, "question_id": uuid4()},
            {"id": uuid4(), "max_marks": Decimal("4"), "section_id": section_id, "question_id": uuid4()},
        ]
        
        max_marks = compute_co_max_marks(
            co_sub_questions=sub_questions,
            section_configs={section_id: {"selection_mode": "BEST_N", "required_questions": 4}}
        )
        
        # Top 4 × 4 marks = 16
        assert max_marks == Decimal("16")
    
    def test_unanswered_optional_zero_obtained(self):
        """CO-MAX-004: Unanswered optional = 0 obtained, max unchanged"""
        # When student doesn't answer optional Q, they get 0
        # But max marks remains what could have been scored
        result = get_section_marks_with_selection(
            question_marks=[Decimal("4"), Decimal("3"), None, None, Decimal("2"), None],
            question_max_marks=[Decimal("4"), Decimal("4"), Decimal("4"), Decimal("4"), Decimal("4"), Decimal("4")],
            selection_mode="BEST_N",
            required_questions=4
        )
        
        # Best 4: 4, 3, 2, 0 (None treated as 0) = 9
        # Max = top 4 × 4 = 16
        assert result.section_max == Decimal("16")


# =============================================================================
# LEVEL-001 to LEVEL-003: Attainment Classification Tests
# =============================================================================

class TestAttainmentLevels:
    """Tests for LOCKED RULES: LEVEL-001 to LEVEL-003"""
    
    def test_level_001_standard_thresholds(self):
        """LEVEL-001: NBA standard levels 70/55/40"""
        assert classify_attainment_static(Decimal("75")) == 3
        assert classify_attainment_static(Decimal("70")) == 3
        assert classify_attainment_static(Decimal("69")) == 2
        assert classify_attainment_static(Decimal("55")) == 2
        assert classify_attainment_static(Decimal("54")) == 1
        assert classify_attainment_static(Decimal("40")) == 1
        assert classify_attainment_static(Decimal("39")) == 0
        assert classify_attainment_static(Decimal("0")) == 0
    
    def test_level_002_custom_thresholds(self):
        """LEVEL-002: Institution can override thresholds"""
        custom = AttainmentThresholds(
            level_3_threshold=Decimal("80"),
            level_2_threshold=Decimal("60"),
            level_1_threshold=Decimal("50"),
        )
        
        assert classify_attainment_static(Decimal("85"), custom) == 3
        assert classify_attainment_static(Decimal("75"), custom) == 2  # Would be 3 with defaults
        assert classify_attainment_static(Decimal("55"), custom) == 1  # Would be 2 with defaults
        assert classify_attainment_static(Decimal("45"), custom) == 0  # Would be 1 with defaults
    
    def test_level_003_historical_retention(self):
        """LEVEL-003: Old batches retain their effective thresholds"""
        program_id = uuid4()
        
        # Config: 2020 and 2023 thresholds differ
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
        
        # 2021 cohort uses 2020 config (most recent <= cohort_year)
        level_2021 = classify_attainment(
            Decimal("65"),
            program_id,
            cohort_year=2021,
            config_lookup=config
        )
        assert level_2021 == 3  # 65 >= 60 (2020 threshold)
        
        # 2024 cohort uses 2023 config
        level_2024 = classify_attainment(
            Decimal("65"),
            program_id,
            cohort_year=2024,
            config_lookup=config
        )
        assert level_2024 == 2  # 65 < 70 but >= 55 (2023 threshold)


# =============================================================================
# Section Best-N Selection Tests
# =============================================================================

class TestSectionSelection:
    """Tests for section selection modes"""
    
    def test_best_n_picks_highest(self):
        """BEST_N picks highest N scores"""
        result = get_section_marks_with_selection(
            question_marks=[Decimal("2"), Decimal("4"), Decimal("3"), Decimal("1")],
            question_max_marks=[Decimal("4"), Decimal("4"), Decimal("4"), Decimal("4")],
            selection_mode="BEST_N",
            required_questions=2
        )
        
        assert result.section_marks == Decimal("7")  # 4 + 3
        assert result.section_max == Decimal("8")  # 4 + 4
    
    def test_first_n_picks_sequential(self):
        """FIRST_N picks first N questions"""
        result = get_section_marks_with_selection(
            question_marks=[Decimal("2"), Decimal("4"), Decimal("3"), Decimal("1")],
            question_max_marks=[Decimal("4"), Decimal("4"), Decimal("4"), Decimal("4")],
            selection_mode="FIRST_N",
            required_questions=2
        )
        
        assert result.section_marks == Decimal("6")  # 2 + 4
        assert result.section_max == Decimal("8")  # 4 + 4
    
    def test_all_sums_everything(self):
        """ALL sums all questions"""
        result = get_section_marks_with_selection(
            question_marks=[Decimal("2"), Decimal("4"), Decimal("3"), Decimal("1")],
            question_max_marks=[Decimal("4"), Decimal("4"), Decimal("4"), Decimal("4")],
            selection_mode="ALL",
            required_questions=4
        )
        
        assert result.section_marks == Decimal("10")  # 2 + 4 + 3 + 1
        assert result.section_max == Decimal("16")


# =============================================================================
# SGPA/CGPA Tests
# =============================================================================

class TestSGPA:
    """Tests for SGPA computation"""
    
    def test_sgpa_formula(self):
        """SGPA = Σ(credit × GP) / Σ(credit)"""
        subjects = [
            SubjectResult(subject_code="CS101", credits=Decimal("4"), grade="A", grade_point=Decimal("9"), passed=True),
            SubjectResult(subject_code="CS102", credits=Decimal("3"), grade="B", grade_point=Decimal("8"), passed=True),
            SubjectResult(subject_code="CS103", credits=Decimal("3"), grade="S", grade_point=Decimal("10"), passed=True),
        ]
        
        result = compute_sgpa(subjects)
        
        # (4×9 + 3×8 + 3×10) / (4 + 3 + 3) = (36 + 24 + 30) / 10 = 90/10 = 9.0
        assert result.sgpa == Decimal("9")
        assert result.total_credits == Decimal("10")
    
    def test_sgpa_with_failure(self):
        """SGPA includes failed subjects with GP 0"""
        subjects = [
            SubjectResult(subject_code="CS101", credits=Decimal("4"), grade="A", grade_point=Decimal("9"), passed=True),
            SubjectResult(subject_code="CS102", credits=Decimal("3"), grade="F", grade_point=Decimal("0"), passed=False),
        ]
        
        result = compute_sgpa(subjects)
        
        # (4×9 + 3×0) / 7 = 36/7 = 5.14
        assert result.subjects_failed == 1
        assert result.is_complete is False


class TestCGPA:
    """Tests for CGPA computation"""
    
    def test_cgpa_formula(self):
        """CGPA = Σ(semester_credits × SGPA) / Σ(semester_credits)"""
        semesters = [
            SemesterSGPA(semester=1, sgpa=Decimal("8.0"), credits=Decimal("20"), subjects_passed=6, subjects_failed=0),
            SemesterSGPA(semester=2, sgpa=Decimal("8.5"), credits=Decimal("22"), subjects_passed=7, subjects_failed=0),
        ]
        
        result = compute_cgpa(semesters)
        
        # (20×8.0 + 22×8.5) / (20 + 22) = (160 + 187) / 42 = 347/42 ≈ 8.26
        assert result.cgpa == Decimal("8.26")


# =============================================================================
# Grading Tests
# =============================================================================

class TestGrading:
    """Tests for grade computation"""
    
    def test_pass_criteria_check(self):
        """Pass requires minimum internal AND external"""
        criteria = PassCriteria(min_internal=Decimal("16"), min_external=Decimal("24"))
        
        # Pass case
        passed, reasons = meets_pass_criteria(Decimal("25"), Decimal("30"), criteria)
        assert passed is True
        
        # Fail internal
        passed, reasons = meets_pass_criteria(Decimal("14"), Decimal("30"), criteria)
        assert passed is False
        assert "Internal" in reasons[0]
        
        # Fail external
        passed, reasons = meets_pass_criteria(Decimal("25"), Decimal("20"), criteria)
        assert passed is False
        assert "External" in reasons[0]
    
    def test_grade_assignment(self):
        """Grade assigned based on total marks"""
        rules = [
            GradingRule(min_marks=Decimal("90"), max_marks=Decimal("100"), grade="S", grade_point=Decimal("10")),
            GradingRule(min_marks=Decimal("80"), max_marks=Decimal("89"), grade="A", grade_point=Decimal("9")),
            GradingRule(min_marks=Decimal("70"), max_marks=Decimal("79"), grade="B", grade_point=Decimal("8")),
        ]
        criteria = PassCriteria(min_internal=Decimal("16"), min_external=Decimal("24"))
        
        result = compute_grade(
            total=Decimal("85"),
            internal=Decimal("28"),
            external=Decimal("57"),
            grading_rules=rules,
            pass_criteria=criteria
        )
        
        assert result.grade == "A"
        assert result.grade_point == Decimal("9")
        assert result.passed is True


# =============================================================================
# Run Tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
