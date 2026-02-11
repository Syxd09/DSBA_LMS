"""
EduMetrics Backend - CO Versioning Verification
Tests to ensure Course Outcomes are attached to SubjectOfferings (Batch-Specific)
and NOT to the master Subject (Legacy).
"""
import pytest
from datetime import datetime
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db
from app.models import Profile, Subject, SubjectOffering, Cohort, CourseOutcome, Program, UserRole
from app.core.security import create_access_token

@pytest.fixture
def client(db: Session):
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
def setup_versioning_data(db: Session):
    """Create a Subject and two Offerings (Batch 2023, Batch 2024)."""
    # 1. Admin/HOD User
    hod_uid = uuid4()
    hod = Profile(
        id=uuid4(), user_id=hod_uid, email="hod_audit@test.com", full_name="Audit HOD"
    )
    db.add(hod)
    db.add(UserRole(id=uuid4(), user_id=hod_uid, role="hod"))
    
    # 2. Program
    program = Program(id=uuid4(), name="CSE", code="CSE", duration_semesters=8)
    db.add(program)
    
    # 3. Master Subject
    subject = Subject(
        id=uuid4(), 
        name="Operating Systems", 
        code="CS501", 
        credits=4, 
        semester=5
    )
    db.add(subject)
    
    # 4. Two Cohorts
    cohort_2023 = Cohort(id=uuid4(), name="2023-27", program_id=program.id, year=2023)
    cohort_2024 = Cohort(id=uuid4(), name="2024-28", program_id=program.id, year=2024)
    db.add_all([cohort_2023, cohort_2024])
    
    db.commit() # Commit to get IDs
    
    # 5. Two Offerings
    offering_2023 = SubjectOffering(
        id=uuid4(),
        subject_id=subject.id,
        program_id=program.id,
        cohort_id=cohort_2023.id,
        semester_no=5,
        regulation_year=2021
    )
    
    offering_2024 = SubjectOffering(
        id=uuid4(),
        subject_id=subject.id,
        program_id=program.id,
        cohort_id=cohort_2024.id,
        semester_no=5,
        regulation_year=2024 # Different regulation?
    )
    db.add_all([offering_2023, offering_2024])
    db.commit()
    
    return {
        "hod": hod,
        "subject": subject,
        "offering_2023": offering_2023,
        "offering_2024": offering_2024
    }

def create_token(user_id: str, role: str) -> str:
    return create_access_token({"sub": str(user_id), "role": role})

def test_co_versioning_isolation(client: TestClient, setup_versioning_data, db: Session):
    """
    Verify that COs created for Offering 2023 do NOT appear in Offering 2024.
    """
    data = setup_versioning_data
    hod = data["hod"]
    offering_2023 = data["offering_2023"]
    offering_2024 = data["offering_2024"]
    
    token = create_token(hod.user_id, "hod")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Create CO for 2023 Batch
    co_payload_2023 = {
        "co_number": 1,
        "description": "Explain OS Concepts (2021 Reg)",
        "bloom_level": "L2"
    }
    
    resp_2023 = client.post(
        f"/api/v1/offerings/{offering_2023.id}/outcomes",
        json=co_payload_2023,
        headers=headers
    )
    assert resp_2023.status_code == 201, f"Failed to create CO: {resp_2023.text}"
    
    # 2. Verify it exists for 2023
    get_2023 = client.get(
        f"/api/v1/offerings/{offering_2023.id}/outcomes",
        headers=headers
    )
    assert len(get_2023.json()) == 1
    assert get_2023.json()[0]["description"] == "Explain OS Concepts (2021 Reg)"
    
    # 3. Verify it DOES NOT exist for 2024
    get_2024 = client.get(
        f"/api/v1/offerings/{offering_2024.id}/outcomes",
        headers=headers
    )
    assert len(get_2024.json()) == 0, "CO leaked to another batch!"
    
    # 4. Create DIFFERENT CO for 2024 Batch
    co_payload_2024 = {
        "co_number": 1,
        "description": "Analyze Kernels (2024 Reg)",
        "bloom_level": "L4"
    }
    
    resp_2024 = client.post(
        f"/api/v1/offerings/{offering_2024.id}/outcomes",
        json=co_payload_2024,
        headers=headers
    )
    assert resp_2024.status_code == 201
    
    # 5. Verify 2023 is unchanged
    get_2023_again = client.get(
        f"/api/v1/offerings/{offering_2023.id}/outcomes",
        headers=headers
    )
    assert get_2023_again.json()[0]["description"] == "Explain OS Concepts (2021 Reg)"
    
    # 6. Verify 2024 has new CO
    get_2024_again = client.get(
        f"/api/v1/offerings/{offering_2024.id}/outcomes",
        headers=headers
    )
    assert get_2024_again.json()[0]["description"] == "Analyze Kernels (2024 Reg)"
