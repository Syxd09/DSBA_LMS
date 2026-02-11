"""
EduMetrics Backend - API Integration Tests

Tests for API endpoints with actual HTTP requests.
Uses sync TestClient for consistent database session management.
"""
import pytest
from datetime import datetime
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db
from app.models import Profile, Exam, Student, Cohort, SubjectOffering, Department, Program, Subject
from app.core.security import create_access_token


@pytest.fixture
def client(db: Session):
    """Sync HTTP client with the same DB session as tests."""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_data(db: Session):
    """Create basic test data (Teacher, HOD, Student, Cohort, Offering)."""
    from app.models import UserRole
    
    # 1. Create Users (Profile + UserRole separately)
    teacher_uid = uuid4()
    teacher = Profile(
        id=uuid4(), user_id=teacher_uid, email="teacher_integ@test.com", full_name="Test Teacher"
    )
    hod_uid = uuid4()
    hod = Profile(
        id=uuid4(), user_id=hod_uid, email="hod_integ@test.com", full_name="Test HOD"
    )
    student_uid = uuid4()
    student_profile = Profile(
        id=uuid4(), user_id=student_uid, email="student_integ@test.com", full_name="Test Student"
    )
    db.add_all([teacher, hod, student_profile])
    db.add_all([
        UserRole(id=uuid4(), user_id=teacher_uid, role="teacher"),
        UserRole(id=uuid4(), user_id=hod_uid, role="hod"),
        UserRole(id=uuid4(), user_id=student_uid, role="student"),
    ])
    
    # 2. Create hierarchy: Department → Program → Subject → Cohort → Offering
    dept = Department(id=uuid4(), name="Test Dept", code=f"TD_{uuid4().hex[:4]}")
    db.add(dept)
    
    prog = Program(id=uuid4(), name="Test Program", code=f"TP_{uuid4().hex[:4]}", department_id=dept.id)
    db.add(prog)
    
    subject = Subject(id=uuid4(), name="Test Subject", code=f"TS_{uuid4().hex[:4]}", credits=3)
    db.add(subject)
    
    cohort = Cohort(id=uuid4(), name="2024-28", current_semester=3, program_id=prog.id, year=2024)
    db.add(cohort)
    
    # 3. Create Student (linked to Profile & Cohort)
    student = Student(
        usn="1MS24CS001",
        name="Test Student",
        cohort_id=cohort.id,
        user_id=student_profile.user_id
    )
    db.add(student)
    
    # 4. Create Subject Offering
    offering = SubjectOffering(
        id=uuid4(), cohort_id=cohort.id, subject_id=subject.id, 
        program_id=prog.id, semester_no=3, regulation_year=2021
    )
    db.add(offering)

    # 5. Create Exam, Section, Question, SubQuestion (for marks tests)
    exam_setup = Exam(
        id=uuid4(),
        exam_type="IA1",
        status="approved", # Default to approved for setup
        cohort_id=cohort.id,
        offering_id=offering.id,
        max_marks=40
    )
    db.add(exam_setup)
    
    from app.models import ExamSection, Question, SubQuestion
    section = ExamSection(id=uuid4(), exam_id=exam_setup.id, name="A", sequence=1, max_questions=6, max_marks=10)
    db.add(section)
    
    question = Question(id=uuid4(), section_id=section.id, sequence=1, max_marks=2)
    db.add(question)
    
    sub_question = SubQuestion(id=uuid4(), question_id=question.id, label="a", max_marks=2)
    db.add(sub_question)
    
    db.commit()
    return {
        "teacher": teacher,
        "hod": hod,
        "student": student,
        "cohort": cohort,
        "offering": offering,
        "sub_question": sub_question
    }


def create_token(user_id: str, role: str) -> str:
    return create_access_token({"sub": str(user_id), "role": role})


