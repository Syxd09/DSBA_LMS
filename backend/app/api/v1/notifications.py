from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.schemas.notification import Notification, NotificationUpdate
from app.services import notification_service
from app.api.deps import get_current_user
from app.models.user import UserRole
from app.core.permissions import AppRole

router = APIRouter()

@router.get("/", response_model=List[Notification])
def get_notifications(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserRole = Depends(get_current_user)
):
    """Get current user's notifications."""
    return notification_service.get_user_notifications(db, current_user.user_id, skip, limit)

@router.get("/unread-count", response_model=int)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: UserRole = Depends(get_current_user)
):
    """Get count of unread notifications."""
    return notification_service.get_unread_count(db, current_user.user_id)

@router.put("/{notification_id}/read", response_model=Notification)
def mark_as_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserRole = Depends(get_current_user)
):
    """Mark a specific notification as read."""
    notification = notification_service.mark_as_read(db, notification_id, current_user.user_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification

@router.post("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: UserRole = Depends(get_current_user)
):
    """Mark all notifications as read."""
    notification_service.mark_all_as_read(db, current_user.user_id)
    return {"status": "success"}
