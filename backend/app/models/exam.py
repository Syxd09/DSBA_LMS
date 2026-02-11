"""
EduMetrics Backend - Exam Models
Exam, ExamSection, Question, SubQuestion models

Exams attach to SubjectOffering, not directly to Subject.
Questions have Unit, Topic, and Bloom references for granular analytics.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Exam(Base):
    """
    Exam model.
    
    Attaches to SubjectOffering (the academic anchor).
    max_marks varies by exam_type:
    - INT1, INT2: 40 marks (raw)
    - EXT: 60 marks
    """
    __tablename__ = "exams"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offering_id = Column(UUID(as_uuid=True), ForeignKey("subject_offerings.id"), nullable=True)  # NEW: The anchor
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)  # Legacy
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    exam_type = Column(String, nullable=False)  # INT1, INT2, EXT
    max_marks = Column(Integer, default=40, nullable=False)  # CLARIFICATION #2: 40 for internal, 60 for external
    status = Column(String, default="draft", nullable=False)  # draft, submitted, approved, locked
    teacher_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    published_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)  # NEW: When faculty submits
    approved_at = Column(DateTime, nullable=True)  # NEW: When HOD approves
    approved_by = Column(UUID(as_uuid=True), nullable=True)  # NEW: HOD who approved
    version = Column(Integer, default=1, nullable=False)  # Optimistic locking
    
    # Relationships
    offering = relationship("SubjectOffering", back_populates="exams")
    subject = relationship("Subject", back_populates="exams")  # Legacy
    cohort = relationship("Cohort", back_populates="exams")
    sections = relationship("ExamSection", back_populates="exam", cascade="all, delete-orphan")
    student_marks = relationship("StudentMarks", back_populates="exam", cascade="all, delete-orphan")  # Legacy
    question_marks = relationship("StudentQuestionMark", back_populates="exam", cascade="all, delete-orphan")  # Active
    exam_snapshots = relationship("ExamSnapshot", back_populates="exam")
    
    def __repr__(self):
        return f"<Exam {self.exam_type} - {self.offering_id or self.subject_id}>"


class ExamSection(Base):
    """
    Exam section model.
    
    CLARIFICATION #3: Section rules must be configurable.
    required_questions: how many must be answered
    max_questions: how many are available
    selection_mode: BEST_N, FIRST_N, ALL
    """
    __tablename__ = "exam_sections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    name = Column(String, nullable=False)  # Section A, B, C
    sequence = Column(Integer, nullable=False)
    max_questions = Column(Integer, nullable=False)  # NEW: Total questions in section
    required_questions = Column(Integer, default=1, nullable=False)  # How many to answer
    selection_mode = Column(String, default="BEST_N", nullable=False)  # BEST_N, FIRST_N, ALL
    max_marks = Column(Integer, nullable=False)  # Total marks for this section
    marks_per_question = Column(Integer, nullable=True)  # NEW: For uniform marking
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # FIX #1: Check constraint for valid selection_mode values
    __table_args__ = (
        CheckConstraint(
            "selection_mode IN ('ALL', 'BEST_N', 'FIRST_N')",
            name='ck_exam_sections_selection_mode'
        ),
    )
    
    # Relationships
    exam = relationship("Exam", back_populates="sections")
    questions = relationship("Question", back_populates="section", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ExamSection {self.name}>"


class Question(Base):
    """
    Question model with Unit, Topic, and Bloom references.
    
    Marks are captured at SubQuestion level (CLARIFICATION #4).
    """
    __tablename__ = "questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id = Column(UUID(as_uuid=True), ForeignKey("exam_sections.id"), nullable=False)
    sequence = Column(Integer, nullable=False)
    max_marks = Column(Integer, nullable=False)
    co_id = Column(UUID(as_uuid=True), ForeignKey("course_outcomes.id"), nullable=True)
    unit_id = Column(UUID(as_uuid=True), ForeignKey("units.id"), nullable=True)  # NEW
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id"), nullable=True)  # NEW
    bloom_id = Column(UUID(as_uuid=True), ForeignKey("bloom_taxonomy.id"), nullable=True)  # NEW
    bloom_level = Column(String, nullable=True)  # Legacy string field
    is_optional = Column(Boolean, default=False, nullable=False)
    group_key = Column(String, nullable=True)  # For grouping optional questions
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    section = relationship("ExamSection", back_populates="questions")
    course_outcome = relationship("CourseOutcome", back_populates="questions")
    unit = relationship("Unit", back_populates="questions")
    topic = relationship("Topic", back_populates="questions")
    bloom = relationship("Bloom", back_populates="questions")
    sub_questions = relationship("SubQuestion", back_populates="question", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Question {self.sequence}>"


class SubQuestion(Base):
    """
    Sub-question model.
    
    This is the lowest evaluable unit where marks are stored.
    StudentQuestionMark references sub_question_id (CLARIFICATION #4).
    """
    __tablename__ = "sub_questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    label = Column(String, nullable=False)  # a, b, c, etc.
    max_marks = Column(Integer, nullable=False)
    co_id = Column(UUID(as_uuid=True), ForeignKey("course_outcomes.id"), nullable=True)
    unit_id = Column(UUID(as_uuid=True), ForeignKey("units.id"), nullable=True)  # NEW
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id"), nullable=True)  # NEW
    bloom_id = Column(UUID(as_uuid=True), ForeignKey("bloom_taxonomy.id"), nullable=True)  # NEW
    bloom_level = Column(String, nullable=True)  # Legacy string field
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    question = relationship("Question", back_populates="sub_questions")
    course_outcome = relationship("CourseOutcome", back_populates="sub_questions")
    unit = relationship("Unit", back_populates="sub_questions")
    topic = relationship("Topic", back_populates="sub_questions")
    bloom = relationship("Bloom", back_populates="sub_questions")
    student_marks = relationship("StudentMarks", back_populates="sub_question")  # Legacy
    question_marks = relationship("StudentQuestionMark", back_populates="sub_question")  # Active
    
    def __repr__(self):
        return f"<SubQuestion {self.label}>"


class ExamSnapshot(Base):
    """Immutable exam snapshot for audit trail."""
    __tablename__ = "exam_snapshots"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    snapshot_data = Column(String, nullable=False)  # JSON string
    snapshot_type = Column(String, nullable=True)  # NEW: structure, marks, approval
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), nullable=True)
    
    # Relationships
    exam = relationship("Exam", back_populates="exam_snapshots")
    
    def __repr__(self):
        return f"<ExamSnapshot {self.exam_id}>"
