"""
EduMetrics Backend - Assessment Components Router
Phase 6.2: Extended assessment components (assignments, attendance, activity)

RBAC:
- Assignment creation: HOD/Principal
- Marks entry: Teacher/HOD/Principal
- Bulk import: Teacher/HOD/Principal
- Submit for approval: Teacher
- Approve/Reject: HOD/Principal
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from uuid import UUID
import uuid as uuid_lib
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

from app.database import get_db
from app.api.deps import require_authenticated, require_teacher_or_above, require_hod_or_above
from app.models import Profile, SubjectOffering, Student
from app.models.assessment_components import Assignment, AssignmentMark, AttendanceMark, ActivityMark
from app.api.deps import require_authenticated, require_teacher_or_above, require_hod_or_above, PermissionChecker, Permission

router = APIRouter(prefix="/assessment", tags=["Assessment Components"])


# ============= SCHEMAS =============

class AssignmentCreate(BaseModel):
    assignment_no: int = Field(..., ge=1, le=2, description="1 or 2")
    title: Optional[str] = None
    max_marks: int = Field(default=5, ge=1, le=5)
    due_before_exam: Optional[str] = Field(None, pattern="^(INT1|INT2)$")


class AssignmentResponse(BaseModel):
    id: UUID
    offering_id: UUID
    assignment_no: int
    title: Optional[str]
    max_marks: int
    due_before_exam: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AssignmentMarkEntry(BaseModel):
    usn: str
    marks: float = Field(..., ge=0, le=5)


class AssignmentMarkBulk(BaseModel):
    marks: List[AssignmentMarkEntry]


class AssignmentMarkResponse(BaseModel):
    id: UUID
    assignment_id: UUID
    usn: str
    marks: float
    entered_at: datetime

    class Config:
        from_attributes = True


class AttendanceEntry(BaseModel):
    usn: str
    marks: float = Field(..., ge=0, le=5)


class AttendanceBulkImport(BaseModel):
    marks: List[AttendanceEntry]


class AttendanceMarkResponse(BaseModel):
    id: UUID
    offering_id: UUID
    usn: str
    marks: float
    imported_at: datetime

    class Config:
        from_attributes = True


class ActivityEntry(BaseModel):
    usn: str
    marks: float = Field(..., ge=0, le=5)


class ActivityBulkImport(BaseModel):
    marks: List[ActivityEntry]


class ActivityMarkResponse(BaseModel):
    id: UUID
    offering_id: UUID
    usn: str
    marks: float
    imported_at: datetime

    class Config:
        from_attributes = True


# ============= ASSIGNMENT ENDPOINTS =============

@router.get(
    "/offering/{offering_id}/assignments",
    response_model=List[AssignmentResponse],
    dependencies=[Depends(PermissionChecker(Permission.MARKS_ENTRY))]
)
async def list_assignments(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """List assignments for a subject offering."""
    assignments = db.query(Assignment).filter(
        Assignment.offering_id == offering_id
    ).order_by(Assignment.assignment_no).all()
    return assignments


@router.post(
    "/offering/{offering_id}/assignments",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(PermissionChecker(Permission.CO_MANAGE))]
)
async def create_assignment(
    offering_id: UUID,
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Create assignment for offering. RBAC: HOD/Principal."""
    # Verify offering exists
    offering = db.query(SubjectOffering).filter(SubjectOffering.id == offering_id).first()
    if not offering:
        raise HTTPException(status_code=404, detail="Subject offering not found")
    
    # Check for duplicate assignment number
    existing = db.query(Assignment).filter(
        Assignment.offering_id == offering_id,
        Assignment.assignment_no == data.assignment_no
    ).first()
    if existing:
        raise HTTPException(
            status_code=409, 
            detail=f"Assignment {data.assignment_no} already exists for this offering"
        )
    
    assignment = Assignment(
        id=uuid_lib.uuid4(),
        offering_id=offering_id,
        assignment_no=data.assignment_no,
        title=data.title,
        max_marks=data.max_marks,
        due_before_exam=data.due_before_exam
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.post(
    "/assignment/{assignment_id}/marks",
    response_model=dict,
    dependencies=[Depends(PermissionChecker(Permission.MARKS_ENTRY))]
)
async def save_assignment_marks(
    assignment_id: UUID,
    data: AssignmentMarkBulk,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Bulk save assignment marks. RBAC: Teacher/HOD/Principal."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    saved_count = 0
    for entry in data.marks:
        # Verify student exists
        student = db.query(Student).filter(Student.usn == entry.usn).first()
        if not student:
            continue  # Skip invalid USNs
        
        # Check for existing mark
        existing = db.query(AssignmentMark).filter(
            AssignmentMark.assignment_id == assignment_id,
            AssignmentMark.usn == entry.usn
        ).first()
        
        if existing:
            existing.marks = Decimal(str(entry.marks))
            existing.entered_by = current_user.user_id
            existing.entered_at = datetime.utcnow()
        else:
            mark = AssignmentMark(
                id=uuid_lib.uuid4(),
                assignment_id=assignment_id,
                usn=entry.usn,
                marks=Decimal(str(entry.marks)),
                entered_by=current_user.user_id
            )
            db.add(mark)
        saved_count += 1
    
    db.commit()
    return {"success": True, "saved_count": saved_count}


@router.get(
    "/assignment/{assignment_id}/marks",
    response_model=List[AssignmentMarkResponse],
    dependencies=[Depends(PermissionChecker(Permission.MARKS_ENTRY))]
)
async def get_assignment_marks(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Get all marks for an assignment."""
    marks = db.query(AssignmentMark).filter(
        AssignmentMark.assignment_id == assignment_id
    ).all()
    return marks


# ============= ATTENDANCE ENDPOINTS =============

@router.post(
    "/offering/{offering_id}/attendance/bulk",
    response_model=dict,
    dependencies=[Depends(PermissionChecker(Permission.MARKS_ENTRY))]
)
async def bulk_import_attendance(
    offering_id: UUID,
    data: AttendanceBulkImport,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Bulk import attendance marks (5 marks contribution).
    Uses UPSERT - existing records are updated.
    RBAC: Teacher/HOD/Principal.
    """
    offering = db.query(SubjectOffering).filter(SubjectOffering.id == offering_id).first()
    if not offering:
        raise HTTPException(status_code=404, detail="Subject offering not found")
    
    saved_count = 0
    skipped = []
    
    for entry in data.marks:
        # Verify student exists
        student = db.query(Student).filter(Student.usn == entry.usn).first()
        if not student:
            skipped.append(entry.usn)
            continue
        
        # UPSERT logic
        existing = db.query(AttendanceMark).filter(
            AttendanceMark.offering_id == offering_id,
            AttendanceMark.usn == entry.usn
        ).first()
        
        if existing:
            existing.marks = Decimal(str(entry.marks))
            existing.imported_by = current_user.user_id
            existing.imported_at = datetime.utcnow()
        else:
            mark = AttendanceMark(
                id=uuid_lib.uuid4(),
                offering_id=offering_id,
                usn=entry.usn,
                marks=Decimal(str(entry.marks)),
                imported_by=current_user.user_id
            )
            db.add(mark)
        saved_count += 1
    
    db.commit()
    return {
        "success": True, 
        "saved_count": saved_count,
        "skipped_usns": skipped
    }


@router.get(
    "/offering/{offering_id}/attendance",
    response_model=List[AttendanceMarkResponse],
    dependencies=[Depends(PermissionChecker(Permission.MARKS_ENTRY))]
)
async def get_attendance_marks(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Get all attendance marks for an offering."""
    marks = db.query(AttendanceMark).filter(
        AttendanceMark.offering_id == offering_id
    ).all()
    return marks


# ============= ACTIVITY ENDPOINTS =============

@router.post(
    "/offering/{offering_id}/activity/bulk",
    response_model=dict,
    dependencies=[Depends(PermissionChecker(Permission.MARKS_ENTRY))]
)
async def bulk_import_activity(
    offering_id: UUID,
    data: ActivityBulkImport,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Bulk import classroom activity marks (5 marks contribution).
    Uses UPSERT - existing records are updated.
    RBAC: Teacher/HOD/Principal.
    """
    offering = db.query(SubjectOffering).filter(SubjectOffering.id == offering_id).first()
    if not offering:
        raise HTTPException(status_code=404, detail="Subject offering not found")
    
    saved_count = 0
    skipped = []
    
    for entry in data.marks:
        # Verify student exists
        student = db.query(Student).filter(Student.usn == entry.usn).first()
        if not student:
            skipped.append(entry.usn)
            continue
        
        # UPSERT logic
        existing = db.query(ActivityMark).filter(
            ActivityMark.offering_id == offering_id,
            ActivityMark.usn == entry.usn
        ).first()
        
        if existing:
            existing.marks = Decimal(str(entry.marks))
            existing.imported_by = current_user.user_id
            existing.imported_at = datetime.utcnow()
        else:
            mark = ActivityMark(
                id=uuid_lib.uuid4(),
                offering_id=offering_id,
                usn=entry.usn,
                marks=Decimal(str(entry.marks)),
                imported_by=current_user.user_id
            )
            db.add(mark)
        saved_count += 1
    
    db.commit()
    return {
        "success": True, 
        "saved_count": saved_count,
        "skipped_usns": skipped
    }


@router.get(
    "/offering/{offering_id}/activity",
    response_model=List[ActivityMarkResponse],
    dependencies=[Depends(PermissionChecker(Permission.MARKS_ENTRY))]
)
async def get_activity_marks(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Get all activity marks for an offering."""
    marks = db.query(ActivityMark).filter(
        ActivityMark.offering_id == offering_id
    ).all()
    return marks
