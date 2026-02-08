from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    link: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: UUID

class NotificationUpdate(BaseModel):
    is_read: bool

class Notification(NotificationBase):
    id: UUID
    user_id: UUID
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
