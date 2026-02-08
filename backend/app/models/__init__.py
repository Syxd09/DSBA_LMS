"""EduMetrics Backend - Database Models

This module exports all SQLAlchemy models for the application.
Models are organized by domain:
- Tenant: College
- Organization: Department, Program, Cohort, Section
- Academic: Subject, SubjectOffering, CurriculumVersion, Unit, Topic
- Student: Student, StudentEnrollment (legacy)
- Outcomes: CourseOutcome, ProgramOutcome, COPOMapping, ProgramSpecificOutcome, COPSOMapping, Bloom
- Exam: Exam, ExamSection, Question, SubQuestion, ExamSnapshot
- Marks: StudentMarks, StudentQuestionMark, FinalMarks, SemesterResult
- Assessment: Assignment, AssignmentMark, AttendanceMark, ActivityMark
- Backlog: BacklogAttempt
- Promotion: SemesterPromotion, StudentSemesterStatus
- Regulation: Regulation
- User: Profile, UserRole
- Grading: GradingRule, GradeScale
- Audit: AuditLog
"""
# Tenant
from app.models.college import College

# Organization
from app.models.organization import Department, Program, Cohort
from app.models.section import Section

# Academic
from app.models.academic import CurriculumVersion, Subject, StudentEnrollment, TeacherAssignment
from app.models.subject_offering import SubjectOffering
from app.models.unit_topic import Unit, Topic
from app.models.bloom import Bloom, BLOOM_SEED_DATA

# Student
from app.models.student import Student

# Outcomes
from app.models.outcomes import CourseOutcome, ProgramOutcome, COPOMapping, ProgramSpecificOutcome, COPSOMapping

# Exam
from app.models.exam import Exam, ExamSection, Question, SubQuestion, ExamSnapshot

# Marks
from app.models.marks import StudentMarks, StudentQuestionMark, FinalMarks, SemesterResult

# Assessment Components
from app.models.assessment_components import Assignment, AssignmentMark, AttendanceMark, ActivityMark

# Backlog
from app.models.backlog import BacklogAttempt

# Promotion
from app.models.promotion import SemesterPromotion, StudentSemesterStatus

# Regulation
from app.models.regulation import Regulation

# User
from app.models.user import Profile, UserRole

# Grading
from app.models.grading import GradingRule, GradeScale

# Audit
from app.models.audit import AuditLog

# Semester
from app.models.semester import Semester, SemesterType, SemesterStatus, SemesterService

__all__ = [
    # Tenant
    "College",
    # Organization
    "Department",
    "Program",
    "Cohort",
    "Section",
    # Academic
    "CurriculumVersion",
    "Subject",
    "SubjectOffering",
    "Unit",
    "Topic",
    "Bloom",
    "BLOOM_SEED_DATA",
    "StudentEnrollment",  # Legacy
    "TeacherAssignment",
    # Student
    "Student",
    # Outcomes
    "CourseOutcome",
    "ProgramOutcome",
    "COPOMapping",
    "ProgramSpecificOutcome",
    "COPSOMapping",
    # Exam
    "Exam",
    "ExamSection",
    "Question",
    "SubQuestion",
    "ExamSnapshot",
    # Marks
    "StudentMarks",
    "StudentQuestionMark",
    "FinalMarks",
    "SemesterResult",
    # Assessment Components
    "Assignment",
    "AssignmentMark",
    "AttendanceMark",
    "ActivityMark",
    # Backlog
    "BacklogAttempt",
    # Promotion
    "SemesterPromotion",
    "StudentSemesterStatus",
    # Regulation
    "Regulation",
    # User
    "Profile",
    "UserRole",
    # Grading
    "GradingRule",
    "GradeScale",
    # Audit
    "AuditLog",
]

