"""
EduMetrics Backend - Exams Router
Exam management endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
import uuid as uuid_lib
from datetime import datetime

from app.database import get_db
from app.api.deps import get_current_user, require_teacher_or_above, get_user_role
from app.models import Profile, Exam, ExamSection, Question, SubQuestion, Subject, Cohort
from app.schemas import (
    ExamCreate, ExamUpdate, ExamResponse, ExamWithStructure, 
    ExamStructureCreate, ExamSectionResponse
)

router = APIRouter(prefix="/exams", tags=["Exams"])


@router.get("", response_model=List[ExamResponse])
async def list_exams(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above),
    role: str = Depends(get_user_role),
    subject_id: Optional[UUID] = None,
    cohort_id: Optional[UUID] = None,
    status_filter: Optional[str] = None
):
    """List exams (filtered by role)."""
    query = db.query(Exam).options(
        joinedload(Exam.subject),
        joinedload(Exam.cohort)
    )
    
    # Filter by teacher's own exams if teacher
    if role == "teacher":
        query = query.filter(Exam.teacher_id == current_user.user_id)
    
    if subject_id:
        query = query.filter(Exam.subject_id == subject_id)
    if cohort_id:
        query = query.filter(Exam.cohort_id == cohort_id)
    if status_filter:
        query = query.filter(Exam.status == status_filter)
    
    exams = query.order_by(Exam.created_at.desc()).all()
    return exams


@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    exam: ExamCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Create a new exam."""
    # Validate subject and cohort exist
    subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    cohort = db.query(Cohort).filter(Cohort.id == exam.cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    new_exam = Exam(
        id=uuid_lib.uuid4(),
        subject_id=exam.subject_id,
        cohort_id=exam.cohort_id,
        exam_type=exam.exam_type,
        max_marks=exam.max_marks,
        teacher_id=current_user.user_id,
        status="draft"
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    
    return new_exam


@router.get("/{exam_id}", response_model=ExamWithStructure)
async def get_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Get exam with full structure."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Get subject and cohort info
    subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
    cohort = db.query(Cohort).filter(Cohort.id == exam.cohort_id).first()
    
    # Get sections with questions and sub-questions
    sections = db.query(ExamSection).filter(ExamSection.exam_id == exam_id).order_by(ExamSection.sequence).all()
    
    sections_data = []
    for section in sections:
        questions = db.query(Question).filter(Question.section_id == section.id).order_by(Question.sequence).all()
        questions_data = []
        for question in questions:
            sub_questions = db.query(SubQuestion).filter(SubQuestion.question_id == question.id).all()
            questions_data.append({
                **question.__dict__,
                "sub_questions": [sq.__dict__ for sq in sub_questions]
            })
        sections_data.append({
            **section.__dict__,
            "questions": questions_data
        })
    
    return ExamWithStructure(
        id=exam.id,
        subject_id=exam.subject_id,
        cohort_id=exam.cohort_id,
        exam_type=exam.exam_type,
        max_marks=exam.max_marks,
        status=exam.status,
        teacher_id=exam.teacher_id,
        created_at=exam.created_at,
        published_at=exam.published_at,
        sections=sections_data,
        subject={"id": str(subject.id), "name": subject.name, "code": subject.code} if subject else None,
        cohort={"id": str(cohort.id), "name": cohort.name} if cohort else None
    )


@router.put("/{exam_id}/structure", response_model=ExamWithStructure)
async def update_exam_structure(
    exam_id: UUID,
    structure: ExamStructureCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Update exam structure (sections, questions, sub-questions)."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.status != "draft":
        raise HTTPException(status_code=400, detail="Cannot modify published exam")
    
    # Delete existing structure
    db.query(ExamSection).filter(ExamSection.exam_id == exam_id).delete()
    db.commit()
    
    # Create new structure
    for section_data in structure.sections:
        section = ExamSection(
            id=uuid_lib.uuid4(),
            exam_id=exam_id,
            name=section_data.name,
            sequence=section_data.sequence,
            max_marks=section_data.max_marks,
            required_questions=section_data.required_questions,
            selection_mode=section_data.selection_mode
        )
        db.add(section)
        db.flush()
        
        for q_data in section_data.questions:
            question = Question(
                id=uuid_lib.uuid4(),
                section_id=section.id,
                sequence=q_data.sequence,
                max_marks=q_data.max_marks,
                bloom_level=q_data.bloom_level,
                co_id=q_data.co_id,
                is_optional=q_data.is_optional,
                group_key=q_data.group_key
            )
            db.add(question)
            db.flush()
            
            for sq_data in q_data.sub_questions:
                sub_question = SubQuestion(
                    id=uuid_lib.uuid4(),
                    question_id=question.id,
                    label=sq_data.label,
                    max_marks=sq_data.max_marks,
                    bloom_level=sq_data.bloom_level,
                    co_id=sq_data.co_id
                )
                db.add(sub_question)
    
    db.commit()
    
    # Return updated exam
    return await get_exam(exam_id, db, current_user)


@router.post("/{exam_id}/publish", response_model=ExamResponse)
async def publish_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Publish an exam (makes it visible to students)."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.status == "published":
        raise HTTPException(status_code=400, detail="Exam is already published")
    
    exam.status = "published"
    exam.published_at = datetime.utcnow()
    db.commit()
    db.refresh(exam)
    
    return exam
