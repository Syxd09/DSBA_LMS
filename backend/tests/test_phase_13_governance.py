
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models import SystemSetting, Exam, ExamSection, Question, SubQuestion, SubjectOffering, Cohort, Subject, Student, Profile, UserRole, Department, Program
from app.core.permissions import AppRole
from app.api.deps import get_current_user
from app.main import app

@pytest.fixture
def principal_user(db: Session):
    user_id = uuid4()
    profile = Profile(
        id=user_id, 
        user_id=user_id, 
        full_name="Principal User", 
        email=f"principal_{user_id.hex[:8]}@example.com"
    )
    db.add(profile)
    db.add(UserRole(id=uuid4(), user_id=user_id, role=AppRole.PRINCIPAL))
    db.commit()
    return profile

@pytest.fixture
def teacher_user(db: Session):
    user_id = uuid4()
    profile = Profile(
        id=user_id, 
        user_id=user_id, 
        full_name="Teacher User", 
        email=f"teacher_{user_id.hex[:8]}@example.com"
    )
    db.add(profile)
    db.add(UserRole(id=uuid4(), user_id=user_id, role=AppRole.TEACHER))
    db.commit()
    return profile

class TestPhase13Governance:

    def test_institutional_settings_access_control(self, client: TestClient, db: Session, teacher_user, principal_user):
        """Verify only Principal can update system settings."""
        # 1. Teacher access -> 403
        app.dependency_overrides[get_current_user] = lambda: teacher_user
        response = client.patch(
            "/api/v1/config/system/active_academic_year", 
            json={"value": "2024-25"}
        )
        assert response.status_code == 403
        
        # 2. Principal access -> 200
        app.dependency_overrides[get_current_user] = lambda: principal_user
        response = client.patch(
            "/api/v1/config/system/active_academic_year", 
            json={"value": "2024-25"}
        )
        assert response.status_code == 200
        assert response.json()["value"] == "2024-25"

    def test_dashboard_academic_year_scoping(self, client: TestClient, db: Session, principal_user):
        """Verify dashboard helper stability with global year defaults."""
        app.dependency_overrides[get_current_user] = lambda: principal_user
        
        # Set global year
        db.query(SystemSetting).filter(SystemSetting.key == "active_academic_year").delete()
        db.add(SystemSetting(key="active_academic_year", value="2022-23"))
        db.commit()
        
        # Principal dashboard endpoint check
        response = client.get("/api/v1/dashboard/principal")
        assert response.status_code == 200

    def test_marks_template_generation(self, client: TestClient, db: Session, teacher_user):
        """Verify Excel template generation binary response with full hierarchy."""
        app.dependency_overrides[get_current_user] = lambda: teacher_user
        
        # Setup context
        dept = Department(id=uuid4(), name="Verify Dept", code=f"VD-{uuid4().hex[:4]}")
        prog = Program(id=uuid4(), name="Verify Program", code=f"VP-{uuid4().hex[:4]}", department_id=dept.id)
        sub = Subject(id=uuid4(), code=f"V-{uuid4().hex[:4]}", name="Verification Subject", credits=3)
        coh = Cohort(id=uuid4(), year=2023, name="2023-27", program_id=prog.id, current_semester=1)
        db.add_all([dept, prog, sub, coh])
        db.commit()

        stu = Student(usn=f"V-{uuid4().hex[:4]}", name="Verify Student", cohort_id=coh.id, status="active")
        off = SubjectOffering(id=uuid4(), subject_id=sub.id, program_id=prog.id, cohort_id=coh.id, semester_no=1)
        exam = Exam(id=uuid4(), offering_id=off.id, cohort_id=coh.id, exam_type="INT1", status="DRAFT", max_marks=20)
        
        db.add_all([stu, off, exam])
        db.commit()
        
        section = ExamSection(id=uuid4(), exam_id=exam.id, name="S1", sequence=1, max_marks=10, max_questions=1)
        db.add(section)
        db.commit()
        
        q1 = Question(id=uuid4(), section_id=section.id, sequence=1, max_marks=10)
        db.add(q1)
        db.commit()
        
        sq1a = SubQuestion(id=uuid4(), question_id=q1.id, label="a", max_marks=10)
        db.add(sq1a)
        db.commit()
        
        # Download
        response = client.get(f"/api/v1/export/assessment/marks-template/{exam.id}")
        assert response.status_code == 200
        assert "spreadsheetml.sheet" in response.headers["content-type"]
        assert len(response.content) > 500
