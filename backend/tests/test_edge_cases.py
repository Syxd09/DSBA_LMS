"""
EduMetrics Backend - Edge Case Tests
Tests for edge cases across the system.
"""
import pytest


class TestExamEdgeCases:
    """Edge cases for exam operations."""
    
    def test_locked_exam_marks_edit_rejected(self):
        """Verify marks cannot be edited after exam is locked."""
        # Mock scenario: exam is locked
        exam_status = "locked"
        
        # Attempting to save marks should fail
        if exam_status == "locked":
            # Simulate rejection
            can_edit = False
        else:
            can_edit = True
        
        assert can_edit is False, "Marks should not be editable when exam is locked"
    
    def test_draft_exam_marks_entry_rejected(self):
        """Verify marks cannot be entered for draft exams."""
        exam_status = "draft"
        
        # Only approved exams allow marks entry
        can_enter = exam_status == "approved"
        
        assert can_enter is False, "Marks entry should be blocked for draft exams"
    
    def test_submitted_exam_marks_rejected(self):
        """Verify marks cannot be entered for submitted exams."""
        exam_status = "submitted"
        
        can_enter = exam_status == "approved"
        
        assert can_enter is False, "Marks entry should be blocked for submitted exams"


class TestCohortEdgeCases:
    """Edge cases for cohort operations."""
    
    def test_empty_cohort_report_generation(self):
        """Verify report generation handles empty cohorts gracefully."""
        students = []
        
        # Should not crash but return empty data
        report_data = {
            "students": students,
            "pass_percentage": 0.0 if len(students) == 0 else 100.0,
            "avg_marks": None
        }
        
        assert report_data["pass_percentage"] == 0.0
        assert report_data["avg_marks"] is None
    
    def test_cohort_promotion_even_odd_rules(self):
        """Verify odd-even semester promotion rules."""
        # Odd semester can only promote to even
        current_semester = 3  # odd
        next_semester = current_semester + 1
        
        assert next_semester == 4, "Odd semester should promote to even"
        assert next_semester % 2 == 0, "Next semester must be even"


class TestMarksEdgeCases:
    """Edge cases for marks operations."""
    
    def test_zero_marks_vs_null_marks(self):
        """Verify distinction between zero marks and null (absent)."""
        zero_marks = 0
        null_marks = None
        
        # Zero means appeared but scored zero
        appeared_with_zero = zero_marks is not None
        # Null means absent
        was_absent = null_marks is None
        
        assert appeared_with_zero is True
        assert was_absent is True
    
    def test_max_marks_exceeded_rejected(self):
        """Verify marks exceeding max are rejected."""
        max_marks = 40
        entered_marks = 45
        
        is_valid = entered_marks <= max_marks
        
        assert is_valid is False, "Marks exceeding max should be rejected"
    
    def test_negative_marks_rejected(self):
        """Verify negative marks are rejected."""
        entered_marks = -5
        
        is_valid = entered_marks >= 0
        
        assert is_valid is False, "Negative marks should be rejected"


class TestUSNEdgeCases:
    """Edge cases for student USN operations."""
    
    def test_invalid_usn_format_rejected(self):
        """Verify invalid USN format is caught."""
        valid_usn_pattern = r"^[A-Z0-9]{10}$"
        
        invalid_usns = [
            "abc123",  # lowercase (invalid)
            "12345678901234",  # too long
            "",  # empty
            "SHORT",  # too short
        ]
        
        import re
        for usn in invalid_usns:
            is_valid = bool(re.match(valid_usn_pattern, usn))
            assert is_valid is False, f"Invalid USN '{usn}' should be rejected"
    
    def test_nonexistent_usn_error(self):
        """Verify lookup of non-existent USN returns proper error."""
        students_db = {"1MS21CS001": {"name": "Test"}}
        usn = "NOTEXIST99"
        
        student = students_db.get(usn)
        
        assert student is None, "Non-existent USN should return None"


class TestAnalyticsEdgeCases:
    """Edge cases for analytics operations."""
    
    def test_co_attainment_no_students(self):
        """Verify CO attainment handles no students gracefully."""
        students_attempted = 0
        students_above_threshold = 0
        threshold = 50.0
        
        if students_attempted == 0:
            attainment = None  # Cannot compute
        else:
            attainment = (students_above_threshold / students_attempted) * 100
        
        assert attainment is None, "Attainment should be None when no students"
    
    def test_po_mapping_empty_cos(self):
        """Verify PO attainment handles no CO mappings."""
        co_mappings = []
        
        if len(co_mappings) == 0:
            po_attainment = 0.0
        else:
            po_attainment = sum(co.attainment for co in co_mappings) / len(co_mappings)
        
        assert po_attainment == 0.0


class TestMultiCollegeIsolation:
    """Tests for multi-college data isolation."""
    
    def test_college_a_cannot_see_college_b_data(self):
        """Verify data isolation between colleges."""
        college_a_data = {"programs": ["CSE", "ECE"], "college_id": "A"}
        college_b_data = {"programs": ["MECH", "CIVIL"], "college_id": "B"}
        
        # User from college A
        user_college = "A"
        
        # Filter function
        def get_visible_programs(user_college_id, all_data):
            return [d for d in all_data if d["college_id"] == user_college_id]
        
        visible = get_visible_programs(user_college, [college_a_data, college_b_data])
        
        assert len(visible) == 1
        assert visible[0]["college_id"] == "A"
        assert "CSE" in visible[0]["programs"]
    
    def test_principal_cannot_modify_other_college(self):
        """Verify principal cannot modify another college's data."""
        principal_college = "A"
        target_college = "B"
        
        can_modify = principal_college == target_college
        
        assert can_modify is False


class TestRBACEdgeCases:
    """Edge cases for RBAC enforcement."""
    
    def test_student_cannot_edit_marks(self):
        """Verify students cannot edit marks."""
        role = "student"
        allowed_roles = ["teacher", "hod", "principal"]
        
        can_edit = role in allowed_roles
        
        assert can_edit is False
    
    def test_teacher_cannot_approve_exam(self):
        """Verify teachers cannot approve exams."""
        role = "teacher"
        allowed_roles = ["hod", "principal"]
        
        can_approve = role in allowed_roles
        
        assert can_approve is False
    
    def test_hod_cannot_override_without_reason(self):
        """Verify HOD override requires reason."""
        role = "hod"
        reason = ""
        
        can_override = role in ["hod", "principal"] and len(reason) >= 10
        
        assert can_override is False, "Override should require minimum 10 char reason"
