"""
EduMetrics Backend - Audit Models
AuditLog model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET

from app.database import Base


class AuditLog(Base):
    """Audit log for tracking all system changes."""
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    action = Column(String, nullable=False)  # INSERT, UPDATE, DELETE
    table_name = Column(String, nullable=False)
    record_id = Column(UUID(as_uuid=True), nullable=True)
    old_data = Column(JSONB, nullable=True)
    new_data = Column(JSONB, nullable=True)
    ip_address = Column(INET, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<AuditLog {self.action} on {self.table_name}>"
