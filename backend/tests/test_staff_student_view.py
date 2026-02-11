"""
EduMetrics Backend - Staff Student View Tests

Tests for GAP-01 endpoints:
- GET /analytics/role/staff/student/{student_id}/performance
- GET /analytics/role/staff/student/{student_id}/co-profile/{offering_id}
"""
import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db
from app.models import (
    Profile, UserRole, Student, Department, Program, Cohort, 
    SubjectOffering, TeacherAssignment
)
from app.core.security import create_access_token

@pytest.fixture
def client(db):
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
def db_session(db):
    """Alias db from conftest for backward compatibility."""
    return db

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

class TestStaffStudentView:
    
    @pytest.fixture
    def setup_data(self, db_session):
        """Setup hierarchy: Dept1 -> Prog1 -> Cohort1 -> Student1, Offering1 -> Teacher1"""
        # Dept 1
        dept1 = Department(id=uuid4(), name="Dept 1", code=f"D1_{uuid4().hex[:4]}")
        db_session.add(dept1)
        
        # Dept 2
        dept2 = Department(id=uuid4(), name="Dept 2", code=f"D2_{uuid4().hex[:4]}")
        db_session.add(dept2)
        
        # HOD 1
        token_hod1, hod1 = create_user_token(db_session, "HOD", "hod1")
        dept1.hod_id = hod1.user_id
        db_session.commit()
        
        # HOD 2
        token_hod2, hod2 = create_user_token(db_session, "HOD", "hod2")
        dept2.hod_id = hod2.user_id
        db_session.commit()
        
        # Principal
        token_principal, principal = create_user_token(db_session, "PRINCIPAL", "principal")
        
        # Program 1 (Dept 1)
        prog1 = Program(id=uuid4(), name="Prog 1", code=f"P1_{uuid4().hex[:4]}", department_id=dept1.id)
        db_session.add(prog1)
        
        # Cohort 1 (Prog 1)
        cohort1 = Cohort(id=uuid4(), name=f"C1_{uuid4().hex[:4]}", program_id=prog1.id, year=2025)
        db_session.add(cohort1)
        
        # Subject
        # Need to import Subject if not imported
        # Assuming Subject is available in app.models
        from app.models import Subject
        subject1 = Subject(id=uuid4(), code="SUB1", name="Subject 1", credits=4, semester=1)
        db_session.add(subject1)
        
        # Offering 1
        offering1 = SubjectOffering(
            id=uuid4(), 
            cohort_id=cohort1.id, 
            program_id=prog1.id, 
            subject_id=subject1.id,
            semester_no=1, 
            regulation_year=2021
        )
        db_session.add(offering1)
        
        # Student 1 (Cohort 1)
        token_s1, s1_profile = create_user_token(db_session, "STUDENT", "s1")
        student1 = Student(usn=f"1MS{uuid4().hex[:4]}", name="Student 1", cohort_id=cohort1.id, user_id=s1_profile.user_id)
        db_session.add(student1)
        
        # Teacher 1 (Assigned to Offering 1)
        token_t1, t1 = create_user_token(db_session, "TEACHER", "t1")
        db_session.add(TeacherAssignment(
            id=uuid4(), 
            teacher_id=t1.user_id, 
            offering_id=offering1.id, 
            cohort_id=cohort1.id,
            academic_year=2025
        ))
        
        # Teacher 2 (Unassigned)
        token_t2, t2 = create_user_token(db_session, "TEACHER", "t2")
        
        db_session.commit()
        
        return {
            "student_id": str(student1.user_id),
            "offering_id": str(offering1.id),
            "token_hod1": token_hod1,
            "token_hod2": token_hod2,
            "token_principal": token_principal,
            "token_t1": token_t1,
            "token_t2": token_t2
        }

    def test_principal_access(self, client, setup_data):
        """Principal should access any student."""
        res = client.get(
            f"/api/v1/analytics/role/staff/student/{setup_data['student_id']}/performance",
            headers={"Authorization": f"Bearer {setup_data['token_principal']}"}
        )
        assert res.status_code == 200

    def test_hod_same_dept_access(self, client, setup_data):
        """HOD should access student in their department."""
        res = client.get(
            f"/api/v1/analytics/role/staff/student/{setup_data['student_id']}/performance",
            headers={"Authorization": f"Bearer {setup_data['token_hod1']}"}
        )
        assert res.status_code == 200

    def test_hod_other_dept_access(self, client, setup_data):
        """HOD should NOT access student in other department."""
        res = client.get(
            f"/api/v1/analytics/role/staff/student/{setup_data['student_id']}/performance",
            headers={"Authorization": f"Bearer {setup_data['token_hod2']}"}
        )
        assert res.status_code == 403

    def test_teacher_assigned_access(self, client, setup_data):
        """Teacher assigned to student's cohort should access."""
        res = client.get(
            f"/api/v1/analytics/role/staff/student/{setup_data['student_id']}/performance",
            headers={"Authorization": f"Bearer {setup_data['token_t1']}"}
        )
        assert res.status_code == 200

    def test_teacher_unassigned_access(self, client, setup_data):
        """Teacher NOT assigned to student's cohort should NOT access."""
        res = client.get(
            f"/api/v1/analytics/role/staff/student/{setup_data['student_id']}/performance",
            headers={"Authorization": f"Bearer {setup_data['token_t2']}"}
        )
        assert res.status_code == 403

    def test_co_profile_access(self, client, setup_data):
        """Verify CO profile endpoint also respects scope."""
        # Teacher 1 (Allowed)
        res = client.get(
            f"/api/v1/analytics/role/staff/student/{setup_data['student_id']}/co-profile/{setup_data['offering_id']}",
            headers={"Authorization": f"Bearer {setup_data['token_t1']}"}
        )
        assert res.status_code == 200
        
        # Teacher 2 (Forbidden)
        res = client.get(
            f"/api/v1/analytics/role/staff/student/{setup_data['student_id']}/co-profile/{setup_data['offering_id']}",
            headers={"Authorization": f"Bearer {setup_data['token_t2']}"}
        )
        assert res.status_code == 403
