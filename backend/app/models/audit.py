"""
EduMetrics Backend - Audit Models
AuditLog model with NBA/NAAC compliance fields
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET

from app.database import Base


class AuditLog(Base):
    """
    Audit log for tracking all system changes.
    
    Every sensitive action logs:
    - User and Role
    - Timestamp
    - Old and New values
    - Reason for change
    - Version tracking
    
    PHASE 1: Enhanced with entity_type/entity_id for exam/marks workflow.
    """
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    user_role = Column(String, nullable=True)  # Role at time of action
    action = Column(String, nullable=False)  # INSERT, UPDATE, DELETE, APPROVE, LOCK, OVERRIDE
    
    # Entity identification (supports both old schema and new workflow)
    table_name = Column(String, nullable=True)  # Legacy: table name
    record_id = Column(UUID(as_uuid=True), nullable=True)  # Legacy: record UUID
    entity_type = Column(String, nullable=True)  # NEW: exam, student_marks, etc.
    entity_id = Column(String, nullable=True, index=True)  # NEW: entity identifier
    
    # Change tracking (supports both JSON and string values)
    old_data = Column(JSONB, nullable=True)  # Legacy: JSON format
    new_data = Column(JSONB, nullable=True)  # Legacy: JSON format
    old_value = Column(String, nullable=True)  # NEW: simple string value
    new_value = Column(String, nullable=True)  # NEW: simple string value
    
    reason = Column(String, nullable=True)  # Reason for change/override (MANDATORY for unlock/override)
    version = Column(Integer, nullable=True)  # Version number for versioned entities
    ip_address = Column(INET, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<AuditLog {self.action} on {self.entity_type or self.table_name}>"

