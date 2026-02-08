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
from app.models import Profile, Exam, StudentQuestionMark, SubQuestion, Question, ExamSection, Student
from app.schemas import BulkMarksCreate, StudentMarksResponse

router = APIRouter(prefix="/marks", tags=["Marks"])


@router.get("/exam/{exam_id}", response_model=List[StudentMarksResponse])
async def get_exam_marks(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Get all marks for an exam."""
    # USN-based fetch
    marks = db.query(StudentQuestionMark).filter(StudentQuestionMark.exam_id == exam_id).all()
    
    # Map back to response schema (which expects student_id, but we have USN)
    # Ideally schema should change, but for now we map USN -> student_id if possible
    # Or better: update pydantic schema to accept USN.
    # checking schema... assumed to have student_id.
    # For now, we fetch students map to bridge gap
    
    student_usn_map = {
        s.usn: s.id for s in db.query(Student).filter(Student.cohort_id == marks[0].exam.cohort_id).all()
        if marks
    } if marks else {}

    response = []
    for m in marks:
         # Find student_id from USN
         # This is a temporary bridge until frontend uses USN
         sid = None # How to map?
         # The StudentQuestionMark has USN. The schema likely expects student_id (UUID).
         # We need to join with Student table.
         pass 

    # Better approach: Joined query
    results = db.query(StudentQuestionMark, Student.id.label("student_uuid")).join(
        Student, Student.usn == StudentQuestionMark.usn
    ).filter(StudentQuestionMark.exam_id == exam_id).all()
    
    return [
        {
            "id": m.StudentQuestionMark.id,
            "exam_id": m.StudentQuestionMark.exam_id,
            "student_id": m.student_uuid, # UUID
            "sub_question_id": m.StudentQuestionMark.sub_question_id,
            "marks": m.StudentQuestionMark.marks
        }
        for m in results
    ]


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
    
    # Pre-fetch students map for UUID->USN conversion (since frontend sends UUIDs)
    # Front-end sends student_id (UUID). We need to resolve to USN.
    student_uuids = [entry.student_id for entry in marks_data.marks]
    students = db.query(Student).filter(Student.id.in_(student_uuids)).all()
    uuid_to_usn = {s.id: s.usn for s in students}
    
    for entry in marks_data.marks:
        if entry.student_id not in uuid_to_usn:
            continue # Skip invalid students
            
        usn = uuid_to_usn[entry.student_id]
        
        # Check if mark already exists
        existing = db.query(StudentQuestionMark).filter(
            StudentQuestionMark.exam_id == exam_id,
            StudentQuestionMark.usn == usn,
            StudentQuestionMark.sub_question_id == entry.sub_question_id
        ).first()
        
        if existing:
            old_value = float(existing.marks)
            existing.marks = Decimal(str(entry.marks))
            existing.entered_by = current_user.user_id
            existing.entered_at = datetime.utcnow()
            
            # Audit log for edit
            audit_entries.append({
                "action": "MARKS_EDIT",
                "entity_type": "student_question_marks",
                "entity_id": str(existing.id),
                "old_value": str(old_value),
                "new_value": str(entry.marks),
                "student_id": usn, # Logging USN now
                "sub_question_id": str(entry.sub_question_id)
            })
        else:
            new_mark = StudentQuestionMark(
                id=uuid_lib.uuid4(),
                exam_id=exam_id,
                usn=usn, # USN IS KING
                sub_question_id=entry.sub_question_id,
                marks=Decimal(str(entry.marks)),
                entered_by=current_user.user_id
            )
            db.add(new_mark)
            
            # Audit log for new entry
            audit_entries.append({
                "action": "MARKS_ENTRY",
                "entity_type": "student_question_marks",
                "entity_id": str(new_mark.id),
                "old_value": None,
                "new_value": str(entry.marks),
                "student_id": usn,
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
    
    # Get all student marks (USN-based)
    all_marks = db.query(StudentQuestionMark).filter(StudentQuestionMark.exam_id == exam_id).all()
    
    # Group marks by student (USN)
    student_marks_map = {}
    for mark in all_marks:
        if mark.usn not in student_marks_map:
            student_marks_map[mark.usn] = []
        student_marks_map[mark.usn].append(mark)
    
    results = []
    
    # Get map of USN -> Student UUID for response
    all_usns = list(student_marks_map.keys())
    students = db.query(Student).filter(Student.usn.in_(all_usns)).all()
    usn_to_uuid = {s.usn: str(s.id) for s in students}

    for usn, marks in student_marks_map.items():
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
        
        results.append({
            "student_id": usn_to_uuid.get(usn, "UNKNOWN"), # Return UUID if possible
            "student_usn": usn, # Add USN for clarity
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
    
    # Updated to use USN for StudentQuestionMark
    # First get student USN from UUID
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    marks = db.query(StudentQuestionMark).filter(StudentQuestionMark.usn == student.usn).all()
    
    # Map back to response format
    return [
        {
            "id": m.id,
            "exam_id": m.exam_id,
            "student_id": student_id,
            "sub_question_id": m.sub_question_id,
            "marks": m.marks
        }
        for m in marks
    ]


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
    
    # Verify marks exist (USN-based)
    marks_count = db.query(StudentQuestionMark).filter(StudentQuestionMark.exam_id == exam_id).count()
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


# ============= BULK IMPORT/EXPORT =============

from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse
import csv
import io


@router.get("/template/{exam_id}")
async def get_marks_template(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Download marks entry template for an exam.
    Template includes: USN, Student Name, and columns for each sub-question.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Get all sections, questions, sub-questions
    sections = db.query(ExamSection).filter(ExamSection.exam_id == exam_id).order_by(ExamSection.section_label).all()
    
    # Build header row
    headers = ["USN", "Student Name"]
    sq_mapping = []  # (sub_question_id, column_name, max_marks)
    
    for section in sections:
        questions = db.query(Question).filter(Question.section_id == section.id).order_by(Question.question_number).all()
        for question in questions:
            sub_questions = db.query(SubQuestion).filter(SubQuestion.question_id == question.id).all()
            for sq in sub_questions:
                col_name = f"S{section.section_label}_Q{question.question_number}_{sq.label or 'a'} (Max:{sq.max_marks})"
                headers.append(col_name)
                sq_mapping.append((str(sq.id), col_name, float(sq.max_marks)))
    
    # Get students for this cohort
    students = db.query(Student).filter(
        Student.cohort_id == exam.cohort_id,
        Student.status == "active"
    ).order_by(Student.usn).all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    
    for student in students:
        row = [student.usn, student.name] + ["" for _ in sq_mapping]
        writer.writerow(row)
    
    # Return as downloadable file
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=marks_template_{exam_id}.csv"
        }
    )


@router.post("/import/{exam_id}")
async def import_marks_csv(
    exam_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Import marks from CSV file for an exam.
    
    Expected format matches the template downloaded from /template/{exam_id}.
    Columns after USN and Student Name should be marks for each sub-question.
    
    IMMUTABILITY RULES apply - only 'approved' exam status allows marks.
    """
    from app.models import AuditLog
    import uuid as uuid_lib
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check exam status
    if exam.status == "locked":
        raise HTTPException(status_code=400, detail="Exam is locked. Cannot import marks.")
    if exam.status not in ["approved"]:
        raise HTTPException(
            status_code=400,
            detail=f"Exam status is '{exam.status}'. Marks entry only allowed after HOD approval."
        )
    
    # Read CSV content
    content = await file.read()
    try:
        decoded = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV: {str(e)}")
    
    # Build sub-question mapping from headers
    # Headers format: "S{section}_Q{qnum}_{label} (Max:{marks})"
    headers = csv_reader.fieldnames or []
    
    # Get all sub-questions for this exam
    sections = db.query(ExamSection).filter(ExamSection.exam_id == exam_id).all()
    all_sub_questions = []
    for section in sections:
        questions = db.query(Question).filter(Question.section_id == section.id).all()
        for question in questions:
            sub_qs = db.query(SubQuestion).filter(SubQuestion.question_id == question.id).all()
            for sq in sub_qs:
                col_name = f"S{section.section_label}_Q{question.question_number}_{sq.label or 'a'} (Max:{sq.max_marks})"
                all_sub_questions.append((sq.id, str(sq.max_marks), col_name))
    
    sq_col_to_id = {sq[2]: sq[0] for sq in all_sub_questions}
    sq_max_marks = {sq[0]: float(sq[1]) for sq in all_sub_questions}
    
    results = {
        "success_count": 0,
        "error_count": 0,
        "errors": []
    }
    
    marks_to_add = []
    marks_to_update = []
    audit_entries = []
    
    for row_idx, row in enumerate(csv_reader, start=2):  # Start at 2 (header is row 1)
        usn = row.get("USN", "").strip()
        if not usn:
            results["errors"].append(f"Row {row_idx}: Missing USN")
            results["error_count"] += 1
            continue
        
        # Verify student exists
        student = db.query(Student).filter(Student.usn == usn).first()
        if not student:
            results["errors"].append(f"Row {row_idx}: Student not found ({usn})")
            results["error_count"] += 1
            continue
        
        # Process each mark column
        for col_name, sq_id in sq_col_to_id.items():
            cell_value = row.get(col_name, "").strip()
            if not cell_value:
                continue  # Skip empty cells
            
            try:
                marks_value = float(cell_value)
            except ValueError:
                results["errors"].append(f"Row {row_idx}: Invalid marks value for {col_name}")
                results["error_count"] += 1
                continue
            
            # Validate marks range
            max_marks = sq_max_marks.get(sq_id, 100)
            if marks_value < 0 or marks_value > max_marks:
                results["errors"].append(f"Row {row_idx}: Marks {marks_value} out of range [0, {max_marks}] for {col_name}")
                results["error_count"] += 1
                continue
            
            # Check if mark already exists
            existing = db.query(StudentQuestionMark).filter(
                StudentQuestionMark.exam_id == exam_id,
                StudentQuestionMark.usn == usn,
                StudentQuestionMark.sub_question_id == sq_id
            ).first()
            
            if existing:
                old_value = float(existing.marks)
                existing.marks = Decimal(str(marks_value))
                existing.entered_by = current_user.user_id
                existing.entered_at = datetime.utcnow()
                marks_to_update.append(existing)
                
                audit_entries.append({
                    "action": "MARKS_IMPORT_EDIT",
                    "entity_type": "student_question_marks",
                    "entity_id": str(existing.id),
                    "old_value": str(old_value),
                    "new_value": str(marks_value),
                    "student_id": usn,
                    "sub_question_id": str(sq_id)
                })
            else:
                new_mark = StudentQuestionMark(
                    id=uuid_lib.uuid4(),
                    exam_id=exam_id,
                    usn=usn,
                    sub_question_id=sq_id,
                    marks=Decimal(str(marks_value)),
                    entered_by=current_user.user_id
                )
                marks_to_add.append(new_mark)
                
                audit_entries.append({
                    "action": "MARKS_IMPORT_NEW",
                    "entity_type": "student_question_marks",
                    "entity_id": str(new_mark.id),
                    "old_value": None,
                    "new_value": str(marks_value),
                    "student_id": usn,
                    "sub_question_id": str(sq_id)
                })
            
            results["success_count"] += 1
    
    # Commit all changes
    try:
        if marks_to_add:
            db.add_all(marks_to_add)
        
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
                reason=f"CSV Import - student {audit_data['student_id']}"
            )
            db.add(audit_log)
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return {
        "success": True,
        "exam_id": str(exam_id),
        "imported_marks": results["success_count"],
        "new_entries": len(marks_to_add),
        "updated_entries": len(marks_to_update),
        "errors": results["errors"][:20],  # Limit errors returned
        "total_errors": results["error_count"]
    }
