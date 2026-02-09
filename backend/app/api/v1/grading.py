"""
EduMetrics Backend - Grading Router
Grade calculation and management endpoints

NOTE: MarksComputed has been REMOVED per the "no stored analytics" rule.
All computation is now on-demand via Phase-2A functions.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
import uuid as uuid_lib
from decimal import Decimal
from datetime import datetime

from app.database import get_db
from app.api.deps import require_teacher_or_above, require_hod_or_above, require_principal
from app.models import (
    Profile, GradingRule, GradeScale, FinalMarks, Exam, StudentMarks,
    Subject, SemesterResult, StudentEnrollment, SubQuestion, Question, ExamSection
)
from app.schemas import (
    GradingRuleResponse, FinalMarksResponse,
    CalculateGradesRequest, CalculateSGPARequest, SemesterResultResponse
)
from app.core.audit import create_audit_log

router = APIRouter(prefix="/grading", tags=["Grading"])


# ============================================================================
# GRADE SCALES ENDPOINTS
# ============================================================================

@router.get("/scales")
async def get_grade_scales(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Get all grade scales."""
    scales = db.query(GradeScale).order_by(GradeScale.name).all()
    return [{"id": str(s.id), "name": s.name, "description": s.description} for s in scales]


@router.post("/scales")
async def create_grade_scale(
    scale_data: dict,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_principal)
):
    """Create a new grade scale."""
    if "name" not in scale_data:
        raise HTTPException(status_code=400, detail="Missing required field: name")
    
    existing = db.query(GradeScale).filter(GradeScale.name == scale_data["name"]).first()
    if existing:
        raise HTTPException(status_code=409, detail="Grade scale with this name already exists")
    
    scale = GradeScale(
        id=uuid_lib.uuid4(),
        name=scale_data["name"],
        description=scale_data.get("description")
    )
    db.add(scale)
    db.commit()
    db.refresh(scale)
    
    return {"id": str(scale.id), "name": scale.name, "description": scale.description}


# ============================================================================
# GRADING RULES ENDPOINTS
# ============================================================================


def _compute_exam_total_for_student(
    db: Session,
    exam_id: UUID,
    student_id: UUID
) -> Decimal:
    """
    Compute exam total for a student on-demand.
    
    This replaces the stored MarksComputed table.
    Implements BEST_N selection logic.
    """
    # Get all sections
    sections = db.query(ExamSection).filter(ExamSection.exam_id == exam_id).all()
    
    # Get all marks for this student and exam
    student_marks = db.query(StudentMarks).filter(
        StudentMarks.exam_id == exam_id,
        StudentMarks.student_id == student_id
    ).all()
    
    if not student_marks:
        return None
    
    total = Decimal(0)
    
    for section in sections:
        section_questions = db.query(Question).filter(Question.section_id == section.id).all()
        
        if section.selection_mode == "BEST_N":
            # Calculate total for each question
            question_totals = []
            for question in section_questions:
                sub_questions = db.query(SubQuestion).filter(SubQuestion.question_id == question.id).all()
                sq_ids = [sq.id for sq in sub_questions]
                
                q_marks = sum(
                    m.marks for m in student_marks 
                    if m.sub_question_id in sq_ids
                )
                question_totals.append(q_marks)
            
            # Sort and take best N
            question_totals.sort(reverse=True)
            best = question_totals[:section.required_questions]
            total += sum(best)
        else:
            # FIRST_N or ALL - sum all at marks
            for question in section_questions[:section.required_questions]:
                sub_questions = db.query(SubQuestion).filter(SubQuestion.question_id == question.id).all()
                sq_ids = [sq.id for sq in sub_questions]
                
                q_marks = sum(
                    m.marks for m in student_marks 
                    if m.sub_question_id in sq_ids
                )
                total += q_marks
    
    return total


