import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models import (
    Department, Program, Cohort, Subject, SubjectOffering, 
    CourseOutcome, Exam, ExamSection, Question, SubQuestion,
    Student, StudentEnrollment
)
from app.config import settings
from app.models import Profile, UserRole
from app.core.security import create_access_token
from app.database import get_db

def create_user_token(db: Session, role: str, email_prefix: str):
    """Helper to create user and token."""
    email = f"{email_prefix}_{uuid4().hex[:6]}@test.com"
    profile = db.query(Profile).filter(Profile.email == email).first()
    if not profile:
        uid = uuid4()
        profile = Profile(
            id=uuid4(),
            user_id=uid,
            email=email,
            full_name=f"Test {role}",
        )
        db.add(profile)
        db.add(UserRole(id=uuid4(), user_id=uid, role=role))
        db.commit()
    else:
        uid = profile.user_id
        
    return create_access_token({"sub": str(uid), "role": role.lower()}), profile

class TestRBACMatrix:

    @pytest.fixture
    def db(self):
        """Get DB session directly."""
        gen = get_db()
        db = next(gen)
        try:
            yield db
        finally:
            db.close()

    @pytest.fixture
    def client(self, db):
        """Local client using local db."""
        from app.main import app
        def override():
            try:
                yield db
            finally:
                pass
        
        app.dependency_overrides[get_db] = override
        with TestClient(app) as c:
            yield c
        app.dependency_overrides.clear()
    
    @pytest.fixture
    def setup_rbac_data(self, db):
        """Setup RBAC text data."""
        # 1. Org Structure
        dept = Department(id=uuid4(), name="RBAC Dept", code=f"RBAC_{uuid4().hex[:4]}")
        db.add(dept)
        
        prog = Program(
            id=uuid4(), 
            name="RBAC Program", 
            code=f"RBACP_{uuid4().hex[:4]}",
            department_id=dept.id
        )
        db.add(prog)
        
        cohort = Cohort(
            id=uuid4(), 
            name="2025-RBAC", 
            current_semester=5,
            program_id=prog.id,
            year=2025
        )
        db.add(cohort)
        
        # 2. Subject & Offering
        subject = Subject(id=uuid4(), code=f"RBAC{uuid4().hex[:4]}", name="RBAC Subject", credits=3)
        db.add(subject)
        
        offering = SubjectOffering(
            id=uuid4(), 
            cohort_id=cohort.id, 
            subject_id=subject.id,
            program_id=prog.id,
            semester_no=5,
            regulation_year=2021
        )
        db.add(offering)
        
        # 3. Users with different roles
        # Student
        token_student, p_student = create_user_token(db, "STUDENT", "rbac_student")
        student = Student(usn=f"RBAC{uuid4().hex[:4]}", name="RBAC Student", cohort_id=cohort.id, user_id=p_student.user_id)
        db.add(student)
        db.add(StudentEnrollment(
            id=uuid4(), 
            student_id=p_student.user_id, 
            usn=student.usn, 
            status="active",
            cohort_id=cohort.id,
            roll_number=student.usn
        ))
        
        # Teacher (Assigned)
        token_teacher, p_teacher = create_user_token(db, "TEACHER", "rbac_teacher")
        # TODO: Assign teacher to offering if needed for scoping tests
        
        # HOD
        token_hod, p_hod = create_user_token(db, "HOD", "rbac_hod")
        
        # Principal
        token_principal, p_principal = create_user_token(db, "PRINCIPAL", "rbac_principal")
        
        db.commit()
        
        return {
            "dept_id": str(dept.id),
            "offering_id": str(offering.id),
            "token_student": token_student,
            "token_teacher": token_teacher,
            "token_hod": token_hod,
            "token_principal": token_principal,
            "subject_id": str(subject.id),
            "cohort_id": str(cohort.id)
        }

    def test_exam_creation_rbac(self, client: TestClient, setup_rbac_data):
        """
        Matrix:
        - Student: 403
        - Teacher: 200
        - HOD: 200
        - Principal: 200
        """
        data = setup_rbac_data
        payload = {
            "exam_type": "IA1",
            "subject_id": data["subject_id"],
            "cohort_id": data["cohort_id"],
            "date": "2026-03-10",
            "description": "RBAC Test Exam"
        }
        
        # Student -> 403
        res = client.post(
            "/api/v1/exams/",
            json=payload,
            headers={"Authorization": f"Bearer {data['token_student']}"}
        )
        assert res.status_code == 403
        
        # Teacher -> 200 OK
        res = client.post(
            "/api/v1/exams/",
            json=payload,
            headers={"Authorization": f"Bearer {data['token_teacher']}"}
        )
        assert res.status_code in [200, 201]
        
    def test_exam_approval_rbac(self, client: TestClient, setup_rbac_data):
        """
        Matrix:
        - Student: 403
        - Teacher: 403 (Cannot approve, only submit)
        - HOD: 200 (Can approve submitted exams)
        """
        data = setup_rbac_data
        
        # 1. Create exam as Teacher
        payload = {
            "exam_type": "IA2",
            "subject_id": data["subject_id"],
            "cohort_id": data["cohort_id"],
            "date": "2026-04-10",
            "max_marks": 40
        }
        res = client.post(
            "/api/v1/exams/",
            json=payload,
            headers={"Authorization": f"Bearer {data['token_teacher']}"}
        )
        assert res.status_code in [200, 201]
        exam_id = res.json()["id"]
        
        # 2. Add structure (required for submit)
        structure_payload = {
            "sections": [
                {
                    "name": "Part A",
                    "sequence": 1,
                    "max_marks": 10,
                    "max_questions": 1,
                    "required_questions": 1,
                    "selection_mode": "ALL",
                    "questions": []
                }
            ]
        }
        client.put(
            f"/api/v1/exams/{exam_id}/structure",
            json=structure_payload,
            headers={"Authorization": f"Bearer {data['token_teacher']}"}
        )
        
        # 3. Submit (Teacher) -> OK
        client.post(
            f"/api/v1/exams/{exam_id}/submit",
            headers={"Authorization": f"Bearer {data['token_teacher']}"}
        )
        
        # 4. Try Approve
        
        # Student -> 403
        res = client.post(
            f"/api/v1/exams/{exam_id}/approve",
            headers={"Authorization": f"Bearer {data['token_student']}"}
        )
        assert res.status_code == 403
        
        # Teacher -> 403 (Approval is elevated)
        res = client.post(
            f"/api/v1/exams/{exam_id}/approve",
            headers={"Authorization": f"Bearer {data['token_teacher']}"}
        )
        assert res.status_code == 403
        
        # HOD -> 200 OK
        res = client.post(
            f"/api/v1/exams/{exam_id}/approve",
            headers={"Authorization": f"Bearer {data['token_hod']}"}
        )
        assert res.status_code == 200
        
    def test_analytics_institution_access(self, client: TestClient, setup_rbac_data):
        """
        Matrix:
        - Student: 403
        - Teacher: 403
        - HOD: 403 (Detailed Institution View restricted to Principal?)
        - Principal: 200
        """
        data = setup_rbac_data
        
        endpoint = "/api/v1/analytics/role/principal/institution-overview"
        
        # Student -> 403
        res = client.get(endpoint, headers={"Authorization": f"Bearer {data['token_student']}"})
        assert res.status_code == 403
        
        # Teacher -> 403
        res = client.get(endpoint, headers={"Authorization": f"Bearer {data['token_teacher']}"})
        assert res.status_code == 403
        
        # HOD -> 403 (Assuming strict role endpoint)
        res = client.get(endpoint, headers={"Authorization": f"Bearer {data['token_hod']}"})
        assert res.status_code == 403
        
        # Principal -> 200
        res = client.get(endpoint, headers={"Authorization": f"Bearer {data['token_principal']}"})
        assert res.status_code == 200