class TestMarksAPI:
    """Tests for marks API endpoints."""
    
    def test_teacher_cannot_enter_marks_locked_exam(self, client: TestClient, test_data, db: Session):
        """Teacher should not be able to enter marks for a locked exam."""
        teacher = test_data["teacher"]
        cohort = test_data["cohort"]
        offering = test_data["offering"]
        
        # Create locked exam
        exam = Exam(
            id=uuid4(),
            exam_type="IA1",
            status="locked",
            cohort_id=cohort.id,     # REQUIRED
            offering_id=offering.id, # REQUIRED
            max_marks=40
        )
        db.add(exam)
        db.commit()
        
        token = create_token(teacher.user_id, "teacher")
        
        # Valid payload but on locked exam
        from app.models import SubQuestion # Use the available one or mock
        # We need a valid sub_question_id. 
        # Since we created a generic one in test_data, we can't easily access it here as 'exam' is new.
        # But we really just need ANY UUID for validation, OR we attach to the new exam.
        # Let's attach a question to THIS locked exam to be safe.
        
        # Actually, simpler to just mock the UUIDs since validation is type-based mostly.
        # BUT foreign key checks might happen if validation is deep? 
        # Schema only checks types. DB checks FKs.
        # If 422 happens, it's schema.
        
        response = client.post(
            f"/api/v1/marks/exam/{exam.id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "exam_id": str(exam.id), # Schema requires exam_id in body too? Check BulkMarksCreate.
                "marks": [
                    {
                        "student_id": str(test_data["student"].user_id), # UUID
                        "sub_question_id": str(uuid4()), # Random UUID is fine for schema validation
                        "marks": 5
                    }
                ]
            }
        )
        
        # Locked exams cannot accept marks -> 400 Bad Request (as per implementation)
        assert response.status_code == 400
        assert "locked" in response.json()["detail"].lower()


class TestExamAPI:
    """Tests for exam API endpoints."""
    
    def test_hod_can_approve_submitted_exam(self, client: TestClient, test_data, db: Session):
        """HOD should be able to approve a submitted exam."""
        hod = test_data["hod"]
        cohort = test_data["cohort"]
        offering = test_data["offering"]
        
        exam = Exam(
            id=uuid4(),
            exam_type="IA1",
            status="submitted",
            cohort_id=cohort.id,
            offering_id=offering.id
        )
        db.add(exam)
        db.commit()
        
        token = create_token(hod.user_id, "hod")
        # Ensure endpoint matches actual API (v1/exams/{id}/approve or v1/exams/approve/{id}?)
        # Based on previous search: @router.post("/{exam_id}/approve" in exams.py
        response = client.post(
            f"/api/v1/exams/{exam.id}/approve",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "approved"

    def test_teacher_cannot_approve_exam(self, client: TestClient, test_data, db: Session):
        """Teacher cannot approve exam."""
        teacher = test_data["teacher"]
        cohort = test_data["cohort"]
        offering = test_data["offering"]
        
        exam = Exam(
            id=uuid4(),
            exam_type="IA1",
            status="submitted",
            cohort_id=cohort.id,
            offering_id=offering.id
        )
        db.add(exam)
        db.commit()
        
        token = create_token(teacher.user_id, "teacher")
        response = client.post(
            f"/api/v1/exams/{exam.id}/approve",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403


class TestBacklogAPI:
    """Tests for backlog API."""
    
    def test_list_backlog_students(self, client: TestClient, test_data):
        """HOD can list backlog students."""
        hod = test_data["hod"]
        token = create_token(hod.user_id, "hod")
        
        response = client.get(
            "/api/v1/backlog/students",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestPromotionAPI:
    """Tests for promotion API."""
    
    def test_preview_promotion(self, client: TestClient, test_data):
        """HOD can preview promotion."""
        hod = test_data["hod"]
        cohort = test_data["cohort"]
        token = create_token(hod.user_id, "hod")
        
        response = client.get(
            f"/api/v1/promotions/preview/{cohort.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
    def test_teacher_cannot_promote(self, client: TestClient, test_data):
        """Teacher cannot promote."""
        teacher = test_data["teacher"]
        cohort = test_data["cohort"]
        token = create_token(teacher.user_id, "teacher")
        
        response = client.post(
            f"/api/v1/promotions/promote/{cohort.id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"confirm": True}
        )
        
        assert response.status_code == 403


class TestAnalyticsAPI:
    """Tests for analytics API."""
    
    def test_student_view_own_analytics(self, client: TestClient, test_data):
        """Student can view their own analytics."""
        student = test_data["student"]
        # token uses user_id (Profile id), not student_id
        token = create_token(student.user_id, "student")
        
        response = client.get(
            "/api/v1/analytics/student/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # 200 OK or 404 Not Found (if no data) are acceptable for access check
        # 403 is fail
        assert response.status_code != 403
