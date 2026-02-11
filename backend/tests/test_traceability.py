
"""
EduMetrics Backend - Traceability Tests (GAP-04)
Verify full PO -> CO -> Question traceability.
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
    StudentQuestionMark, Bloom, Subject, ProgramOutcome, COPOMapping
)
from app.core.security import create_access_token
from app.services.analytics import co_service, po_service
from app.services.analytics.schemas import COStudentEvidenceResponse, COContributionDTO

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def setup_traceability_data(db: Session):
    # 1. Setup Hierarchy
    dept = Department(id=uuid4(), name="Trace Dept", code=f"TRC_{uuid4().hex[:4]}")
    db.add(dept)
    
    prog = Program(id=uuid4(), name="Trace Prog", code=f"TRC_P_{uuid4().hex[:4]}", department_id=dept.id)
    db.add(prog)
    
    cohort = Cohort(id=uuid4(), name=f"TRC_C_{uuid4().hex[:4]}", program_id=prog.id, year=2025)
    db.add(cohort)
    
    subject = Subject(id=uuid4(), name="Trace Subject", code="TRC101", credits=3)
    db.add(subject)

    offering = SubjectOffering(
        id=uuid4(), 
        subject_id=subject.id, 
        program_id=prog.id, 
        cohort_id=cohort.id, 
        semester_no=1, 
        regulation_year=2021
    )
    db.add(offering)
    
    # 2. Setup Outcomes (PO & CO)
    po1 = ProgramOutcome(
        id=uuid4(), program_id=prog.id, 
        po_code="PO1", po_number=1, description="Trace PO1"
    )
    db.add(po1)
    
    co1 = CourseOutcome(
        id=uuid4(), offering_id=offering.id, 
        co_code="CO1", co_number=1, description="Trace CO1", 
        threshold=Decimal("50.0")
    )
    db.add(co1)
    
    # Map CO1 -> PO1 (Level 3)
    mapping = COPOMapping(
        id=uuid4(), co_id=co1.id, po_id=po1.id, correlation_level=3,
        version_year=2021
    )
    db.add(mapping)
    
    # 3. Setup Assessment (Internal + External)
    # Internal Exam
    exam_int = Exam(
        id=uuid4(), offering_id=offering.id, cohort_id=cohort.id, 
        exam_type="INT1", max_marks=20
    )
    db.add(exam_int)
    
    sec_int = ExamSection(id=uuid4(), exam_id=exam_int.id, name="A", sequence=1, max_questions=1, max_marks=5)
    db.add(sec_int)
    
    q1 = Question(id=uuid4(), section_id=sec_int.id, sequence=1, max_marks=5)
    db.add(q1)
    sq1 = SubQuestion(id=uuid4(), question_id=q1.id, label="a", max_marks=5, co_id=co1.id)
    db.add(sq1)
    
    # External Exam
    exam_ext = Exam(
        id=uuid4(), offering_id=offering.id, cohort_id=cohort.id, 
        exam_type="EXT", max_marks=20
    )
    db.add(exam_ext)
    
    sec_ext = ExamSection(id=uuid4(), exam_id=exam_ext.id, name="A", sequence=1, max_questions=1, max_marks=5)
    db.add(sec_ext)
    
    q2 = Question(id=uuid4(), section_id=sec_ext.id, sequence=1, max_marks=5)
    db.add(q2)
    sq2 = SubQuestion(id=uuid4(), question_id=q2.id, label="a", max_marks=5, co_id=co1.id)
    db.add(sq2)
    
    # 4. Student & Marks
    student = Student(usn="TRC_USN1", name="Trace Student", cohort_id=cohort.id)
    db.add(student)
    db.commit() 
    
    # Marks: 4/5 in INT, 3/5 in EXT
    mark1 = StudentQuestionMark(id=uuid4(), sub_question_id=sq1.id, exam_id=exam_int.id, marks=4, usn="TRC_USN1")
    db.add(mark1)
    
    mark2 = StudentQuestionMark(id=uuid4(), sub_question_id=sq2.id, exam_id=exam_ext.id, marks=3, usn="TRC_USN1")
    db.add(mark2)
    
    db.commit()
    
    return {
        "program_id": prog.id,
        "academic_year": 2021,
        "offering_id": offering.id,
        "po_id": po1.id,
        "co_id": co1.id,
        "sq_int_id": sq1.id,
        "sq_ext_id": sq2.id,
        "usn": "TRC_USN1"
    }

@pytest.mark.asyncio
async def test_traceability_chain(db, setup_traceability_data):
    data = setup_traceability_data
    
    # 1. PO Drill-down: Get contributing COs
    # We call get_po_contributing_cos from po_service
    po_response = await po_service.get_po_contributing_cos(
        db, 
        po_id=data["po_id"], 
        program_id=data["program_id"], 
        academic_year=data["academic_year"], 
        offering_ids=[data["offering_id"]]
    )
    
    assert po_response.is_complete
    contributions = po_response.data
    assert len(contributions) == 1
    assert contributions[0].co_id == data["co_id"]
    assert contributions[0].correlation_level == 3
    # Attainment % should be computed.
    # INT: 4/5 = 80%. EXT: 3/5 = 60%.
    # Final = Weighted Average?
    # Actually co_service computes attainment based on % passing students.
    # With 1 student, if threshold=50%:
    # INT: 80% (Pass). EXT: 60% (Pass).
    # Attainment Levels depend on set thresholds (default 60, 70, 80).
    # If 80% is Level 3, 60% is Level 1?
    # We just check retrieval of CO.
    
    # 2. CO Drill-down: Get Student/Question Evidence
    # We call get_co_student_evidence from co_service
    co_response = await co_service.get_co_student_evidence(
        db,
        co_id=data["co_id"],
        offering_id=data["offering_id"],
        usn=data["usn"]
    )
    
    evidence = co_response.data # COStudentEvidenceResponse
    assert evidence.co_id == data["co_id"]
    assert len(evidence.students) == 1
    
    student_evidence = evidence.students[0]
    assert student_evidence.usn == data["usn"]
    
    # Check Question Breakdown - MUST have 2 questions (INT + EXT)
    qs = student_evidence.question_breakdown
    assert len(qs) == 2
    
    sq_ids = {q.sub_question_id for q in qs}
    assert data["sq_int_id"] in sq_ids
    assert data["sq_ext_id"] in sq_ids
    
    # Check Total Marks obtained
    # 4 + 3 = 7
    assert student_evidence.obtained_marks == Decimal(7)
    # Max marks: 5 + 5 = 10
    assert student_evidence.max_marks == Decimal(10)
    # Percentage: 70%
    assert student_evidence.percentage == Decimal("70.00")
