"""
EduMetrics Backend - NBA Analysis Tests (GAP-02)

Tests for Indirect Attainment and PO Calculation.
"""
import pytest
from uuid import uuid4
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db
from app.models import (
    Profile, UserRole, Student, Department, Program, Cohort, 
    SubjectOffering, CourseOutcome, ProgramOutcome, COPOMapping,
    Survey, SurveyQuestion, SurveyType, SurveyResponse, SurveyQuestionResponse
)
from app.core.security import create_access_token
from app.services.analytics import po_service

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

# NOTE: We use the 'db' fixture from conftest.py which handles table creation/deletion on Test DB.
# Do NOT define a local db_session fixture using get_db() as that connects to Real DB.

def create_user_token(db: Session, role: str, email_prefix: str):
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

class TestNBAAnalysis:
    
    @pytest.fixture
    def setup_data(self, db):
        # 1. Setup Hierarchy
        dept = Department(id=uuid4(), name="NBA Dept", code=f"NBA_{uuid4().hex[:4]}")
        db.add(dept)
        
        token_hod, hod = create_user_token(db, "HOD", "nba_hod")
        dept.hod_id = hod.user_id
        
        prog = Program(id=uuid4(), name="NBA Prog", code=f"NBA_P_{uuid4().hex[:4]}", department_id=dept.id)
        db.add(prog)
        
        cohort = Cohort(id=uuid4(), name=f"NBA_C_{uuid4().hex[:4]}", program_id=prog.id, year=2025)
        db.add(cohort)
        
        token_stud, stud_profile = create_user_token(db, "STUDENT", "nba_stud")
        student = Student(usn=f"NBA_{uuid4().hex[:4]}", name="NBA Student", cohort_id=cohort.id, user_id=stud_profile.user_id)
        db.add(student)
        
        # 2. Setup POs
        po1 = ProgramOutcome(id=uuid4(), program_id=prog.id, po_code="PO1", po_number=1, description="PO1 Desc")
        db.add(po1)
        
        db.commit()
        
        return {
            "token_hod": token_hod,
            "token_stud": token_stud,
            "program_id": str(prog.id),
            "po_id": str(po1.id),
            "student_id": str(student.user_id),
            "academic_year": 2025
        }

    def test_survey_lifecycle(self, client, setup_data, db):
        # 1. Create Survey (HOD)
        survey_data = {
            "title": "Exit Survey 2025",
            "survey_type": "COURSE_EXIT",
            "program_id": setup_data["program_id"],
            "academic_year": setup_data["academic_year"],
            "is_active": True,
            "questions": [
                {
                    "question_text": "Rate PO1 attainment",
                    "mapped_po_id": setup_data["po_id"],
                    "sequence": 1
                }
            ]
        }
        res = client.post(
            "/api/v1/surveys/",
            json=survey_data,
            headers={"Authorization": f"Bearer {setup_data['token_hod']}"}
        )
        assert res.status_code == 200
        survey_id = res.json()["id"]
        question_id = res.json()["questions"][0]["id"]
        
        # 2. List Active Surveys (Student)
        res = client.get(
            "/api/v1/surveys/active",
            headers={"Authorization": f"Bearer {setup_data['token_stud']}"}
        )
        assert res.status_code == 200
        assert len(res.json()) >= 1
        assert res.json()[0]["id"] == survey_id
        
        # 3. Submit Survey (Student)
        submission = {
            "answers": [
                {"question_id": question_id, "score": 5}
            ]
        }
        res = client.post(
            f"/api/v1/surveys/{survey_id}/submit",
            json=submission,
            headers={"Authorization": f"Bearer {setup_data['token_stud']}"}
        )
        assert res.status_code == 200
        assert res.json()["success"] is True
        
        return survey_id

    @pytest.mark.asyncio
    async def test_po_attainment_calculation(self, db, setup_data):
        # We need to test the service function directly as it's cleaner for calculation verification
        # Assuming survey data exists from previous test (if sequential) 
        # But for isolation, we should create survey response here manually or use shared fixture
        
        # Create dummy creator profile
        creator_id = uuid4()
        creator = Profile(id=uuid4(), user_id=creator_id, email=f"creator_{uuid4().hex[:4]}@test.com", full_name="Creator")
        db.add(creator)
        db.commit()

        # Let's create a survey response manually
        survey = Survey(
            id=uuid4(),
            title="Test Survey",
            survey_type="COURSE_EXIT",
            program_id=setup_data["program_id"],
            academic_year=setup_data["academic_year"],
            is_active=True,
            created_by=creator_id
        )
        db.add(survey)
        
        q1 = SurveyQuestion(
            id=uuid4(),
            survey_id=survey.id,
            question_text="Q1",
            mapped_po_id=setup_data["po_id"]
        )
        db.add(q1)
        db.commit()
        
        # Add response with score 5
        resp = SurveyQuestionResponse(
            id=uuid4(),
            response_id=uuid4(), # dummy parent
            question_id=q1.id,
            score=5
        )
        # Need parent response
        parent_resp = SurveyResponse(id=resp.response_id, survey_id=survey.id, student_id=setup_data["student_id"])
        db.add(parent_resp)
        db.add(resp)
        db.commit()
        
        # Run computation
        # Note: Direct attainment will be 0 as we added no COs
        # Indirect should be 100% (Score 5/5)
        # Final = (0 * 0.8) + (100 * 0.2) = 20.0
        
        response = await po_service.compute_program_po_attainments(
            db=db,
            program_id=setup_data["program_id"],
            academic_year=setup_data["academic_year"],
            offering_ids=[]
        )
        
        po_data = response.data.pos[0]
        assert str(po_data.po_id) == setup_data["po_id"]
        
        # Verify Indirect
        # 5/5 = 100%
        assert po_data.indirect_attainment == Decimal("100")
        
        # Verify Final
        # 0.8*0 + 0.2*100 = 20.0
        assert po_data.attainment_percentage == Decimal("20.00")
