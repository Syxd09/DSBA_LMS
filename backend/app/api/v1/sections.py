"""
EduMetrics Backend - Sections Router
Manage cohort sections (A, B, C...)
"""
from typing import List
from uuid import UUID
import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.api.deps import require_authenticated, require_hod_or_above
from app.models import Section, Cohort, Profile
from app.schemas.organization import SectionCreate, SectionResponse, SectionUpdate

router = APIRouter(prefix="/sections", tags=["Sections"])

@router.get("/by-cohort/{cohort_id}", response_model=List[SectionResponse])
async def list_sections(
    cohort_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """List sections for a cohort."""
    sections = db.query(Section).filter(Section.cohort_id == cohort_id).order_by(Section.name).all()
    return sections

@router.post("/by-cohort/{cohort_id}", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
async def create_section(
    cohort_id: UUID,
    section: SectionCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Create a new section for a cohort."""
    cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
        
    # Check duplicate name in cohort
    existing = db.query(Section).filter(
        Section.cohort_id == cohort_id,
        Section.name == section.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Section with this name already exists in cohort")

    new_section = Section(
        id=uuid_lib.uuid4(),
        cohort_id=cohort_id,
        name=section.name
    )
    db.add(new_section)
    db.commit()
    db.refresh(new_section)
    return new_section

@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    section_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Delete a section."""
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
        
    # Check if students are enrolled?
    # db.query(Student).filter(Student.section_id == section_id).count() 
    # If students exist, prevent delete or set to null?
    # Implementation choice: Prevent delete for safety
    from app.models import Student
    student_count = db.query(Student).filter(Student.section_id == section_id).count()
    if student_count > 0:
         raise HTTPException(status_code=400, detail="Cannot delete section with enrolled students")

    db.delete(section)
    db.commit()
