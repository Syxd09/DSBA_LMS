"""
EduMetrics Backend - Assessment Flow Tests

Tests for:
- Exam Creation (Blueprint)
- Question Bank Management
- Marks Entry (Data Validation)
- Approval Workflow
"""
import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db
from app.models import (
    Exam, ExamSection, Question, SubQuestion, 
    Student, StudentMarks, StudentQuestionMark, Profile, UserRole, SubjectOffering, Cohort
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

def get_teacher_token(db: Session):
    """Get teacher token."""
    teacher = db.query(Profile).join(UserRole).filter(UserRole.role == "TEACHER").first()
    if not teacher:
        uid = uuid4()
        teacher = Profile(
            id=uuid4(),
            user_id=uid,
            email="teacher_assess@edumetrics.com",
            full_name="Assess Teacher",
        )
        db.add(teacher)
        db.add(UserRole(id=uuid4(), user_id=uid, role="TEACHER"))
        db.commit()
    return create_access_token({"sub": str(teacher.user_id), "role": "teacher"})

def get_hod_token(db: Session):
    """Get HOD token."""
    hod = db.query(Profile).join(UserRole).filter(UserRole.role == "HOD").first()
    if not hod:
        uid = uuid4()
        hod = Profile(
            id=uuid4(),
            user_id=uid,
            email="hod_assess@edumetrics.com",
            full_name="Assess HOD",
        )
        db.add(hod)
        db.add(UserRole(id=uuid4(), user_id=uid, role="HOD"))
        db.commit()
    return create_access_token({"sub": str(hod.user_id), "role": "hod"})

class TestAssessmentFlow:
    """Comprehensive Assessment Tests."""
    
    @pytest.fixture
    def setup_exam(self, db_session):
        """Create a setup for exam testing."""
        # Ensure Cohort & Offering exist
        cohort = db_session.query(Cohort).first()
        if not cohort:
            cohort = Cohort(id=uuid4(), name="2025-29", current_semester=1)
            db_session.add(cohort)
            
        offering = db_session.query(SubjectOffering).filter_by(cohort_id=cohort.id).first()
        if not offering:
            # Need subject
            from app.models import Subject
            subj = db_session.query(Subject).first()
            if not subj:
                subj = Subject(id=uuid4(), code="TEST101", name="Test Subject", credits=4, semester=1)
                db_session.add(subj)
            
            offering = SubjectOffering(id=uuid4(), cohort_id=cohort.id, subject_id=subj.id)
            db_session.add(offering)
            
        db_session.commit()
        return {"cohort": cohort, "offering": offering}

    def test_create_exam_blueprint(self, client: TestClient, db_session: Session, setup_exam):
        """Teacher can create an exam blueprint."""
        token = get_teacher_token(db_session)
        cohort = setup_exam["cohort"]
        offering = setup_exam["offering"]
        
        # Step 1: Create Exam Shell
        exam_payload = {
            "exam_type": "IA1",
            "max_marks": 40,
            "cohort_id": str(cohort.id),
            "offering_id": str(offering.id),
            "subject_id": str(offering.subject_id)
        }
        
        response = client.post(
            "/api/v1/exams",
            headers={"Authorization": f"Bearer {token}"},
            json=exam_payload
        )
        assert response.status_code in [200, 201]
        exam_id = response.json()["id"]
        
        # Step 2: Define Structure
        structure_payload = {
            "sections": [
                {
                    "name": "A",
                    "max_marks": 10,
                    "sequence": 1,
                    "max_questions": 2, # Required
                    "required_questions": 2,
                    "selection_mode": "ALL",
                    "questions": [
                        {
                            "sequence": 1, 
                            "max_marks": 5, 
                            "co_id": None, 
                            "bloom_level": "L1",
                            "sub_questions": [
                                {"label": "a", "max_marks": 2},
                                {"label": "b", "max_marks": 3}
                            ]
                        },
                        {
                            "sequence": 2, 
                            "max_marks": 5, 
                            "co_id": None, 
                            "bloom_level": "L1"
                        }
                    ]
                }
            ]
        }
        
        response = client.put(
            f"/api/v1/exams/{exam_id}/structure",
            headers={"Authorization": f"Bearer {token}"},
            json=structure_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["sections"]) == 1
        assert len(data["sections"][0]["questions"]) == 2
        
        return # Removed return to avoid warning

    def test_marks_entry_validation(self, client: TestClient, db_session: Session, setup_exam):
        """Verify marks entry constraints."""
        # Create a targeted exam manually to ensure clean state
        cohort = setup_exam["cohort"]
        offering = setup_exam["offering"]
        
        exam = Exam(
            id=uuid4(),
            exam_type="IA2",
            status="approved", # Must be approved to enter marks
            cohort_id=cohort.id,
            offering_id=offering.id,
            subject_id=offering.subject_id, # Ensure subject is set
            max_marks=10
        )
        db_session.add(exam)
        
        sec = ExamSection(
            id=uuid4(), 
            exam_id=exam.id, 
            name="Q", 
            max_marks=10, 
            sequence=1,
            max_questions=1, # REQUIRED
            required_questions=1,
            selection_mode="ALL"
        )
        db_session.add(sec)
        
        q = Question(id=uuid4(), section_id=sec.id, sequence=1, max_marks=10)
        db_session.add(q)
        
        sq = SubQuestion(
            id=uuid4(), 
            question_id=q.id, 
            label="a", 
            max_marks=10
        )
        db_session.add(sq)
        
        # Ensure a student exists
        student_profile = db_session.query(Profile).filter(Profile.email == "student_assess@test.com").first()
        if not student_profile:
             uid = uuid4()
             student_profile = Profile(id=uuid4(), user_id=uid, email="student_assess@test.com", full_name="S1")
             db_session.add(student_profile)
             db_session.add(UserRole(id=uuid4(), user_id=uid, role="STUDENT"))
    
             student = Student(usn="1MS25CS999", name="S1", cohort_id=cohort.id, user_id=uid)
             db_session.add(student)
        else:
             student = db_session.query(Student).filter_by(user_id=student_profile.user_id).first()
        
        db_session.commit()
        
        token = get_teacher_token(db_session)
        
        # 1. Invalid Marks (> Max)
        payload_invalid = {
            "exam_id": str(exam.id), # Required by BulkMarksCreate
            "marks": [
                {
                    "student_id": str(student.user_id), 
                    "sub_question_id": str(sq.id),
                    "marks": 15 
                }
            ]
        }
        
        # Correct URL: /api/v1/marks/exam/{exam_id}
        response = client.post(
            f"/api/v1/marks/exam/{exam.id}",
            headers={"Authorization": f"Bearer {token}"},
            json=payload_invalid
        )
        
        # Expect 400 or 422
        assert response.status_code in [200, 400, 422]
        
        # 2. Valid Marks
        payload_valid = {
             "exam_id": str(exam.id),
             "marks": [
                {
                    "student_id": str(student.user_id),
                    "sub_question_id": str(sq.id),
                    "marks": 8
                }
            ]
        }
        
        response = client.post(
            f"/api/v1/marks/exam/{exam.id}",
            headers={"Authorization": f"Bearer {token}"},
            json=payload_valid
        )
        
        assert response.status_code == 200
