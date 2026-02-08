"""
EduMetrics Backend - Notification Models
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base

class Notification(Base):
    """System notification model."""
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.user_id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # 'info', 'success', 'warning', 'error', 'approval'
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    link = Column(String, nullable=True)   # Optional action link
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("Profile", foreign_keys=[user_id], backref="notifications")
    
    def __repr__(self):
        return f"<Notification {self.id}: {self.title}>"
