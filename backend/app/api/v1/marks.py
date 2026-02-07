"""
EduMetrics Backend - Marks Router
Marks entry and management endpoints

NOTE: MarksComputed has been REMOVED per the "no stored analytics" rule.
All computation is now on-demand via Phase-2A functions.
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
from app.models import Profile, Exam, StudentMarks, SubQuestion, Question, ExamSection
from app.schemas import BulkMarksCreate, StudentMarksResponse

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
    """
    Bulk save marks for an exam.
    
    IMMUTABILITY RULES:
    - Only 'approved' status allows marks entry
    - 'draft' and 'submitted' block marks (exam structure not finalized)
    - 'locked' blocks all edits (immutable)
    
    AUDIT LOGGING:
    - Every mark entry/edit is logged with old/new values
    """
    from app.models import AuditLog
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Immutability enforcement (CRITICAL)
    if exam.status == "locked":
        raise HTTPException(
            status_code=400, 
            detail="Exam is locked. Marks cannot be modified. Contact HOD to unlock."
        )
    
    if exam.status in ["draft", "submitted"]:
        raise HTTPException(
            status_code=400,
            detail=f"Exam status is '{exam.status}'. Marks entry only allowed after HOD approval."
        )
    
    if exam.status != "approved":
        raise HTTPException(
            status_code=400,
            detail=f"Unexpected exam status '{exam.status}'. Only 'approved' allows marks entry."
        )
    
    saved_count = 0
    audit_entries = []
    
    for entry in marks_data.marks:
        # Check if mark already exists
        existing = db.query(StudentMarks).filter(
            StudentMarks.exam_id == exam_id,
            StudentMarks.student_id == entry.student_id,
            StudentMarks.sub_question_id == entry.sub_question_id
        ).first()
        
        if existing:
            old_value = float(existing.marks)
            existing.marks = Decimal(str(entry.marks))
            existing.entered_by = current_user.user_id
            existing.entered_at = datetime.utcnow()
            
            # Audit log for edit
            audit_entries.append({
                "action": "MARKS_EDIT",
                "entity_type": "student_marks",
                "entity_id": str(existing.id),
                "old_value": str(old_value),
                "new_value": str(entry.marks),
                "student_id": str(entry.student_id),
                "sub_question_id": str(entry.sub_question_id)
            })
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
            
            # Audit log for new entry
            audit_entries.append({
                "action": "MARKS_ENTRY",
                "entity_type": "student_marks",
                "entity_id": str(new_mark.id),
                "old_value": None,
                "new_value": str(entry.marks),
                "student_id": str(entry.student_id),
                "sub_question_id": str(entry.sub_question_id)
            })
        saved_count += 1
    
    # Write audit logs
    for audit_data in audit_entries:
        audit_log = AuditLog(
            id=uuid_lib.uuid4(),
            user_id=current_user.user_id,
            action=audit_data["action"],
            entity_type=audit_data["entity_type"],
            entity_id=audit_data["entity_id"],
            old_value=audit_data["old_value"],
            new_value=audit_data["new_value"],
            reason=f"Marks for student {audit_data['student_id']}, subq {audit_data['sub_question_id']}"
        )
        db.add(audit_log)
    
    db.commit()
    
    return {
        "success": True, 
        "saved_count": saved_count,
        "audit_logged": len(audit_entries)
    }


@router.get("/compute/{exam_id}")
async def compute_marks(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Compute marks for an exam on-demand.
    
    NOTE: This endpoint now computes marks dynamically without storing them.
    Per the "no stored analytics" rule, all derived values are computed on-demand.
    For detailed analytics, use the Phase-2B Analytics APIs.
    """
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
        
        # Return computed result (NOT stored)
        results.append({
            "student_id": str(student_id),
            "exam_id": str(exam_id),
            "total_marks": float(total),
            "selected_questions": selected_questions,
            "computed_at": datetime.utcnow().isoformat(),
            "note": "Computed on-demand, not stored"
        })
    
    return {
        "exam_id": str(exam_id),
        "student_count": len(results),
        "results": results
    }