@router.get("/rules", response_model=List[GradingRuleResponse])
async def get_grading_rules(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Get all grading rules."""
    rules = db.query(GradingRule).order_by(GradingRule.min_percentage.desc()).all()
    return rules


@router.post("/rules", response_model=GradingRuleResponse)
async def create_grading_rule(
    rule_data: dict,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_principal)
):
    """Create a new grading rule."""
    # Validate required fields - FIX: Added grade_scale_id to required fields
    required_fields = ["grade_scale_id", "grade", "min_percentage", "max_percentage", "grade_point"]
    for field in required_fields:
        if field not in rule_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Verify grade scale exists
    grade_scale = db.query(GradeScale).filter(GradeScale.id == rule_data["grade_scale_id"]).first()
    if not grade_scale:
        raise HTTPException(status_code=404, detail="Grade scale not found")
    
    # Check for overlapping ranges within the same scale
    existing = db.query(GradingRule).filter(
        GradingRule.grade_scale_id == rule_data["grade_scale_id"],
        GradingRule.min_percentage <= rule_data["max_percentage"],
        GradingRule.max_percentage >= rule_data["min_percentage"]
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Grade range overlaps with existing rule: {existing.grade}"
        )
    
    rule = GradingRule(
        id=uuid_lib.uuid4(),
        grade_scale_id=rule_data["grade_scale_id"],  # FIX: Set required FK
        grade=rule_data["grade"],
        min_percentage=Decimal(str(rule_data["min_percentage"])),
        max_percentage=Decimal(str(rule_data["max_percentage"])),
        grade_point=Decimal(str(rule_data["grade_point"])),
        description=rule_data.get("description")
    )
    db.add(rule)
    
    # Audit Log
    create_audit_log(
        db=db,
        user_id=current_user.user_id,
        action="INSERT",
        table_name="grading_rules",
        record_id=rule.id,
        new_data=rule_data
    )
    
    db.commit()
    db.refresh(rule)
    
    return rule


@router.delete("/rules/{rule_id}")
async def delete_grading_rule(
    rule_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Delete a grading rule."""
    rule = db.query(GradingRule).filter(GradingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Grading rule not found")
    
    db.delete(rule)
    
    # Audit Log
    create_audit_log(
        db=db,
        user_id=current_user.user_id,
        action="DELETE",
        table_name="grading_rules",
        record_id=rule.id,
        old_data={"grade": rule.grade}
    )
    
    db.commit()
    
    return {"message": "Grading rule deleted successfully"}


@router.post("/calculate", response_model=List[FinalMarksResponse])
async def calculate_grades(
    request: CalculateGradesRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Calculate grades for a cohort and subject.
    
    NOTE: Now uses on-demand computation instead of MarksComputed table.
    """
    # Get grading rules
    rules = db.query(GradingRule).order_by(GradingRule.min_percentage.desc()).all()
    if not rules:
        raise HTTPException(status_code=400, detail="No grading rules configured")
    
    # Get exams for this subject and cohort
    internal1_exam = db.query(Exam).filter(
        Exam.subject_id == request.subject_id,
        Exam.cohort_id == request.cohort_id,
        Exam.exam_type == "internal1",
        Exam.status.in_(["published", "locked"])
    ).first()
    
    internal2_exam = db.query(Exam).filter(
        Exam.subject_id == request.subject_id,
        Exam.cohort_id == request.cohort_id,
        Exam.exam_type == "internal2",
        Exam.status.in_(["published", "locked"])
    ).first()
    
    # Get students in cohort
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.cohort_id == request.cohort_id,
        StudentEnrollment.status == "active"
    ).all()
    
    results = []
    
    for enrollment in enrollments:
        student_id = enrollment.student_id
        
        # Compute internal 1 marks ON-DEMAND (no MarksComputed)
        internal1_marks = None
        if internal1_exam:
            computed = _compute_exam_total_for_student(db, internal1_exam.id, student_id)
            if computed is not None:
                internal1_marks = float(computed)
        
        # Compute internal 2 marks ON-DEMAND (no MarksComputed)
        internal2_marks = None
        if internal2_exam:
            computed = _compute_exam_total_for_student(db, internal2_exam.id, student_id)
            if computed is not None:
                internal2_marks = float(computed)
        
        # Calculate best internal
        best_internal = max(internal1_marks or 0, internal2_marks or 0)
        
        # TODO: Add external marks when implemented
        external_marks = None
        
        # Calculate total and percentage
        # Assuming internal is out of 30 and external is out of 70
        total = best_internal  # Simplified - add external when available
        max_total = (internal1_exam.max_marks if internal1_exam else 30)  # Simplified
        percentage = (total / max_total * 100) if max_total > 0 else 0
        
        # Determine grade
        grade = "F"
        grade_point = Decimal(0)
        for rule in rules:
            if percentage >= float(rule.min_percentage):
                grade = rule.grade
                grade_point = rule.grade_point
                break
        
        # Save or update final marks
        existing = db.query(FinalMarks).filter(
            FinalMarks.student_id == student_id,
            FinalMarks.subject_id == request.subject_id,
            FinalMarks.cohort_id == request.cohort_id
        ).first()
        
        if existing:
            existing.internal_1 = Decimal(str(internal1_marks)) if internal1_marks else None
            existing.internal_2 = Decimal(str(internal2_marks)) if internal2_marks else None
            existing.best_internal = Decimal(str(best_internal))
            existing.external_marks = Decimal(str(external_marks)) if external_marks else None
            existing.total_marks = Decimal(str(total))
            existing.percentage = Decimal(str(round(percentage, 2)))
            existing.grade = grade
            existing.grade_point = grade_point
            existing.updated_at = datetime.utcnow()
            final_mark = existing
        else:
            final_mark = FinalMarks(
                id=uuid_lib.uuid4(),
                student_id=student_id,
                subject_id=request.subject_id,
                cohort_id=request.cohort_id,
                internal_1=Decimal(str(internal1_marks)) if internal1_marks else None,
                internal_2=Decimal(str(internal2_marks)) if internal2_marks else None,
                best_internal=Decimal(str(best_internal)),
                external_marks=Decimal(str(external_marks)) if external_marks else None,
                total_marks=Decimal(str(total)),
                percentage=Decimal(str(round(percentage, 2))),
                grade=grade,
                grade_point=grade_point
            )
            db.add(final_mark)
        
        db.flush()
        
        results.append(FinalMarksResponse(
            id=final_mark.id,
            student_id=student_id,
            subject_id=request.subject_id,
            cohort_id=request.cohort_id,
            internal_1=internal1_marks,
            internal_2=internal2_marks,
            best_internal=best_internal,
            external_marks=external_marks,
            total_marks=total,
            percentage=round(percentage, 2),
            grade=grade,
            grade_point=float(grade_point),
            created_at=final_mark.created_at
        ))
    
    db.commit()
    
    return results


@router.get("/final-marks", response_model=List[FinalMarksResponse])
async def get_final_marks(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above),
    cohort_id: UUID = None,
    subject_id: UUID = None
):
    """Get final marks with optional filters."""
    query = db.query(FinalMarks).options(joinedload(FinalMarks.student))
    
    if cohort_id:
        query = query.filter(FinalMarks.cohort_id == cohort_id)
    if subject_id:
        query = query.filter(FinalMarks.subject_id == subject_id)
    
    marks = query.all()
    return marks

