"""
EduMetrics Backend - Academic Planning Tests

Tests for:
- Cohort Management (Batches)
- Subject Offerings (Mapping Subjects to Batches)
- Teacher Assignments (Faculty Allocation)
"""
import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db
from app.models import Cohort, SubjectOffering, TeacherAssignment, Profile, UserRole, Subject
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

def get_principal_token(db: Session):
    """Helper to get principal token."""
    principal = db.query(Profile).join(UserRole).filter(UserRole.role == "PRINCIPAL").first()
    if not principal:
        uid = uuid4()
        principal = Profile(
            id=uuid4(),
            user_id=uid,
            email="principal_planning@edumetrics.com",
            full_name="Plan Principal",
            department="Admin"
        )
        db.add(principal)
        
        role = UserRole(
            id=uuid4(),
            user_id=uid,
            role="PRINCIPAL"
        )
        db.add(role)
        db.commit()
    return create_access_token({"sub": str(principal.user_id), "role": "principal"})

def get_hod_token(db: Session):
    """Helper to get HOD token."""
    hod = db.query(Profile).join(UserRole).filter(UserRole.role == "HOD").first()
    if not hod:
        uid = uuid4()
        hod = Profile(
            id=uuid4(),
            user_id=uid,
            email="hod_planning@edumetrics.com",
            full_name="Plan HOD",
            department="CSE"
        )
        db.add(hod)
        
        role = UserRole(
            id=uuid4(),
            user_id=uid,
            role="HOD"
        )
        db.add(role)
        db.commit()
    return create_access_token({"sub": str(hod.user_id), "role": "hod"})

class TestCohortPlanning:
    """Tests for Cohort lifecycle."""
    
    def test_list_cohorts(self, client: TestClient, db_session: Session):
        token = get_principal_token(db_session)
        response = client.get(
            "/api/v1/cohorts",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_cohort_details(self, client: TestClient, db_session: Session):
        token = get_principal_token(db_session)
        cohort = db_session.query(Cohort).first()
        if not cohort:
            pytest.skip("No cohort found")
            
        response = client.get(
            f"/api/v1/cohorts/{cohort.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["id"] == str(cohort.id)

class TestOfferingPlanning:
    """Tests for Subject Offerings."""
    
    def test_list_offerings_via_cohort(self, client: TestClient, db_session: Session):
        token = get_principal_token(db_session)
        cohort = db_session.query(Cohort).first()
        if not cohort:
            pytest.skip("No cohort found")

        # Correct endpoint found via inspection: /api/v1/offerings
        response = client.get(
            f"/api/v1/offerings?cohort_id={cohort.id}", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should be 200 OK
        assert response.status_code == 200
