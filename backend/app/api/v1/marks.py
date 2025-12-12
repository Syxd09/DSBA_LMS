"""
EduMetrics Backend - Marks Router
Marks entry and management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
import uuid as uuid_lib
from datetime import datetime
from decimal import Decimal

from app.database import get_db
from app.api.deps import get_current_user, require_teacher_or_above, require_authenticated
from app.models import Profile, Exam, StudentMarks, MarksComputed, SubQuestion, Question, ExamSection
from app.schemas import BulkMarksCreate, StudentMarksResponse, MarksComputedResponse

router = APIRouter(prefix="/marks", tags=["Marks"])


@router.get("/exam/{exam_id}", response_model=List[StudentMarksResponse])
async def get_exam_marks(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Get all marks for an exam."""
    marks = db.query(StudentMarks).filter(StudentMarks.exam_id == exam_id).all()
    return marks


@router.post("/exam/{exam_id}", response_model=dict)
async def save_marks(
    exam_id: UUID,
    marks_data: BulkMarksCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Bulk save marks for an exam."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.status == "locked":
        raise HTTPException(status_code=400, detail="Exam is locked, cannot modify marks")
    
    saved_count = 0
    for entry in marks_data.marks:
        # Check if mark already exists
        existing = db.query(StudentMarks).filter(
            StudentMarks.exam_id == exam_id,
            StudentMarks.student_id == entry.student_id,
            StudentMarks.sub_question_id == entry.sub_question_id
        ).first()
        
        if existing:
            existing.marks = Decimal(str(entry.marks))
            existing.entered_by = current_user.user_id
            existing.entered_at = datetime.utcnow()
        else:
            new_mark = StudentMarks(
                id=uuid_lib.uuid4(),
                exam_id=exam_id,
                student_id=entry.student_id,
                sub_question_id=entry.sub_question_id,
                marks=Decimal(str(entry.marks)),
                entered_by=current_user.user_id
            )
            db.add(new_mark)
        saved_count += 1
    
    db.commit()
    
    return {"success": True, "saved_count": saved_count}


@router.post("/compute/{exam_id}", response_model=List[MarksComputedResponse])
async def compute_marks(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Compute final marks for an exam (applies Best-N selection if applicable)."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Get all sections with their selection modes
    sections = db.query(ExamSection).filter(ExamSection.exam_id == exam_id).all()
    
    # Get all student marks
    all_marks = db.query(StudentMarks).filter(StudentMarks.exam_id == exam_id).all()
    
    # Group marks by student
    student_marks_map = {}
    for mark in all_marks:
        if mark.student_id not in student_marks_map:
            student_marks_map[mark.student_id] = []
        student_marks_map[mark.student_id].append(mark)
    
    results = []
    
    for student_id, marks in student_marks_map.items():
        total = Decimal(0)
        selected_questions = []
        
        for section in sections:
            section_questions = db.query(Question).filter(Question.section_id == section.id).all()
            
            if section.selection_mode == "BEST_N":
                # Calculate total for each question
                question_totals = []
                for question in section_questions:
                    sub_questions = db.query(SubQuestion).filter(SubQuestion.question_id == question.id).all()
                    sq_ids = [sq.id for sq in sub_questions]
                    
                    q_marks = sum(
                        m.marks for m in marks 
                        if m.sub_question_id in sq_ids
                    )
                    question_totals.append((question.id, q_marks))
                
                # Sort and take best N
                question_totals.sort(key=lambda x: x[1], reverse=True)
                best_questions = question_totals[:section.required_questions]
                
                for q_id, q_total in best_questions:
                    total += q_total
                    selected_questions.append(str(q_id))
            else:
                # FIRST_N - sum all marks
                for question in section_questions[:section.required_questions]:
                    sub_questions = db.query(SubQuestion).filter(SubQuestion.question_id == question.id).all()
                    sq_ids = [sq.id for sq in sub_questions]
                    
                    q_marks = sum(
                        m.marks for m in marks 
                        if m.sub_question_id in sq_ids
                    )
                    total += q_marks
                    selected_questions.append(str(question.id))
        
        # Save computed marks
        existing = db.query(MarksComputed).filter(
            MarksComputed.exam_id == exam_id,
            MarksComputed.student_id == student_id
        ).first()
        
        if existing:
            existing.total_marks = total
            existing.selected_questions = selected_questions
            existing.computed_at = datetime.utcnow()
        else:
            computed = MarksComputed(
                id=uuid_lib.uuid4(),
                exam_id=exam_id,
                student_id=student_id,
                total_marks=total,
                selected_questions=selected_questions
            )
            db.add(computed)
        
        results.append(MarksComputedResponse(
            id=existing.id if existing else uuid_lib.uuid4(),
            exam_id=exam_id,
            student_id=student_id,
            total_marks=float(total),
            selected_questions=selected_questions,
            computed_at=datetime.utcnow()
        ))
    
    db.commit()
    
    return results


@router.get("/student/{student_id}", response_model=List[StudentMarksResponse])
async def get_student_marks(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get marks for a specific student (students can only view their own)."""
    # Check authorization
    from app.api.deps import get_user_role
    role = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    user_role = role.role.value if role else "student"
    
    if user_role == "student" and current_user.user_id != student_id:
        raise HTTPException(status_code=403, detail="Not authorized to view other student's marks")
    
    marks = db.query(StudentMarks).filter(StudentMarks.student_id == student_id).all()
    return marks


# Import at the bottom to avoid circular imports
from app.models import UserRole
