"""
Production Performance Indexes Migration

Adds comprehensive indexes for production performance optimization.

Revision ID: 004_production_indexes
Revises: 003_performance_indexes
Create Date: 2026-02-07 22:25:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_production_indexes'
down_revision = '003_performance_indexes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add production performance indexes."""
    
    # StudentMarks composite indexes for marks queries
    op.create_index(
        'ix_student_marks_exam_student',
        'student_marks',
        ['exam_id', 'student_id'],
        unique=False,
        if_not_exists=True
    )
    
    # Exams indexes for status filtering
    op.create_index(
        'ix_exams_status_cohort',
        'exams',
        ['status', 'cohort_id'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_exams_offering_type',
        'exams',
        ['offering_id', 'exam_type'],
        unique=False,
        if_not_exists=True
    )
    
    # BacklogAttempts composite indexes
    op.create_index(
        'ix_backlog_cohort_result',
        'backlog_attempts',
        ['semester_attempted', 'result'],
        unique=False,
        if_not_exists=True
    )
    
    # StudentQuestionMarks for marks lookup
    op.create_index(
        'ix_sqm_exam_usn',
        'student_question_marks',
        ['exam_id', 'usn'],
        unique=False,
        if_not_exists=True
    )
    
    # FinalMarks for grade reports
    op.create_index(
        'ix_finalmarks_cohort_usn',
        'final_marks',
        ['cohort_id', 'usn'],
        unique=False,
        if_not_exists=True
    )
    
    # SemesterResults for transcript queries
    op.create_index(
        'ix_semester_results_usn_sem',
        'semester_results',
        ['usn', 'semester'],
        unique=False,
        if_not_exists=True
    )
    
    # AuditLogs for log queries
    op.create_index(
        'ix_audit_logs_table_created',
        'audit_logs',
        ['table_name', 'created_at'],
        unique=False,
        if_not_exists=True
    )
    
    # Students for USN lookups
    op.create_index(
        'ix_students_cohort_status',
        'students',
        ['cohort_id', 'status'],
        unique=False,
        if_not_exists=True
    )
    
    # Questions for exam structure queries
    op.create_index(
        'ix_questions_section_seq',
        'questions',
        ['section_id', 'sequence'],
        unique=False,
        if_not_exists=True
    )
    
    # SubQuestions for marks entry
    op.create_index(
        'ix_subquestions_question',
        'sub_questions',
        ['question_id'],
        unique=False,
        if_not_exists=True
    )
    
    # CourseOutcomes for analytics
    op.create_index(
        'ix_co_subject',
        'course_outcomes',
        ['subject_id'],
        unique=False,
        if_not_exists=True
    )


def downgrade() -> None:
    """Remove production performance indexes."""
    op.drop_index('ix_co_subject', table_name='course_outcomes', if_exists=True)
    op.drop_index('ix_subquestions_question', table_name='sub_questions', if_exists=True)
    op.drop_index('ix_questions_section_seq', table_name='questions', if_exists=True)
    op.drop_index('ix_students_cohort_status', table_name='students', if_exists=True)
    op.drop_index('ix_audit_logs_table_created', table_name='audit_logs', if_exists=True)
    op.drop_index('ix_semester_results_usn_sem', table_name='semester_results', if_exists=True)
    op.drop_index('ix_finalmarks_cohort_usn', table_name='final_marks', if_exists=True)
    op.drop_index('ix_sqm_exam_usn', table_name='student_question_marks', if_exists=True)
    op.drop_index('ix_backlog_cohort_result', table_name='backlog_attempts', if_exists=True)
    op.drop_index('ix_exams_offering_type', table_name='exams', if_exists=True)
    op.drop_index('ix_exams_status_cohort', table_name='exams', if_exists=True)
    op.drop_index('ix_student_marks_exam_student', table_name='student_marks', if_exists=True)
