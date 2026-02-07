"""
EduMetrics Backend - SubjectOffering Model (THE CORE ANCHOR)

All COs, Exams, Assignments, and Analytics attach to SubjectOffering,
NOT to Subject. Subject is a master/reference entity only.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class SubjectOffering(Base):
    """
    SubjectOffering - The central academic anchor.
    
    This is the batch-specific instantiation of a subject.
    All academic data (COs, Exams, Units, Analytics) attaches here.
    """
    __tablename__ = "subject_offerings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False)  # CLARIFICATION #1
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    semester_no = Column(Integer, nullable=False)
    is_elective = Column(Boolean, default=False, nullable=False)
    regulation_year = Column(Integer, nullable=False)  # e.g., 2021
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Unique constraint: one offering per subject per cohort per semester
    __table_args__ = (
        UniqueConstraint('subject_id', 'cohort_id', 'semester_no', name='uq_subject_cohort_semester'),
    )
    
    # Relationships
    subject = relationship("Subject", back_populates="offerings")
    program = relationship("Program", back_populates="subject_offerings")
    cohort = relationship("Cohort", back_populates="subject_offerings")
    course_outcomes = relationship("CourseOutcome", back_populates="offering", cascade="all, delete-orphan")
    units = relationship("Unit", back_populates="offering", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="offering")
    assignments = relationship("Assignment", back_populates="offering", cascade="all, delete-orphan")
    attendance_marks = relationship("AttendanceMark", back_populates="offering", cascade="all, delete-orphan")
    activity_marks = relationship("ActivityMark", back_populates="offering", cascade="all, delete-orphan")
    teacher_assignments = relationship("TeacherAssignment", back_populates="offering")
    backlog_attempts = relationship("BacklogAttempt", back_populates="offering")
    
    def __repr__(self):
        return f"<SubjectOffering {self.subject_id} for Cohort {self.cohort_id} Sem {self.semester_no}>"
