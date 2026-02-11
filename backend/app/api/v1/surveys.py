from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.api.deps import require_authenticated, PermissionChecker, Permission
from app.models import Profile, Student, UserRole, Department
from app.models.survey import Survey, SurveyQuestion, SurveyResponse, SurveyQuestionResponse
from app.schemas.survey import SurveyCreate, SurveyDTO, SurveySubmission

router = APIRouter(prefix="/surveys", tags=["Surveys (Indirect Attainment)"])

@router.post("/", response_model=SurveyDTO)
async def create_survey(
    survey_in: SurveyCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
):
    """
    Create a new survey (HOD/Principal only).
    """
    # Verify RBAC: Must be HOD or PRINCIPAL
    user_role = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    if not user_role or user_role.role.upper() not in ["HOD", "PRINCIPAL", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized to create surveys")
    
    # If HOD, verify program belongs to their department
    if user_role.role.upper() == "HOD":
        # Get dept of HOD
        dept = db.query(Department).filter(Department.hod_id == current_user.user_id).first()
        if not dept:
             raise HTTPException(status_code=403, detail="No department assigned")
        # Check program dept
        # We need to query Program to check dept_id
        from app.models import Program
        program = db.query(Program).filter(Program.id == survey_in.program_id).first()
        if not program or program.department_id != dept.id:
            raise HTTPException(status_code=403, detail="Cannot create survey for program outside department")

    # Create survey
    survey = Survey(
        title=survey_in.title,
        description=survey_in.description,
        survey_type=survey_in.survey_type,
        program_id=survey_in.program_id,
        academic_year=survey_in.academic_year,
        is_active=survey_in.is_active,
        created_by=current_user.user_id
    )
    db.add(survey)
    db.flush()
    
    for q in survey_in.questions:
        question = SurveyQuestion(
            survey_id=survey.id,
            question_text=q.question_text,
            sequence=q.sequence,
            mapped_po_id=q.mapped_po_id,
            mapped_pso_id=q.mapped_pso_id
        )
        db.add(question)
    
    db.commit()
    db.refresh(survey)
    return survey

@router.get("/active", response_model=List[SurveyDTO])
async def get_active_surveys(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Get active surveys for the current student's program.
    """
    # Get student record with cohort loaded
    student = db.query(Student).options(joinedload(Student.cohort)).filter(Student.user_id == current_user.user_id).first()
    
    if not student:
        raise HTTPException(status_code=403, detail="Only students can access active surveys")
    
    if not student.cohort:
         # If no cohort, return empty or 404? Empty is safer.
         return []
         
    program_id = student.cohort.program_id
    
    # Get active surveys for this program
    surveys = db.query(Survey).options(joinedload(Survey.questions)).filter(
        Survey.program_id == program_id,
        Survey.is_active == True
    ).all()
    
    # Optional: Filter out already submitted ones?
    # For now, let frontend handle it or check if user has submitted
    # We can add a field `submitted` in response DTO if needed, but sticking to basic DTO for now.
    
    return surveys

@router.post("/{survey_id}/submit")
async def submit_survey(
    survey_id: UUID,
    submission: SurveySubmission,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Submit a survey response.
    """
    # Verify student
    student = db.query(Student).filter(Student.user_id == current_user.user_id).first()
    if not student:
        raise HTTPException(status_code=403, detail="Only students can submit surveys")
        
    # Check if already submitted
    existing = db.query(SurveyResponse).filter(
        SurveyResponse.survey_id == survey_id,
        SurveyResponse.student_id == current_user.user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Survey already submitted")
        
    # Valid survey?
    survey = db.query(Survey).filter(Survey.id == survey_id, Survey.is_active == True).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found or inactive")
        
    # Create response
    response = SurveyResponse(
        survey_id=survey_id,
        student_id=current_user.user_id
    )
    db.add(response)
    db.flush()
    
    for ans in submission.answers:
        # Verify question belongs to survey
        q = db.query(SurveyQuestion).filter(SurveyQuestion.id == ans.question_id, SurveyQuestion.survey_id == survey_id).first()
        if q:
            a = SurveyQuestionResponse(
                response_id=response.id,
                question_id=ans.question_id,
                score=ans.score
            )
            db.add(a)
        
    db.commit()
    return {"success": True}
