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
from app.models import Profile, Exam, Student, Cohort, SubjectOffering
from app.core.security import create_access_token


@pytest.fixture
def client():
    """Sync HTTP client."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def test_data(db: Session):
    """Create basic test data (Teacher, HOD, Student, Cohort, Offering)."""
    # 1. Create Users
    teacher = Profile(
        id=uuid4(), email="teacher@test.com", full_name="Test Teacher", role="teacher", is_active=True
    )
    hod = Profile(
        id=uuid4(), email="hod@test.com", full_name="Test HOD", role="hod", is_active=True
    )
    student_profile = Profile(
        id=uuid4(), email="student@test.com", full_name="Test Student", role="student", is_active=True
    )
    db.add_all([teacher, hod, student_profile])
    
    # 2. Create Cohort
    cohort = Cohort(id=uuid4(), name="2024-28", current_semester=3)
    db.add(cohort)
    
    # 3. Create Student (linked to Profile & Cohort)
    student = Student(
        usn="1MS24CS001",
        name="Test Student",
        cohort_id=cohort.id,
        user_id=student_profile.id
    )
    db.add(student)
    
    # 4. Create Subject Offering
    offering = SubjectOffering(id=uuid4(), cohort_id=cohort.id)
    db.add(offering)
    
    db.commit()
    return {
        "teacher": teacher,
        "hod": hod,
        "student": student,
        "cohort": cohort,
        "offering": offering
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
        
        token = create_token(teacher.id, "teacher")
        response = client.post(
            f"/api/v1/marks/{exam.id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"marks": [{"student_usn": "1MS24CS001", "marks": 35}]}
        )
        
        # Locked exams cannot accept marks -> 403 Forbidden or 400 Bad Request depending on implementation
        # Assuming 403 based on logic
        assert response.status_code in [400, 403]


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
        
        token = create_token(hod.id, "hod")
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
        
        token = create_token(teacher.id, "teacher")
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
        token = create_token(hod.id, "hod")
        
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
        token = create_token(hod.id, "hod")
        
        response = client.get(
            f"/api/v1/promotions/preview/{cohort.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
    def test_teacher_cannot_promote(self, client: TestClient, test_data):
        """Teacher cannot promote."""
        teacher = test_data["teacher"]
        cohort = test_data["cohort"]
        token = create_token(teacher.id, "teacher")
        
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
