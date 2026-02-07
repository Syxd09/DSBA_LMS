"""
EduMetrics Backend - Assessment Components Models
Assignment, AssignmentMark, AttendanceMark, ActivityMark

These are the non-exam assessment components contributing to internal marks:
- Assignment 1 & 2: 5 marks each
- Attendance: 5 marks (import-only)
- Classroom Activity: 5 marks (import-only)

ARCHITECTURE RULES:
- All components attach to SubjectOffering (the ONLY academic anchor)
- Attendance/Activity are import-only with uniqueness per (offering_id, usn)
- No recalculation logic - these are raw input captures
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Assignment(Base):
    """
    Assignment model - student homework assignments.
    
    Each SubjectOffering has 2 assignments (5 marks each).
    Assignments must be submitted before the associated internal exam.
    """
    __tablename__ = "assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offering_id = Column(UUID(as_uuid=True), ForeignKey("subject_offerings.id"), nullable=False)
    assignment_no = Column(Integer, nullable=False)  # 1 or 2
    title = Column(String, nullable=True)
    max_marks = Column(Integer, default=5, nullable=False)
    due_before_exam = Column(String, nullable=True)  # "INT1" or "INT2"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    offering = relationship("SubjectOffering", back_populates="assignments")
    marks = relationship("AssignmentMark", back_populates="assignment", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Assignment {self.assignment_no} for Offering {self.offering_id}>"


class AssignmentMark(Base):
    """
    AssignmentMark model - student-scoped assignment marks.
    
    Marks awarded to individual students for assignments.
    """
    __tablename__ = "assignment_marks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id"), nullable=False)
    usn = Column(String, ForeignKey("students.usn"), nullable=False)
    marks = Column(Numeric(4, 2), nullable=False)  # 0-5
    entered_by = Column(UUID(as_uuid=True), nullable=True)
    entered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    assignment = relationship("Assignment", back_populates="marks")
    student = relationship("Student", back_populates="assignment_marks")
    
    def __repr__(self):
        return f"<AssignmentMark {self.usn}: {self.marks}>"


class AttendanceMark(Base):
    """
    AttendanceMark model - import-only attendance contribution.
    
    5 marks contribution to internal total.
    Imported via bulk upload, no recalculation logic required.
    
    CONSTRAINT: One record per (offering_id, usn) - prevents duplicate imports.
    """
    __tablename__ = "attendance_marks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offering_id = Column(UUID(as_uuid=True), ForeignKey("subject_offerings.id"), nullable=False)
    usn = Column(String, ForeignKey("students.usn"), nullable=False)
    marks = Column(Numeric(3, 2), nullable=False)  # 0-5
    imported_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    imported_by = Column(UUID(as_uuid=True), nullable=True)
    
    # FIX #2: Unique constraint to prevent multiple rows per subject per student
    __table_args__ = (
        UniqueConstraint('offering_id', 'usn', name='uq_attendance_offering_usn'),
    )
    
    # Relationships
    offering = relationship("SubjectOffering", back_populates="attendance_marks")
    student = relationship("Student", back_populates="attendance_marks")
    
    def __repr__(self):
        return f"<AttendanceMark {self.usn}: {self.marks}>"


class ActivityMark(Base):
    """
    ActivityMark model - import-only classroom activity contribution.
    
    5 marks contribution to internal total.
    Imported via bulk upload, no recalculation logic required.
    
    CONSTRAINT: One record per (offering_id, usn) - prevents duplicate imports.
    """
    __tablename__ = "activity_marks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offering_id = Column(UUID(as_uuid=True), ForeignKey("subject_offerings.id"), nullable=False)
    usn = Column(String, ForeignKey("students.usn"), nullable=False)
    marks = Column(Numeric(3, 2), nullable=False)  # 0-5
    imported_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    imported_by = Column(UUID(as_uuid=True), nullable=True)
    
    # FIX #2: Unique constraint to prevent multiple rows per subject per student
    __table_args__ = (
        UniqueConstraint('offering_id', 'usn', name='uq_activity_offering_usn'),
    )
    
    # Relationships
    offering = relationship("SubjectOffering", back_populates="activity_marks")
    student = relationship("Student", back_populates="activity_marks")
    
    def __repr__(self):
        return f"<ActivityMark {self.usn}: {self.marks}>"
