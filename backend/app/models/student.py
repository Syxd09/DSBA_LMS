"""
EduMetrics Backend - Student Model
USN is the canonical primary key identifier.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Student(Base):
    """
    Student model with USN as primary key.
    
    USN (University Seat Number) is the canonical identifier for students.
    All marks and academic records reference students by USN.
    """
    __tablename__ = "students"
    
    usn = Column(String, primary_key=True)  # USN IS KING
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id"), nullable=True)
    admission_semester = Column(Integer, default=1, nullable=False)
    status = Column(String, default="active", nullable=False)  # active, completed, detained
    user_id = Column(UUID(as_uuid=True), nullable=True)  # Link to Profile for portal access
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    cohort = relationship("Cohort", back_populates="students")
    section = relationship("Section", back_populates="students")
    question_marks = relationship("StudentQuestionMark", back_populates="student", cascade="all, delete-orphan")
    assignment_marks = relationship("AssignmentMark", back_populates="student", cascade="all, delete-orphan")
    attendance_marks = relationship("AttendanceMark", back_populates="student", cascade="all, delete-orphan")
    activity_marks = relationship("ActivityMark", back_populates="student", cascade="all, delete-orphan")
    final_marks = relationship("FinalMarks", back_populates="student", cascade="all, delete-orphan")
    semester_results = relationship("SemesterResult", back_populates="student", cascade="all, delete-orphan")
    backlog_attempts = relationship("BacklogAttempt", back_populates="student", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Student {self.usn}: {self.name}>"