@router.get("/student/{student_id}", response_model=List[StudentMarksResponse])
async def get_student_marks(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get marks for a specific student (students can only view their own)."""
    # Check authorization
    from app.models import UserRole
    role = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    user_role = role.role.value if role else "student"
    
    if user_role == "student" and current_user.user_id != student_id:
        raise HTTPException(status_code=403, detail="Not authorized to view other student's marks")
    
    marks = db.query(StudentMarks).filter(StudentMarks.student_id == student_id).all()
    return marks


# ============= APPROVAL WORKFLOW =============

@router.post("/submit-for-approval/{exam_id}")
async def submit_for_approval(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Submit exam marks for HOD approval.
    Faculty can submit, only HOD/Principal can approve.
    RBAC: Teacher (submitter).
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.status not in ["draft", "rejected"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot submit exam with status '{exam.status}'"
        )
    
    # Verify marks exist
    marks_count = db.query(StudentMarks).filter(StudentMarks.exam_id == exam_id).count()
    if marks_count == 0:
        raise HTTPException(status_code=400, detail="No marks entered for this exam")
    
    exam.status = "submitted"
    exam.submitted_at = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "exam_id": str(exam_id),
        "status": "submitted",
        "submitted_by": str(current_user.user_id),
        "submitted_at": exam.submitted_at.isoformat()
    }


@router.post("/approve/{exam_id}")
async def approve_marks(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Approve submitted exam marks.
    Only HOD/Principal can approve marks.
    RBAC: HOD/Principal (approver).
    """
    # Verify HOD or above
    from app.models import UserRole
    from app.core.permissions import AppRole
    role_record = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    if not role_record or role_record.role not in [AppRole.HOD, AppRole.PRINCIPAL]:
        raise HTTPException(status_code=403, detail="Only HOD or Principal can approve marks")
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.status != "submitted":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot approve exam with status '{exam.status}'. Must be 'submitted'."
        )
    
    exam.status = "approved"
    exam.approved_at = datetime.utcnow()
    exam.approved_by = current_user.user_id
    db.commit()
    
    return {
        "success": True,
        "exam_id": str(exam_id),
        "status": "approved",
        "approved_by": str(current_user.user_id),
        "approved_at": exam.approved_at.isoformat()
    }


from pydantic import BaseModel as PydanticBaseModel

class RejectRequest(PydanticBaseModel):
    reason: str


@router.post("/reject/{exam_id}")
async def reject_marks(
    exam_id: UUID,
    data: RejectRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Reject submitted exam marks with reason.
    Only HOD/Principal can reject marks.
    RBAC: HOD/Principal (rejector).
    """
    # Verify HOD or above
    from app.models import UserRole
    from app.core.permissions import AppRole
    role_record = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    if not role_record or role_record.role not in [AppRole.HOD, AppRole.PRINCIPAL]:
        raise HTTPException(status_code=403, detail="Only HOD or Principal can reject marks")
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.status != "submitted":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot reject exam with status '{exam.status}'. Must be 'submitted'."
        )
    
    exam.status = "rejected"
    db.commit()
    
    # Audit log the rejection with reason
    from app.models.audit import AuditLog
    audit = AuditLog(
        id=uuid_lib.uuid4(),
        table_name="exams",
        record_id=exam_id,
        action="REJECT",
        old_values=None,
        new_values={"status": "rejected", "reason": data.reason},
        user_id=current_user.user_id
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "exam_id": str(exam_id),
        "status": "rejected",
        "rejected_by": str(current_user.user_id),
        "reason": data.reason
    }


@router.post("/lock/{exam_id}")
async def lock_marks(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Lock approved marks - no further edits allowed.
    Only HOD/Principal can lock after approval.
    RBAC: HOD/Principal.
    """
    # Verify HOD or above
    from app.models import UserRole
    from app.core.permissions import AppRole
    role_record = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    if not role_record or role_record.role not in [AppRole.HOD, AppRole.PRINCIPAL]:
        raise HTTPException(status_code=403, detail="Only HOD or Principal can lock marks")
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.status != "approved":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot lock exam with status '{exam.status}'. Must be 'approved' first."
        )
    
    exam.status = "locked"
    db.commit()
    
    return {
        "success": True,
        "exam_id": str(exam_id),
        "status": "locked",
        "locked_by": str(current_user.user_id)
    }


