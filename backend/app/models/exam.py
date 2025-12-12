"""
EduMetrics Backend - Exam Models
Exam, ExamSection, Question, SubQuestion models
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Exam(Base):
    """Exam model."""
    __tablename__ = "exams"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    exam_type = Column(String, nullable=False)  # internal1, internal2
    max_marks = Column(Integer, default=30, nullable=False)
    status = Column(String, default="draft", nullable=False)  # draft, published, locked
    teacher_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    published_at = Column(DateTime, nullable=True)
    
    # Relationships
    subject = relationship("Subject", back_populates="exams")
    cohort = relationship("Cohort", back_populates="exams")
    sections = relationship("ExamSection", back_populates="exam", cascade="all, delete-orphan")
    student_marks = relationship("StudentMarks", back_populates="exam", cascade="all, delete-orphan")
    marks_computed = relationship("MarksComputed", back_populates="exam", cascade="all, delete-orphan")
    exam_snapshots = relationship("ExamSnapshot", back_populates="exam")
    
    def __repr__(self):
        return f"<Exam {self.exam_type} - {self.subject_id}>"


class ExamSection(Base):
    """Exam section model."""
    __tablename__ = "exam_sections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    name = Column(String, nullable=False)
    sequence = Column(Integer, nullable=False)
    required_questions = Column(Integer, default=1, nullable=False)
    selection_mode = Column(String, default="FIRST_N", nullable=False)  # FIRST_N, BEST_N
    max_marks = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    exam = relationship("Exam", back_populates="sections")
    questions = relationship("Question", back_populates="section", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ExamSection {self.name}>"


class Question(Base):
    """Question model (metadata only)."""
    __tablename__ = "questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id = Column(UUID(as_uuid=True), ForeignKey("exam_sections.id"), nullable=False)
    sequence = Column(Integer, nullable=False)
    max_marks = Column(Integer, nullable=False)
    co_id = Column(UUID(as_uuid=True), ForeignKey("course_outcomes.id"), nullable=True)
    bloom_level = Column(String, nullable=False)  # Remember, Understand, Apply, Analyze, Evaluate, Create
    is_optional = Column(Boolean, default=False, nullable=False)
    group_key = Column(String, nullable=True)  # For grouping optional questions
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    section = relationship("ExamSection", back_populates="questions")
    course_outcome = relationship("CourseOutcome", back_populates="questions")
    sub_questions = relationship("SubQuestion", back_populates="question", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Question {self.sequence}>"


class SubQuestion(Base):
    """Sub-question model."""
    __tablename__ = "sub_questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    label = Column(String, nullable=False)  # a, b, c, etc.
    max_marks = Column(Integer, nullable=False)
    co_id = Column(UUID(as_uuid=True), ForeignKey("course_outcomes.id"), nullable=True)
    bloom_level = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    question = relationship("Question", back_populates="sub_questions")
    course_outcome = relationship("CourseOutcome", back_populates="sub_questions")
    student_marks = relationship("StudentMarks", back_populates="sub_question")
    
    def __repr__(self):
        return f"<SubQuestion {self.label}>"


class ExamSnapshot(Base):
    """Immutable exam snapshot for audit trail."""
    __tablename__ = "exam_snapshots"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    snapshot_data = Column(String, nullable=False)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), nullable=True)
    
    # Relationships
    exam = relationship("Exam", back_populates="exam_snapshots")
    
    def __repr__(self):
        return f"<ExamSnapshot {self.exam_id}>"
