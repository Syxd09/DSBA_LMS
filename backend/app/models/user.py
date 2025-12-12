"""
EduMetrics Backend - User Models
Profile and UserRole models
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.core.permissions import AppRole


class Profile(Base):
    """User profile model."""
    __tablename__ = "profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), unique=True, nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    department = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)  # For custom auth
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user_role = relationship("UserRole", back_populates="profile", uselist=False)
    
    def __repr__(self):
        return f"<Profile {self.email}>"


class UserRole(Base):
    """User role assignment model."""
    __tablename__ = "user_roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.user_id"), unique=True, nullable=False)
    role = Column(SQLEnum(AppRole, name="app_role", create_type=False), default=AppRole.STUDENT, nullable=False)
    
    # Relationships
    profile = relationship("Profile", back_populates="user_role")
    
    def __repr__(self):
        return f"<UserRole {self.user_id}: {self.role}>"
