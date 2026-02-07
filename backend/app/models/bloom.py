"""
EduMetrics Backend - Bloom Taxonomy Model
Version-aware reference table for old and revised Bloom's taxonomy.
"""
import uuid
from sqlalchemy import Column, String, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Bloom(Base):
    """
    Bloom's Taxonomy reference table.
    
    Supports both 'old' (1956) and 'revised' (2001) versions.
    Questions/SubQuestions reference this instead of storing strings.
    """
    __tablename__ = "bloom_taxonomy"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version = Column(String, nullable=False)  # "old" or "revised"
    level_name = Column(String, nullable=False)  # Remember, Understand, etc.
    level_order = Column(Integer, nullable=False)  # 1-6
    
    __table_args__ = (
        UniqueConstraint('version', 'level_name', name='uq_bloom_version_level'),
    )
    
    # Relationships
    questions = relationship("Question", back_populates="bloom")
    sub_questions = relationship("SubQuestion", back_populates="bloom")
    course_outcomes = relationship("CourseOutcome", back_populates="bloom")
    
    def __repr__(self):
        return f"<Bloom {self.version}: {self.level_name} ({self.level_order})>"


# Seed data for Bloom taxonomy
BLOOM_SEED_DATA = [
    # Revised Bloom's Taxonomy (2001)
    {"version": "revised", "level_name": "Remember", "level_order": 1},
    {"version": "revised", "level_name": "Understand", "level_order": 2},
    {"version": "revised", "level_name": "Apply", "level_order": 3},
    {"version": "revised", "level_name": "Analyze", "level_order": 4},
    {"version": "revised", "level_name": "Evaluate", "level_order": 5},
    {"version": "revised", "level_name": "Create", "level_order": 6},
    # Original Bloom's Taxonomy (1956)
    {"version": "old", "level_name": "Knowledge", "level_order": 1},
    {"version": "old", "level_name": "Comprehension", "level_order": 2},
    {"version": "old", "level_name": "Application", "level_order": 3},
    {"version": "old", "level_name": "Analysis", "level_order": 4},
    {"version": "old", "level_name": "Synthesis", "level_order": 5},
    {"version": "old", "level_name": "Evaluation", "level_order": 6},
]
