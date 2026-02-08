from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate
from uuid import UUID
from typing import List

def get_user_notifications(db: Session, user_id: UUID, skip: int = 0, limit: int = 50) -> List[Notification]:
    return db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

def get_unread_count(db: Session, user_id: UUID) -> int:
    return db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).count()

def create_notification(db: Session, notification: NotificationCreate) -> Notification:
    db_notification = Notification(**notification.model_dump())
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def mark_as_read(db: Session, notification_id: UUID, user_id: UUID) -> Notification:
    db_notification = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
    if db_notification:
        db_notification.is_read = True
        db.commit()
        db.refresh(db_notification)
    return db_notification

def mark_all_as_read(db: Session, user_id: UUID):
    db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).update({"is_read": True})
    db.commit()
