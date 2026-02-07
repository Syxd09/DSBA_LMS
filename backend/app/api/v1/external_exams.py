"""
EduMetrics Backend - External Exams Router
Phase 6.2: External exam management and marks import

RBAC:
- Create external exam: HOD/Principal
- Import external marks: HOD/Principal (university results import-only)
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import uuid as uuid_lib
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

from app.database import get_db
from app.api.deps import require_hod_or_above
from app.models import Profile, SubjectOffering, Cohort, Student, Exam
from app.models.marks import FinalMarks
from app.api.deps import require_hod_or_above, PermissionChecker, Permission

router = APIRouter(prefix="/external", tags=["External Exams"])


# ============= SCHEMAS =============

class ExternalExamCreate(BaseModel):
    offering_id: UUID
    cohort_id: UUID
    max_marks: int = Field(default=60, ge=1, le=100)


class ExternalExamResponse(BaseModel):
    id: UUID
    offering_id: Optional[UUID]
    cohort_id: UUID
    exam_type: str
    max_marks: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ExternalMarkEntry(BaseModel):
    usn: str
    marks: float = Field(..., ge=0, le=60, description="External exam marks (0-60)")


class ExternalMarksBulk(BaseModel):
    marks: List[ExternalMarkEntry]


class ExternalMarkResponse(BaseModel):
    usn: str
    external_marks: float
    updated_at: datetime


# ============= EXTERNAL EXAM ENDPOINTS =============

@router.post(
    "",
    response_model=ExternalExamResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(PermissionChecker(Permission.MARKS_APPROVE))]
)
async def create_external_exam(
    data: ExternalExamCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Create external exam for offering.
    External exams are for semester-end university exams (60 marks).
    RBAC: HOD/Principal.
    """
    # Verify offering exists
    offering = db.query(SubjectOffering).filter(SubjectOffering.id == data.offering_id).first()
    if not offering:
        raise HTTPException(status_code=404, detail="Subject offering not found")
    
    # Verify cohort exists
    cohort = db.query(Cohort).filter(Cohort.id == data.cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    # Check for existing external exam
    existing = db.query(Exam).filter(
        Exam.offering_id == data.offering_id,
        Exam.cohort_id == data.cohort_id,
        Exam.exam_type == "EXT"
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="External exam already exists for this offering")
    
    exam = Exam(
        id=uuid_lib.uuid4(),
        offering_id=data.offering_id,
        cohort_id=data.cohort_id,
        exam_type="EXT",
        max_marks=data.max_marks,
        status="draft"
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


@router.get(
    "/offering/{offering_id}",
    response_model=List[ExternalExamResponse],
    dependencies=[Depends(PermissionChecker(Permission.MARKS_APPROVE))]
)
async def get_external_exams(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Get all external exams for an offering."""
    exams = db.query(Exam).filter(
        Exam.offering_id == offering_id,
        Exam.exam_type == "EXT"
    ).all()
    return exams


@router.post(
    "/{exam_id}/marks/bulk",
    response_model=dict,
    dependencies=[Depends(PermissionChecker(Permission.MARKS_APPROVE))]
)
async def bulk_import_external_marks(
    exam_id: UUID,
    data: ExternalMarksBulk,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Bulk import external exam marks from university results.
    This updates FinalMarks.external_marks for each student.
    
    NOTE: External marks are import-only from official university results.
    RBAC: HOD/Principal.
    """
    exam = db.query(Exam).filter(
        Exam.id == exam_id,
        Exam.exam_type == "EXT"
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="External exam not found")
    
    offering_id = exam.offering_id
    cohort_id = exam.cohort_id
    
    saved_count = 0
    skipped = []
    
    for entry in data.marks:
        # Verify student exists
        student = db.query(Student).filter(Student.usn == entry.usn).first()
        if not student:
            skipped.append(entry.usn)
            continue
        
        # Find or create FinalMarks record
        final = db.query(FinalMarks).filter(
            FinalMarks.usn == entry.usn,
            FinalMarks.offering_id == offering_id,
            FinalMarks.cohort_id == cohort_id
        ).first()
        
        if final:
            final.external_marks = Decimal(str(entry.marks))
            final.updated_at = datetime.utcnow()
        else:
            final = FinalMarks(
                id=uuid_lib.uuid4(),
                usn=entry.usn,
                offering_id=offering_id,
                cohort_id=cohort_id,
                external_marks=Decimal(str(entry.marks))
            )
            db.add(final)
        saved_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "exam_id": str(exam_id),
        "saved_count": saved_count,
        "skipped_usns": skipped
    }


@router.get(
    "/{exam_id}/marks",
    response_model=List[dict],
    dependencies=[Depends(PermissionChecker(Permission.MARKS_APPROVE))]
)
async def get_external_marks(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Get external marks for an exam (from FinalMarks table)."""
    exam = db.query(Exam).filter(
        Exam.id == exam_id,
        Exam.exam_type == "EXT"
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="External exam not found")
    
    final_marks = db.query(FinalMarks).filter(
        FinalMarks.offering_id == exam.offering_id,
        FinalMarks.cohort_id == exam.cohort_id,
        FinalMarks.external_marks.isnot(None)
    ).all()
    
    return [
        {
            "usn": fm.usn,
            "external_marks": float(fm.external_marks) if fm.external_marks else None,
            "updated_at": fm.updated_at.isoformat() if fm.updated_at else None
        }
        for fm in final_marks
    ]


@router.put(
    "/{exam_id}/lock",
    response_model=dict,
    dependencies=[Depends(PermissionChecker(Permission.MARKS_APPROVE))]
)
async def lock_external_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Lock external exam - no further edits allowed.
    RBAC: HOD/Principal.
    """
    exam = db.query(Exam).filter(
        Exam.id == exam_id,
        Exam.exam_type == "EXT"
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="External exam not found")
    
    if exam.status == "locked":
        raise HTTPException(status_code=400, detail="Exam is already locked")
    
    exam.status = "locked"
    exam.approved_at = datetime.utcnow()
    exam.approved_by = current_user.user_id
    db.commit()
    
    return {
        "success": True,
        "exam_id": str(exam_id),
        "status": "locked",
        "locked_by": str(current_user.user_id)
    }
