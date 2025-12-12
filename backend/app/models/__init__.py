"""EduMetrics Backend - Database Models"""
from app.models.user import Profile, UserRole
from app.models.organization import Department, Program, Cohort
from app.models.academic import CurriculumVersion, Subject, StudentEnrollment, TeacherAssignment
from app.models.outcomes import CourseOutcome, ProgramOutcome, COPOMapping
from app.models.exam import Exam, ExamSection, Question, SubQuestion, ExamSnapshot
from app.models.marks import StudentMarks, MarksComputed, FinalMarks, SemesterResult
from app.models.grading import GradingRule
from app.models.audit import AuditLog

__all__ = [
    # User
    "Profile",
    "UserRole",
    # Organization
    "Department",
    "Program",
    "Cohort",
    # Academic
    "CurriculumVersion",
    "Subject",
    "StudentEnrollment",
    "TeacherAssignment",
    # Outcomes
    "CourseOutcome",
    "ProgramOutcome",
    "COPOMapping",
    # Exam
    "Exam",
    "ExamSection",
    "Question",
    "SubQuestion",
    "ExamSnapshot",
    # Marks
    "StudentMarks",
    "MarksComputed",
    "FinalMarks",
    "SemesterResult",
    # Grading
    "GradingRule",
    # Audit
    "AuditLog",
]
