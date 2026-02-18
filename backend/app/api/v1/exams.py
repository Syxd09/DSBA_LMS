"""
EduMetrics Backend - Exams Router
Exam management endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
import uuid as uuid_lib
from datetime import datetime

from app.database import get_db
from app.api.deps import get_current_user, require_teacher_or_above, require_hod_or_above, get_user_role
from app.models import Profile, Exam, ExamSection, Question, SubQuestion, Subject, Cohort
from app.schemas import (
    ExamCreate, ExamUpdate, ExamResponse, ExamWithStructure, 
    ExamStructureCreate, ExamSectionResponse
)

router = APIRouter(prefix="/exams", tags=["Exams"])


def verify_exam_access(db: Session, user: Profile, exam: Exam):
    """Verify if user can access this exam based on HOD=Dept, Teacher=Subject."""
    from app.models import UserRole
    from app.core.permissions import AppRole
    
    role_entry = db.query(UserRole).filter(UserRole.user_id == user.user_id).first()
    if role_entry and role_entry.role == AppRole.ADMIN:
        return True
    if role_entry and role_entry.role == AppRole.PRINCIPAL:
        return True
        
    # [NEW] Creator always has access (Teacher or HOD who created it)
    if exam.teacher_id == user.user_id:
        return True
        
    if role_entry and role_entry.role == AppRole.HOD:
        from app.models import Department, Subject, Program
        from app.models.subject_offering import SubjectOffering
        dept = db.query(Department).filter(Department.hod_id == user.user_id).first()
        if not dept:
            raise HTTPException(status_code=403, detail="HOD record not found for this user")
        
        # Visibility Rule: HOD can only see Teacher-created exams if NOT draft
        if exam.status == "draft":
             raise HTTPException(status_code=403, detail="HOD cannot access draft exams created by others")

        # Get offering/program to check department
        offering = None
        if exam.offering_id:
            offering = db.query(SubjectOffering).filter(SubjectOffering.id == exam.offering_id).first()
        
        program_id = None
        if offering:
            program_id = offering.program_id
        elif exam.subject_id:
            # Fallback to subject -> curriculum -> program
            from app.models.academic import CurriculumVersion
            subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
            if subject and subject.curriculum_version_id:
                cv = db.query(CurriculumVersion).filter(CurriculumVersion.id == subject.curriculum_version_id).first()
                if cv:
                    program_id = cv.program_id
        
        if not program_id:
             # If we still can't find a program, but the exam exists, 
             # and the user is an HOD, we should be cautious but allow 
             # access if we can't prove it DOESN'T belong to them (or 404 if orphaned)
             raise HTTPException(status_code=404, detail="Exam metadata (offering/subject) is missing or orphaned")
             
        program = db.query(Program).filter(Program.id == program_id).first()
        if not program:
             raise HTTPException(status_code=404, detail="Program not found for exam")
             
        if program.department_id != dept.id:
            raise HTTPException(
                status_code=403, 
                detail=f"HOD access denied. Exam belongs to dept {program.department_id}, but user is HOD of {dept.id}"
            )
        return True
        
    # [NEW] Teacher Visibility Rule: Can see HOD-created exams for their subjects IF approved
    if role_entry and role_entry.role == AppRole.TEACHER:
         from app.models.academic import TeacherAssignment
         assignment = db.query(TeacherAssignment).filter(
             TeacherAssignment.teacher_id == user.user_id,
             TeacherAssignment.offering_id == exam.offering_id
         ).first()
         if assignment:
             if exam.status in ["approved", "published", "locked"]:
                 return True
             else:
                 raise HTTPException(status_code=403, detail="Teachers can only view HOD-created exams after approval")

    raise HTTPException(status_code=403, detail="Not authorized to access this exam")



@router.get("", response_model=List[ExamResponse])
async def list_exams(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above),
    role: str = Depends(get_user_role),
    subject_id: Optional[UUID] = None,
    cohort_id: Optional[UUID] = None,
    offering_id: Optional[UUID] = None,
    status_filter: Optional[str] = None
):
    """List exams (filtered by role)."""
    query = db.query(Exam).options(
        joinedload(Exam.subject),
        joinedload(Exam.cohort)
    )
    
    # Filter by scope
    if role == "teacher":
        from app.models.academic import TeacherAssignment
        # Get all offerings assigned to this teacher
        assigned_offerings = db.query(TeacherAssignment.offering_id).filter(
            TeacherAssignment.teacher_id == current_user.user_id
        ).all()
        offering_ids = [row[0] for row in assigned_offerings if row[0]]
        
        query = query.filter(
            or_(
                Exam.teacher_id == current_user.user_id,
                and_(
                    Exam.offering_id.in_(offering_ids),
                    Exam.status.in_(["approved", "published", "locked"])
                )
            )
        )
    elif role == "hod":
        from app.models import Department, Program
        from app.models.subject_offering import SubjectOffering
        dept = db.query(Department).filter(Department.hod_id == current_user.user_id).first()
        if dept:
             # Find all offerings in department
             dept_offering_ids = db.query(SubjectOffering.id).join(Program).filter(
                 Program.department_id == dept.id
             ).all()
             offering_ids = [row[0] for row in dept_offering_ids if row[0]]
             
             query = query.filter(
                 or_(
                     Exam.teacher_id == current_user.user_id,
                     and_(
                         Exam.offering_id.in_(offering_ids),
                         Exam.status != "draft"
                     )
                 )
             )
        else:
             # If HOD has no dept, they see only their own exams
             query = query.filter(Exam.teacher_id == current_user.user_id)
    
    if subject_id:
        query = query.filter(Exam.subject_id == subject_id)
    if cohort_id:
        query = query.filter(Exam.cohort_id == cohort_id)
    if offering_id:
        query = query.filter(Exam.offering_id == offering_id)
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
    
    # Find the offering for this subject+cohort (required for CO mapping)
    from app.models.subject_offering import SubjectOffering
    offering = db.query(SubjectOffering).filter(
        SubjectOffering.subject_id == exam.subject_id,
        SubjectOffering.cohort_id == exam.cohort_id
    ).first()
    
    new_exam = Exam(
        id=uuid_lib.uuid4(),
        subject_id=exam.subject_id,
        cohort_id=exam.cohort_id,
        offering_id=offering.id if offering else None,  # Link to offering for CO access
        exam_type=exam.exam_type,
        max_marks=exam.max_marks,
        teacher_id=current_user.user_id,
        status="draft"
    )
    db.add(new_exam)
    
    # Audit Log
    from app.models.audit import AuditLog
    audit = AuditLog(
        id=uuid_lib.uuid4(),
        table_name="exams",
        record_id=new_exam.id,
        action="EXAM_CREATE",
        old_data=None,
        new_data={"subject_id": str(exam.subject_id), "type": exam.exam_type},
        user_id=current_user.user_id,
        reason="Exam created"
    )
    db.add(audit)
    
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
    
    # [RBAC] Verify access
    verify_exam_access(db, current_user, exam)
    
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
        offering_id=exam.offering_id,  # Required for CO fetching
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


from app.core.permissions import AppRole

@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: UUID,
    exam_update: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Update exam metadata (title, dates, weightage).
    Only allowed in 'draft' status (or 'submitted' for HOD/Principal).
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # [RBAC] Verify access (HOD=Dept, Teacher=Subject)
    verify_exam_access(db, current_user, exam)
    
    is_hod_or_principal = False
    role_entry = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    if role_entry and role_entry.role in [AppRole.HOD, AppRole.PRINCIPAL]:
        is_hod_or_principal = True
        
    if exam.status == "submitted":
        if not is_hod_or_principal:
             raise HTTPException(status_code=403, detail="Only HOD/Principal can update submitted exams")
    elif exam.status != "draft":
        raise HTTPException(status_code=400, detail="Cannot update published exam")
    
    # Update fields
    if exam_update.max_marks is not None:
        exam.max_marks = exam_update.max_marks
    
    if exam_update.exam_type is not None:
        exam.exam_type = exam_update.exam_type

    # Audit Log
    from app.models.audit import AuditLog
    audit = AuditLog(
        id=uuid_lib.uuid4(),
        table_name="exams",
        record_id=exam_id,
        action="EXAM_UPDATE",
        old_data=None, # TBD: Capture old values if critical
        new_data=exam_update.dict(exclude_unset=True),
        user_id=current_user.user_id,
        reason="Exam metadata updated"
    )
    db.add(audit)

    db.commit()
    db.refresh(exam)
    return exam


@router.put("/{exam_id}/structure", response_model=ExamWithStructure)
async def update_exam_structure(
    exam_id: UUID,
    structure: ExamStructureCreate,
    confirm_wipe_marks: bool = False,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Update exam structure (sections, questions, sub-questions)."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # [RBAC] Verify access
    verify_exam_access(db, current_user, exam)
    
    is_hod_or_principal = False
    if current_user.user_role and current_user.user_role.role in [AppRole.HOD, AppRole.PRINCIPAL]:
        is_hod_or_principal = True
        
    if exam.status == "submitted":
        if not is_hod_or_principal:
             raise HTTPException(status_code=403, detail="Only HOD/Principal can modify submitted exams")
    elif exam.status != "draft":
        raise HTTPException(status_code=400, detail="Cannot modify published exam")
    
    # [FIX] Check for existing marks and handle safeguard
    from app.models.marks import StudentQuestionMark
    existing_marks_count = db.query(StudentQuestionMark).filter(StudentQuestionMark.exam_id == exam_id).count()
    
    if existing_marks_count > 0:
        if not confirm_wipe_marks:
            raise HTTPException(
                status_code=409, # Conflict
                detail=f"This exam has {existing_marks_count} marks entries. Modification will wipe all marks. Please confirm."
            )
        else:
            # Wipe marks
            from app.models import AuditLog
            db.query(StudentQuestionMark).filter(StudentQuestionMark.exam_id == exam_id).delete(synchronize_session=False)
            
            # Log the wipe
            audit_log = AuditLog(
                id=uuid_lib.uuid4(),
                user_id=current_user.user_id,
                action="EXAM_WIPE_MARKS",
                entity_type="exam",
                entity_id=str(exam_id),
                old_value=str(existing_marks_count),
                new_value="0",
                reason="Marks wiped due to structure update"
            )
            db.add(audit_log)

    # Delete existing structure (Manual Cascade to handle DB constraints)
    # 1. Delete SubQuestions
    # 2. Delete Questions
    # 3. Delete Sections
    
    # Get all sections
    sections = db.query(ExamSection).filter(ExamSection.exam_id == exam_id).all()
    section_ids = [s.id for s in sections]
    
    if section_ids:
        # Get all questions
        questions = db.query(Question).filter(Question.section_id.in_(section_ids)).all()
        question_ids = [q.id for q in questions]
        
        if question_ids:
            # Delete SubQuestions
            db.query(SubQuestion).filter(SubQuestion.question_id.in_(question_ids)).delete(synchronize_session=False)
            
            # Delete Questions
            db.query(Question).filter(Question.id.in_(question_ids)).delete(synchronize_session=False)
        
        # Delete Sections
        db.query(ExamSection).filter(ExamSection.id.in_(section_ids)).delete(synchronize_session=False)
        
    db.commit()
    
    # Create new structure
    for section_data in structure.sections:
        section = ExamSection(
            id=uuid_lib.uuid4(),
            exam_id=exam_id,
            name=section_data.name,
            sequence=section_data.sequence,
            max_marks=section_data.max_marks,
            max_questions=section_data.max_questions,
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
            
            if not q_data.sub_questions:
                # [MANDATORY] Auto-create 'a' sub-question if none provided
                # Marks are always stored at sub-question level.
                default_sq = SubQuestion(
                    id=uuid_lib.uuid4(),
                    question_id=question.id,
                    label="a",
                    max_marks=q_data.max_marks, # Inherit max marks from question
                    bloom_level=q_data.bloom_level,
                    co_id=q_data.co_id
                )
                db.add(default_sq)
            else:
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
    
    # Audit Log for Structure Change
    from app.models.audit import AuditLog
    if existing_marks_count == 0: # If marks wiped, already logged above
        audit = AuditLog(
            id=uuid_lib.uuid4(),
            table_name="exams",
            record_id=exam_id,
            action="EXAM_STRUCTURE_UPDATE",
            old_data=None,
            new_data={"sections_count": len(structure.sections)},
            user_id=current_user.user_id,
            reason="Exam structure definition updated"
        )
        db.add(audit)

    db.commit()
    
    # Return updated exam
    return await get_exam(exam_id, db, current_user)


@router.post("/{exam_id}/publish", response_model=ExamResponse)
async def publish_exam(
    exam_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Publish an exam (makes it visible to students)."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.status == "published":
        # Idempotent: return success if already published
        return exam
    
    exam.status = "published"
    exam.published_at = datetime.utcnow()
    db.commit()
    db.refresh(exam)

    # Invalidate Analytics Cache
    if exam.offering_id:
        from app.services.analytics.caching import invalidate_analytics_cache_bg
        background_tasks.add_task(invalidate_analytics_cache_bg, exam.offering_id, None)
    
    return exam


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Delete an exam.
    
    IMMUTABILITY RULE: Only exams in 'draft' or 'submitted' status can be deleted.
    Once approved/locked, exams are immutable for audit compliance.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # [RBAC] Verify access
    verify_exam_access(db, current_user, exam)
    
    # Only allow deletion before approval
    if exam.status not in ["draft", "submitted"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete exam in '{exam.status}' status. Only draft or submitted exams can be deleted."
        )
    
    # Delete associated exam sections (questions cascade via relationship)
    from app.models.exam import ExamSection, Question, SubQuestion
    
    # 1. Delete SubQuestions
    # Get all section IDs first to avoid deep nesting issues
    section_ids = db.query(ExamSection.id).filter(ExamSection.exam_id == exam_id).subquery()
    
    # Get question IDs
    question_ids = db.query(Question.id).filter(Question.section_id.in_(section_ids)).subquery()
    
    db.query(SubQuestion).filter(SubQuestion.question_id.in_(question_ids)).delete(synchronize_session=False)
    
    # 2. Delete Questions
    db.query(Question).filter(Question.section_id.in_(section_ids)).delete(synchronize_session=False)
    
    # 3. Delete ExamSections
    db.query(ExamSection).filter(ExamSection.exam_id == exam_id).delete(synchronize_session=False)
    
    db.delete(exam)
    
    # Audit Log
    from app.models.audit import AuditLog
    audit = AuditLog(
        id=uuid_lib.uuid4(),
        table_name="exams",
        record_id=exam_id,
        action="EXAM_DELETE",
        old_data={"status": exam.status},
        new_data=None,
        user_id=current_user.user_id,
        reason="Exam deleted"
    )
    db.add(audit)
    
    db.commit()
    
    return None


# ============================================================================
# EXAM WORKFLOW: Submit → Approve → Lock (PHASE 1 CRITICAL)
# ============================================================================
# Status Flow: draft → submitted → approved → locked
# - draft: Faculty editing
# - submitted: Faculty finished, awaiting HOD approval
# - approved: HOD approved, marks can be entered
# - locked: Final, no more edits allowed
# ============================================================================

@router.post("/{exam_id}/submit", response_model=ExamResponse)
async def submit_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Submit an exam for HOD approval.
    
    Status transition: draft → submitted
    Only the exam creator can submit.
    """
    from app.models import AuditLog
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Only creator can submit
    if exam.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the exam creator can submit"
        )
    
    # Validate status transition
    if exam.status != "draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit exam with status '{exam.status}'. Must be 'draft'."
        )
    
    # Validate exam has structure
    sections = db.query(ExamSection).filter(ExamSection.exam_id == exam_id).count()
    if sections == 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot submit exam without sections/questions"
        )
    
    old_status = exam.status
    exam.status = "submitted"
    exam.submitted_at = datetime.utcnow()
    
    # Audit log
    audit_log = AuditLog(
        id=uuid_lib.uuid4(),
        user_id=current_user.user_id,
        action="EXAM_SUBMIT",
        entity_type="exam",
        entity_id=str(exam_id),
        old_value=old_status,
        new_value="submitted",
        reason="Faculty submitted for HOD approval"
    )
    db.add(audit_log)

    # NOTIFICATION: Notify HOD
    # Find HOD via Cohort -> Program -> Department (Subject doesn't track Dept directly anymore)
    department_id = None
    subject_code = "Subject"
    
    if exam.cohort and exam.cohort.program:
        department_id = exam.cohort.program.department_id
    
    if exam.subject:
        subject_code = exam.subject.code
    elif exam.offering and exam.offering.subject:
        subject_code = exam.offering.subject.code

    if department_id:
        from app.models.organization import Department
        dept = db.query(Department).filter(Department.id == department_id).first()
        if dept and dept.hod_id:
            from app.models.notification import Notification
            # Notify HOD
            notif = Notification(
                id=uuid_lib.uuid4(),
                user_id=dept.hod_id,
                type="info",
                title="Exam Submitted for Approval",
                message=f"Exam '{subject_code} - {exam.exam_type}' submitted by {current_user.full_name}.",
                link=f"/exams"
            )
            db.add(notif)
    
    db.commit()
    db.refresh(exam)
    
    return exam


