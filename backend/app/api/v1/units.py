"""
EduMetrics Backend - Units Router
CRUD endpoints for Units per SubjectOffering.

RBAC: Faculty + HOD can manage Units for their offerings.
"""
import logging
from typing import List, Optional
from uuid import UUID
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.api.deps import require_authenticated, require_teacher_or_above, require_hod_or_above
from app.models import Profile, SubjectOffering, Unit, Topic, TeacherAssignment
from app.schemas.unit_topic import (
    UnitCreate, UnitUpdate, UnitResponse, UnitWithTopicsResponse,
    TopicCreate, TopicUpdate, TopicResponse,
    UnitReorderRequest, BulkTopicCreate
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/units", tags=["Units & Topics"])


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _check_offering_access(
    db: Session, 
    offering_id: UUID, 
    user: Profile,
    require_write: bool = False
) -> SubjectOffering:
    """
    Check if user has access to this offering.
    Teachers can only access their assigned offerings.
    HOD/Principal have department/college-wide access.
    """
    offering = db.query(SubjectOffering).filter(
        SubjectOffering.id == offering_id
    ).first()
    
    if not offering:
        raise HTTPException(status_code=404, detail="Subject Offering not found")
    
    # For read access, just check if authenticated
    if not require_write:
        return offering
    
    # For write access, check assignment
    # HOD/Principal bypass
    from app.core.permissions import AppRole
    from app.models import UserRole
    
    user_roles = db.query(UserRole).filter(UserRole.user_id == user.user_id).all()
    roles = [r.role for r in user_roles]
    
    if AppRole.PRINCIPAL in roles or AppRole.HOD in roles:
        return offering
    
    # Teacher must be assigned to this offering
    assignment = db.query(TeacherAssignment).filter(
        TeacherAssignment.teacher_id == user.user_id,
        TeacherAssignment.offering_id == offering_id
    ).first()
    
    if not assignment:
        raise HTTPException(
            status_code=403, 
            detail="You are not assigned to this subject offering"
        )
    
    return offering


def _compute_topics_count(db: Session, unit_id: UUID) -> int:
    """Compute topics count for a unit."""
    return db.query(func.count(Topic.id)).filter(Topic.unit_id == unit_id).scalar() or 0


# ============================================================================
# UNIT ENDPOINTS
# ============================================================================

@router.get("/by-offering/{offering_id}", response_model=List[UnitResponse])
async def list_units(
    offering_id: UUID,
    include_topics: bool = Query(False, description="Include nested topics"),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    List all units for a subject offering.
    
    Accessible by: Any authenticated user (for reading).
    """
    _check_offering_access(db, offering_id, current_user, require_write=False)
    
    query = db.query(Unit).filter(Unit.offering_id == offering_id)
    
    if include_topics:
        query = query.options(joinedload(Unit.topics))
    
    units = query.order_by(Unit.unit_no).all()
    
    # Add topics count to response
    result = []
    for unit in units:
        unit_dict = {
            "id": unit.id,
            "offering_id": unit.offering_id,
            "unit_no": unit.unit_no,
            "name": unit.name,
            "created_at": unit.created_at,
            "topics_count": _compute_topics_count(db, unit.id)
        }
        if include_topics:
            unit_dict["topics"] = unit.topics
        result.append(unit_dict)
    
    return result


@router.post("/by-offering/{offering_id}", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
async def create_unit(
    offering_id: UUID,
    unit_data: UnitCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Create a new unit for a subject offering.
    
    Accessible by: Faculty (assigned) + HOD + Principal.
    """
    _check_offering_access(db, offering_id, current_user, require_write=True)
    
    # Check for duplicate unit number
    existing = db.query(Unit).filter(
        Unit.offering_id == offering_id,
        Unit.unit_no == unit_data.unit_no
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Unit {unit_data.unit_no} already exists for this offering"
        )
    
    new_unit = Unit(
        id=uuid_lib.uuid4(),
        offering_id=offering_id,
        unit_no=unit_data.unit_no,
        name=unit_data.name
    )
    
    db.add(new_unit)
    db.commit()
    db.refresh(new_unit)
    
    logger.info(f"Created unit {new_unit.id} for offering {offering_id}")
    
    return {
        **new_unit.__dict__,
        "topics_count": 0
    }


@router.get("/{unit_id}", response_model=UnitWithTopicsResponse)
async def get_unit(
    unit_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Get a unit with its topics.
    
    Accessible by: Any authenticated user.
    """
    unit = db.query(Unit).options(
        joinedload(Unit.topics)
    ).filter(Unit.id == unit_id).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    return {
        **unit.__dict__,
        "topics_count": len(unit.topics),
        "topics": unit.topics
    }


@router.put("/{unit_id}", response_model=UnitResponse)
async def update_unit(
    unit_id: UUID,
    unit_data: UnitUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Update a unit.
    
    Accessible by: Faculty (assigned) + HOD + Principal.
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    _check_offering_access(db, unit.offering_id, current_user, require_write=True)
    
    # Check for duplicate unit number if changing
    if unit_data.unit_no is not None and unit_data.unit_no != unit.unit_no:
        existing = db.query(Unit).filter(
            Unit.offering_id == unit.offering_id,
            Unit.unit_no == unit_data.unit_no,
            Unit.id != unit_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Unit {unit_data.unit_no} already exists for this offering"
            )
        unit.unit_no = unit_data.unit_no
    
    if unit_data.name is not None:
        unit.name = unit_data.name
    
    db.commit()
    db.refresh(unit)
    
    return {
        **unit.__dict__,
        "topics_count": _compute_topics_count(db, unit_id)
    }


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(
    unit_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Delete a unit and all its topics.
    
    Accessible by: HOD + Principal only (destructive operation).
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    _check_offering_access(db, unit.offering_id, current_user, require_write=True)
    
    # Check if unit is used in questions
    from app.models import Question
    question_count = db.query(func.count(Question.id)).filter(
        Question.unit_id == unit_id
    ).scalar() or 0
    
    if question_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete unit: {question_count} questions reference this unit"
        )
    
    db.delete(unit)  # Topics cascade delete
    db.commit()
    
    logger.info(f"Deleted unit {unit_id}")
    return None


@router.post("/by-offering/{offering_id}/reorder", response_model=List[UnitResponse])
async def reorder_units(
    offering_id: UUID,
    reorder_data: UnitReorderRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Reorder units for an offering.
    
    Accessible by: Faculty (assigned) + HOD + Principal.
    """
    _check_offering_access(db, offering_id, current_user, require_write=True)
    
    # Verify all unit IDs belong to this offering
    units = db.query(Unit).filter(
        Unit.offering_id == offering_id,
        Unit.id.in_(reorder_data.unit_ids)
    ).all()
    
    if len(units) != len(reorder_data.unit_ids):
        raise HTTPException(
            status_code=400,
            detail="Some unit IDs are invalid or don't belong to this offering"
        )
    
    # Update unit numbers based on order
    unit_map = {u.id: u for u in units}
    for idx, unit_id in enumerate(reorder_data.unit_ids, start=1):
        unit_map[unit_id].unit_no = idx
    
    db.commit()
    
    # Return reordered units
    return await list_units(offering_id, False, db, current_user)


# ============================================================================
# TOPIC ENDPOINTS
# ============================================================================

@router.get("/{unit_id}/topics", response_model=List[TopicResponse])
async def list_topics(
    unit_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    List all topics for a unit.
    
    Accessible by: Any authenticated user.
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    topics = db.query(Topic).filter(Topic.unit_id == unit_id).order_by(Topic.name).all()
    return topics


@router.post("/{unit_id}/topics", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    unit_id: UUID,
    topic_data: TopicCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Create a topic for a unit.
    
    Accessible by: Faculty (assigned) + HOD + Principal.
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    _check_offering_access(db, unit.offering_id, current_user, require_write=True)
    
    # Check for duplicate topic name
    existing = db.query(Topic).filter(
        Topic.unit_id == unit_id,
        Topic.name == topic_data.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Topic '{topic_data.name}' already exists in this unit"
        )
    
    new_topic = Topic(
        id=uuid_lib.uuid4(),
        unit_id=unit_id,
        name=topic_data.name
    )
    
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    
    return new_topic


@router.post("/{unit_id}/topics/bulk", response_model=List[TopicResponse], status_code=status.HTTP_201_CREATED)
async def create_topics_bulk(
    unit_id: UUID,
    bulk_data: BulkTopicCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Create multiple topics for a unit at once.
    
    Accessible by: Faculty (assigned) + HOD + Principal.
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    _check_offering_access(db, unit.offering_id, current_user, require_write=True)
    
    # Check for duplicates
    existing_names = {t.name for t in db.query(Topic.name).filter(Topic.unit_id == unit_id).all()}
    new_names = {t.name for t in bulk_data.topics}
    
    duplicates = existing_names & new_names
    if duplicates:
        raise HTTPException(
            status_code=409,
            detail=f"Topics already exist: {', '.join(duplicates)}"
        )
    
    new_topics = []
    for topic_data in bulk_data.topics:
        new_topic = Topic(
            id=uuid_lib.uuid4(),
            unit_id=unit_id,
            name=topic_data.name
        )
        db.add(new_topic)
        new_topics.append(new_topic)
    
    db.commit()
    for t in new_topics:
        db.refresh(t)
    
    return new_topics


@router.put("/{unit_id}/topics/{topic_id}", response_model=TopicResponse)
async def update_topic(
    unit_id: UUID,
    topic_id: UUID,
    topic_data: TopicUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """
    Update a topic.
    
    Accessible by: Faculty (assigned) + HOD + Principal.
    """
    topic = db.query(Topic).filter(
        Topic.id == topic_id,
        Topic.unit_id == unit_id
    ).first()
    
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    _check_offering_access(db, unit.offering_id, current_user, require_write=True)
    
    if topic_data.name is not None:
        # Check for duplicate
        existing = db.query(Topic).filter(
            Topic.unit_id == unit_id,
            Topic.name == topic_data.name,
            Topic.id != topic_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Topic '{topic_data.name}' already exists in this unit"
            )
        topic.name = topic_data.name
    
    db.commit()
    db.refresh(topic)
    return topic


@router.delete("/{unit_id}/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    unit_id: UUID,
    topic_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Delete a topic.
    
    Accessible by: HOD + Principal only (destructive operation).
    """
    topic = db.query(Topic).filter(
        Topic.id == topic_id,
        Topic.unit_id == unit_id
    ).first()
    
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    _check_offering_access(db, unit.offering_id, current_user, require_write=True)
    
    # Check if topic is used in questions
    from app.models import Question
    question_count = db.query(func.count(Question.id)).filter(
        Question.topic_id == topic_id
    ).scalar() or 0
    
    if question_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete topic: {question_count} questions reference this topic"
        )
    
    db.delete(topic)
    db.commit()
    
    return None
