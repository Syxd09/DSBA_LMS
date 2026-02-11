
"""
EduMetrics Backend - Bloom Analysis Tests (GAP-03)
"""
import pytest
from uuid import uuid4, UUID
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import (
    Profile, UserRole, Student, Department, Program, Cohort, 
    SubjectOffering, CourseOutcome, Exam, ExamSection, Question, SubQuestion,
    StudentQuestionMark, Bloom, Subject
)
from app.core.security import create_access_token
from app.services.analytics import bloom_service

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def setup_bloom_data(db: Session):
    # 1. Setup Hierarchy
    dept = Department(id=uuid4(), name="Bloom Dept", code=f"BLM_{uuid4().hex[:4]}")
    db.add(dept)
    
    prog = Program(id=uuid4(), name="Bloom Prog", code=f"BLM_P_{uuid4().hex[:4]}", department_id=dept.id)
    db.add(prog)
    
    cohort = Cohort(id=uuid4(), name=f"BLM_C_{uuid4().hex[:4]}", program_id=prog.id, year=2025)
    db.add(cohort)
    
    subject = Subject(id=uuid4(), name="Bloom Subject", code="BLM101", credits=3)
    db.add(subject)

    offering = SubjectOffering(
        id=uuid4(), 
        subject_id=subject.id, 
        program_id=prog.id, 
        cohort_id=cohort.id, 
        semester_no=1, 
        regulation_year=2021
    )
    db.add(offering) # Incomplete offering but ID is enough for exam link
    
    # 2. Setup Bloom Reference
    bloom_remember = Bloom(id=uuid4(), version="revised", level_name="Remember", level_order=1)
    bloom_apply = Bloom(id=uuid4(), version="revised", level_name="Apply", level_order=3)
    db.add(bloom_remember)
    db.add(bloom_apply)
    
    # 3. Setup Exam
    exam = Exam(
        id=uuid4(),
        offering_id=offering.id,
        cohort_id=cohort.id,
        exam_type="INT1",
        max_marks=40
    )
    db.add(exam)
    
    section = ExamSection(id=uuid4(), exam_id=exam.id, name="Sec A", sequence=1, max_questions=2, max_marks=10)
    db.add(section)
    
    # Question 1: Remember (Relation) - Max 5
    q1 = Question(id=uuid4(), section_id=section.id, sequence=1, max_marks=5)
    db.add(q1)
    sq1 = SubQuestion(
        id=uuid4(), question_id=q1.id, label="a", max_marks=5, 
        bloom_id=bloom_remember.id # Relation
    )
    db.add(sq1)
    
    # Question 2: Analyze (Legacy String) - Max 5
    q2 = Question(id=uuid4(), section_id=section.id, sequence=2, max_marks=5)
    db.add(q2)
    sq2 = SubQuestion(
        id=uuid4(), question_id=q2.id, label="a", max_marks=5,
        bloom_level="Analyze" # Legacy
    )
    db.add(sq2)
    
    # Create Student
    student = Student(usn="USN1", name="Bloom Student", cohort_id=cohort.id)
    db.add(student)
    db.commit() # Ensure student exists for FK

    # 4. Marks
    # Student scores 4/5 in Q1 (Remember)
    # Student scores 3/5 in Q2 (Analyze)
    
    mark1 = StudentQuestionMark(
        id=uuid4(), sub_question_id=sq1.id, exam_id=exam.id,
        marks=4, usn="USN1"
    )
    db.add(mark1)
    
    mark2 = StudentQuestionMark(
        id=uuid4(), sub_question_id=sq2.id, exam_id=exam.id,
        marks=3, usn="USN1"
    )
    db.add(mark2)
    
    db.commit()
    
    return {
        "offering_id": str(offering.id),
        "bloom_remember_id": str(bloom_remember.id),
        "bloom_apply_id": str(bloom_apply.id)
    }

@pytest.mark.asyncio
async def test_bloom_analysis_service(db, setup_bloom_data):
    service = bloom_service.BloomAnalysisService(db)
    
    response = await service.analyze_offering_bloom(setup_bloom_data["offering_id"])
    data = response.data
    
    assert data.offering_id == UUID(setup_bloom_data["offering_id"])
    assert data.total_marks == Decimal(10) # 5 + 5
    
    # Check Distributions
    # Should have 2 entries: Remember (Order 1) and Analyze (Order 99/Legacy)
    assert len(data.bloom_distribution) == 2
    
    remember_stats = next(s for s in data.bloom_distribution if s.level.level_name == "Remember")
    analyze_stats = next(s for s in data.bloom_distribution if s.level.level_name == "Analyze")
    
    # Verify Remember (Relation)
    assert remember_stats.max_marks == Decimal(5)
    assert remember_stats.obtained_marks == Decimal(4)
    # Percentage: (4/5)*100 = 80.0
    # Potential denominator = 5 * 1 student = 5
    assert remember_stats.percentage == Decimal("80.00")
    assert remember_stats.level.version == "revised"
    
    # Verify Analyze (Legacy)
    assert analyze_stats.max_marks == Decimal(5)
    assert analyze_stats.obtained_marks == Decimal(3)
    # Percentage: (3/5)*100 = 60.0
    assert analyze_stats.percentage == Decimal("60.00")
    assert analyze_stats.level.version == "legacy"