@router.post("/{exam_id}/approve", response_model=ExamResponse)
async def approve_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Approve an exam (HOD only).
    
    Status transition: submitted → approved
    After approval, marks entry is allowed.
    """
    from app.models import AuditLog
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Validate status transition
    if exam.status != "submitted":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve exam with status '{exam.status}'. Must be 'submitted'."
        )
    
    old_status = exam.status
    exam.status = "approved"
    exam.approved_at = datetime.utcnow()
    exam.approved_by = current_user.user_id
    
    # Audit log
    audit_log = AuditLog(
        id=uuid_lib.uuid4(),
        user_id=current_user.user_id,
        action="EXAM_APPROVE",
        entity_type="exam",
        entity_id=str(exam_id),
        old_value=old_status,
        new_value="approved",
        reason="HOD approved exam"
    )
    db.add(audit_log)

    # NOTIFICATION: Notify Faculty (Creator)
    if exam.teacher_id:
        from app.models.notification import Notification
        notif = Notification(
            id=uuid_lib.uuid4(),
            user_id=exam.teacher_id,
            type="success",
            title="Exam Approved",
            message=f"Your exam '{exam.subject.code} - {exam.exam_type}' has been approved.",
            link=f"/marks-entry?exam={exam.id}"
        )
        db.add(notif)
    
    db.commit()
    db.refresh(exam)
    
    return exam


@router.post("/{exam_id}/revert", response_model=ExamResponse)
async def revert_exam(
    exam_id: UUID,
    reason: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Revert an APPROVED exam to SUBMITTED status (HOD/Principal only).
    """
    from app.models import AuditLog
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if exam.status != "approved":
        raise HTTPException(status_code=400, detail=f"Cannot revert exam with status '{exam.status}'. Must be 'approved'.")
        
    old_status = exam.status
    exam.status = "submitted"
    exam.approved_at = None
    exam.approved_by = None
    
    # Audit log
    audit_log = AuditLog(
        id=uuid_lib.uuid4(),
        user_id=current_user.user_id,
        action="EXAM_REVERT",
        entity_type="exam",
        entity_id=str(exam_id),
        old_value=old_status,
        new_value="submitted",
        reason=reason
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(exam)
    return exam



@router.post("/{exam_id}/reject", response_model=ExamResponse)
async def reject_exam(
    exam_id: UUID,
    payload: dict = None, # JSON body
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Reject an exam (HOD only).
    Status transition: submitted → draft
    """
    from app.models import AuditLog
    from app.models.notification import Notification
    
    reason = payload.get("reason") if payload else None
    
    if not reason or len(reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.status != "submitted":
        raise HTTPException(status_code=400, detail=f"Cannot reject exam with status '{exam.status}'")
    
    old_status = exam.status
    exam.status = "draft" # Reverts to draft
    
    audit_log = AuditLog(
        id=uuid_lib.uuid4(),
        user_id=current_user.user_id,
        action="EXAM_REJECT",
        entity_type="exam",
        entity_id=str(exam_id),
        old_value=old_status,
        new_value="draft",
        reason=reason
    )
    db.add(audit_log)
    
    # Notify Faculty
    if exam.teacher_id:
        notif = Notification(
            id=uuid_lib.uuid4(),
            user_id=exam.teacher_id,
            type="error", # or warning
            title="Exam Rejected",
            message=f"Your exam '{exam.subject.code}' was rejected. Reason: {reason}",
            link=f"/exams/{exam_id}"
        )
        db.add(notif)
        
    db.commit()
    db.refresh(exam)
    return exam


@router.post("/{exam_id}/lock", response_model=ExamResponse)
async def lock_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Lock an exam (HOD only).
    
    Status transition: approved → locked
    After locking, no marks edits are allowed.
    """
    from app.models import AuditLog
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # [RBAC] Verify access
    verify_exam_access(db, current_user, exam)
    
    # Validate status transition
    if exam.status != "approved":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot lock exam with status '{exam.status}'. Must be 'approved'."
        )
    
    old_status = exam.status
    exam.status = "locked"
    
    # Audit log
    audit_log = AuditLog(
        id=uuid_lib.uuid4(),
        user_id=current_user.user_id,
        action="EXAM_LOCK",
        entity_type="exam",
        entity_id=str(exam_id),
        old_value=old_status,
        new_value="locked",
        reason="HOD locked exam - marks finalized"
    )
    db.add(audit_log)
    
    # NOTIFICATION: Notify Faculty
    if exam.teacher_id:
        from app.models.notification import Notification
        notif = Notification(
            id=uuid_lib.uuid4(),
            user_id=exam.teacher_id,
            type="info",
            title="Exam Locked",
            message=f"Exam '{exam.subject.code}' has been locked by HOD.",
            link=f"/marks-entry?exam={exam.id}"
        )
        db.add(notif)
    
    db.commit()
    db.refresh(exam)
    
    return exam


@router.post("/{exam_id}/unlock", response_model=ExamResponse)
async def unlock_exam(
    exam_id: UUID,
    reason: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Unlock an exam for corrections (HOD only, with reason).
    
    Status transition: locked → approved
    Requires mandatory reason for audit trail.
    """
    from app.models import AuditLog
    
    if not reason or len(reason.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Reason must be at least 10 characters for audit compliance"
        )
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    # [RBAC] Verify access
    verify_exam_access(db, current_user, exam)
    
    if exam.status != "locked":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot unlock exam with status '{exam.status}'. Must be 'locked'."
        )
    
    old_status = exam.status
    exam.status = "approved"
    
    # Audit log with reason
    audit_log = AuditLog(
        id=uuid_lib.uuid4(),
        user_id=current_user.user_id,
        action="EXAM_UNLOCK",
        entity_type="exam",
        entity_id=str(exam_id),
        old_value=old_status,
        new_value="approved",
        reason=reason.strip()
    )
    db.add(audit_log)
    
    # NOTIFICATION: Notify Faculty
    if exam.teacher_id:
        from app.models.notification import Notification
        notif = Notification(
            id=uuid_lib.uuid4(),
            user_id=exam.teacher_id,
            type="warning",
            title="Exam Unlocked",
            message=f"Exam '{exam.subject.code}' unlocked for edits. Reason: {reason}",
            link=f"/marks-entry?exam={exam.id}"
        )
        db.add(notif)
    
    db.commit()
    db.refresh(exam)
    
    return exam
