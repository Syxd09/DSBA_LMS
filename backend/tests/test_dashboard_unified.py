"""
EduMetrics Backend - Unified Dashboard Tests
Verifies that dashboard endpoints correctly consume the unified analytics pipeline.
"""
import pytest
from uuid import uuid4
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.main import app
from app.database import get_db
from app.models import (
    Profile, UserRole, Department, Program, Cohort, Subject, 
    SubjectOffering, TeacherAssignment, Student, StudentEnrollment,
    Exam, ExamSection, Question, SubQuestion, StudentMarks, StudentQuestionMark,
    CourseOutcome
)
from app.core.security import create_access_token

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def db_session():
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()

def create_user_token(db: Session, role: str, email_prefix: str, uid: str = None):
    """Helper to create user and token."""
    if not uid:
        uid = uuid4()
    
    email = f"{email_prefix}_{uuid4().hex[:6]}@test.com"
    profile = Profile(
        id=uuid4(),
        user_id=uid,
        email=email,
        full_name=f"Test {role}",
    )
    db.add(profile)
    db.add(UserRole(id=uuid4(), user_id=uid, role=role))
    db.commit()
    
    return create_access_token({"sub": str(uid), "role": role.lower()}), profile

class TestUnifiedDashboard:
    """Tests for refactored dashboard.py endpoints."""
    
    @pytest.fixture
    def setup_data(self, db_session):
        """Setup full academic data."""
        # 1. Dept & Prog
        dept = Department(id=uuid4(), name="Unified Dept", code=f"UD_{uuid4().hex[:4]}")
        db_session.add(dept)
        
        prog = Program(id=uuid4(), name="Unified Prog", code=f"UP_{uuid4().hex[:4]}", department_id=dept.id)
        db_session.add(prog)
        
        # 2. Cohort
        cohort = Cohort(id=uuid4(), name="2025-Unified", program_id=prog.id, year=2025)
        db_session.add(cohort)
        
        # 3. Subject & Offering
        subject = Subject(id=uuid4(), code="UNIF101", name="Unified Subject", credits=4)
        db_session.add(subject)
        
        offering = SubjectOffering(
            id=uuid4(), cohort_id=cohort.id, subject_id=subject.id, 
            program_id=prog.id, semester_no=1, regulation_year=2021
        )
        db_session.add(offering)
        
        # 4. Users
        # Principal
        token_p, _ = create_user_token(db_session, "PRINCIPAL", "principal")
        
        # HOD (Assigned to Dept)
        hod_uid = uuid4()
        token_h, hod = create_user_token(db_session, "HOD", "hod", uid=hod_uid)
        dept.hod_id = hod_uid
        
        # Teacher (Assigned to Offering)
        token_t, teacher = create_user_token(db_session, "TEACHER", "teacher")
        db_session.add(TeacherAssignment(
            id=uuid4(), teacher_id=teacher.user_id, 
            offering_id=offering.id, cohort_id=cohort.id, 
            subject_id=subject.id, academic_year=2025
        ))
        
        # Student
        token_s, student_profile = create_user_token(db_session, "STUDENT", "student")
        student = Student(usn=f"UNIF{uuid4().hex[:4]}", name="Student Unified", cohort_id=cohort.id, user_id=student_profile.user_id)
        db_session.add(student)
        db_session.add(StudentEnrollment(id=uuid4(), student_id=student.user_id, usn=student.usn, status="active", cohort_id=cohort.id, roll_number=student.usn))
        
        db_session.commit()
        
        # 5. Exam & Marks
        exam = Exam(
            id=uuid4(), exam_type="IA1", status="published", 
            cohort_id=cohort.id, subject_id=subject.id, offering_id=offering.id,
            max_marks=20
        )
        db_session.add(exam)
        
        sec = ExamSection(
            id=uuid4(), exam_id=exam.id, name="A", max_marks=20, 
            max_questions=1, required_questions=1, selection_mode="ALL", sequence=1
        )
        db_session.add(sec)
        
        # CO
        co1 = CourseOutcome(
            id=uuid4(), offering_id=offering.id, co_code="CO1", 
            co_number=1, description="Test CO", threshold=50.0
        )
        db_session.add(co1)

        q1 = Question(id=uuid4(), section_id=sec.id, max_marks=20, sequence=1, co_id=co1.id)
        db_session.add(q1)
        
        sq1 = SubQuestion(id=uuid4(), question_id=q1.id, max_marks=20, label="a", co_id=co1.id)
        db_session.add(sq1)
        
        # Marks
        db_session.add(StudentQuestionMark(id=uuid4(), exam_id=exam.id, usn=student.usn, sub_question_id=sq1.id, marks=15)) # 75%
        
        db_session.commit()
        
        return {
            "token_p": token_p,
            "token_h": token_h,
            "token_t": token_t,
            "token_s": token_s,
            "dept_id": str(dept.id),
            "subject_id": str(subject.id),
            "exam_id": str(exam.id),
            "student_usn": student.usn,
            "student_id": str(student.user_id),
        }

    def test_principal_dashboard(self, client, setup_data):
        """Test Principal Dashboard (uses PrincipalAnalyticsService)."""
        res = client.get(
            "/api/v1/dashboard/principal",
            headers={"Authorization": f"Bearer {setup_data['token_p']}"}
        )
        assert res.status_code == 200
        data = res.json()
        
        # Verify fields populated by Service
        assert data["total_departments"] >= 1
        assert "department_stats" in data
        
        # Verify refactored stats
        # We added 1 student with 75% -> pass
        # dept stats should show this
        dept_stats = next((d for d in data["department_stats"] if d["id"] == setup_data["dept_id"]), None)
        assert dept_stats is not None
        assert dept_stats["students"] >= 1
        assert dept_stats["pass_percentage"] == 100.0
        assert dept_stats["average_score"] == 75.0

    def test_hod_dashboard(self, client, setup_data):
        """Test HOD Dashboard (uses mixed services)."""
        res = client.get(
            "/api/v1/dashboard/hod",
            headers={"Authorization": f"Bearer {setup_data['token_h']}"}
        )
        assert res.status_code == 200
        data = res.json()
        
        assert data["department_students"] >= 1
        assert data["pass_rate"] == 100.0
        assert len(data["subject_performance"]) > 0
        subj = data["subject_performance"][0]
        assert subj["average"] == 75.0

    def test_teacher_dashboard(self, client, setup_data):
        """Test Teacher Dashboard (uses marks_service)."""
        res = client.get(
            "/api/v1/dashboard/teacher",
            headers={"Authorization": f"Bearer {setup_data['token_t']}"}
        )
        assert res.status_code == 200
        data = res.json()
        
        assert data["assigned_subjects"] == 1
        assert data["class_average"] == 75.0

    def test_student_dashboard(self, client, setup_data):
        """Test Student Dashboard (uses marks_service)."""
        res = client.get(
            "/api/v1/dashboard/student",
            headers={"Authorization": f"Bearer {setup_data['token_s']}"}
        )
        assert res.status_code == 200
        data = res.json()
        
        assert data["overall_average"] == 75.0
        assert len(data["results"]) > 0
        subj = data["results"][0]
        assert subj["percentage"] == 75.0

    def test_direct_marks_service(self, db_session, setup_data):
        """Debug: Test marks_service directly."""
        from app.services.analytics import marks_service
        
        exam_id = setup_data["exam_id"]
        student_usn = setup_data["student_usn"]
        
        # Verify marks computation
        total, _ = marks_service.compute_exam_marks(db_session, exam_id, student_usn)
        
        assert total == 15.0
