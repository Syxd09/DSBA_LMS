"""
Script to VERIFY the Fix in co_service.py
Usage: python scripts/verify_co_fix.py

Scenario:
- Student attempts 2 questions (Q1, Q2) in a "Best 1" section.
- Q1 = 8 marks, Q2 = 9 marks.
- Both mapped to CO1.
- Expected Result: CO1 Numerator = 9 (Best 1), NOT 17 (Sum).
"""
import unittest
from unittest.mock import MagicMock, patch
from decimal import Decimal
from uuid import uuid4
from datetime import datetime

# Import the function to test
from app.services.analytics.co_service import _compute_offering_co_attainments_sync

class TestCOFix(unittest.TestCase):
    
    @patch('app.services.analytics.co_service.get_offering_cos')
    @patch('app.services.analytics.co_service.get_offering_enrolled_students')
    @patch('app.services.analytics.co_service.get_student_statuses')
    @patch('app.services.analytics.co_service.get_offering_exams')
    @patch('app.services.analytics.co_service.get_all_student_marks_for_exam')
    @patch('app.services.analytics.query_helpers.get_all_sub_questions_for_exams')
    @patch('app.services.analytics.co_service.get_exam_sections')
    def test_fix(self, 
                 mock_get_exam_sections,
                 mock_get_all_sub_questions,
                 mock_get_all_marks,
                 mock_get_exams,
                 mock_get_statuses,
                 mock_get_students,
                 mock_get_cos):
        
        print("\n--- SETTING UP MOCKS ---")
        
        # 1. Setup IDs
        offering_id = uuid4()
        co_id = uuid4()
        exam_id = uuid4()
        sec_id = uuid4()
        sq1_id = uuid4()
        sq2_id = uuid4()
        usn = "TEST_USN"
        
        # 2. Mock COs
        mock_get_cos.return_value = [{
            "co_id": co_id,
            "co_code": "CO1",
            "co_statement": "Test CO",
            "threshold": Decimal("60")
        }]
        
        # 3. Mock Students
        mock_get_students.return_value = [usn]
        mock_get_statuses.return_value = {usn: "active"}
        
        # 4. Mock Exams (Internal)
        mock_exam = MagicMock()
        mock_exam.id = exam_id
        mock_exam.exam_type = "INT1"
        mock_get_exams.return_value = [mock_exam]
        
        # 5. Mock Sections (Best 1)
        mock_section = MagicMock()
        mock_section.id = sec_id
        mock_section.selection_mode = "BEST_N"
        mock_section.required_questions = 1
        mock_get_exam_sections.return_value = [mock_section]
        
        # 6. Mock SubQuestions (Mapped to CO)
        # We need objects with attrs: id, marks, max_marks, section_id, question_id, exam_id
        def make_sq(sid, qid, max_m):
            sq = MagicMock()
            sq.id = sid
            sq.exam_id = exam_id
            sq.section_id = sec_id
            sq.question_id = qid
            sq.max_marks = max_m
            return sq
        
        sq1 = make_sq(sq1_id, uuid4(), Decimal("10"))
        sq2 = make_sq(sq2_id, uuid4(), Decimal("10"))
        
        # Return dict: co_id -> [sq list]
        mock_get_all_sub_questions.return_value = {
            co_id: [sq1, sq2]
        }
        
        # 7. Mock Marks (Q1=8, Q2=9)
        # Format: {(usn, sq_id): mark}
        marks_dict = {
            (usn, sq1_id): Decimal("8"),
            (usn, sq2_id): Decimal("9")
        }
        mock_get_all_marks.return_value = marks_dict
        
        # 8. Run Function
        print("--- RUNNING COMPUTATION ---")
        db = MagicMock()
        response = _compute_offering_co_attainments_sync(db, offering_id)
        
        # 9. Verify
        print("--- VERIFYING ---")
        self.assertTrue(response.is_complete)
        data = response.data
        
        # Find CO1 result
        co_result = next(c for c in data.cos if c.co_id == co_id)
        internal_att = co_result.internal_attainment
        
        print(f"Internal Attainment %: {internal_att.percentage}")
        
        # Calculation Check:
        # Max Marks (Denominator) = 10 (Best 1 of 10, 10)
        # Obtained (Numerator) should be 9 (Best 1 of 8, 9) because of our FIX.
        # Original Buggy Logic would sum 8+9 = 17.
        
        # The test should verify the STUDENT'S percentage, not the class attainment
        student_score = internal_att.student_scores[0]
        print(f"Student Score Obtained: {student_score.obtained}")
        print(f"Student Score Percentage: {student_score.percentage}")
        
        # Expected: Obtained 9, Max 10 -> 90%
        if student_score.percentage > 90:
             print("🔴 FAIL: Student Score > 90%")
        elif student_score.percentage == Decimal("90"):
             print("🟢 PASS: Student Score is 90%")
             
        self.assertEqual(student_score.percentage, Decimal("90"))

if __name__ == '__main__':
    unittest.main()
