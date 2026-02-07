"""Add new models for Phase 2: BacklogAttempt, SemesterPromotion, Regulation

Revision ID: 002_phase2_models
Revises: 001_initial (adjust to your actual previous migration)
Create Date: 2026-02-07 15:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_phase2_models'
down_revision = 'ef9599cb5b7c'  # Chain from initial_schema
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create regulations table
    op.create_table(
        'regulations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('college_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('code', sa.String(20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('bloom_version', sa.String(20), server_default='revised'),
        sa.Column('internal_weightage', sa.Integer(), server_default='40'),
        sa.Column('external_weightage', sa.Integer(), server_default='60'),
        sa.Column('internal_exam_weightage', sa.Numeric(5, 2), server_default='15.0'),
        sa.Column('assignment_weightage', sa.Numeric(5, 2), server_default='10.0'),
        sa.Column('attendance_weightage', sa.Numeric(5, 2), server_default='5.0'),
        sa.Column('activity_weightage', sa.Numeric(5, 2), server_default='5.0'),
        sa.Column('other_weightage', sa.Numeric(5, 2), server_default='5.0'),
        sa.Column('co_threshold_level1', sa.Numeric(5, 2), server_default='40.0'),
        sa.Column('co_threshold_level2', sa.Numeric(5, 2), server_default='60.0'),
        sa.Column('co_threshold_level3', sa.Numeric(5, 2), server_default='75.0'),
        sa.Column('po_threshold_level1', sa.Numeric(5, 2), server_default='1.0'),
        sa.Column('po_threshold_level2', sa.Numeric(5, 2), server_default='2.0'),
        sa.Column('po_threshold_level3', sa.Numeric(5, 2), server_default='3.0'),
        sa.Column('grade_scale_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('min_attendance_percentage', sa.Integer(), server_default='75'),
        sa.Column('min_internal_marks', sa.Numeric(5, 2), server_default='16.0'),
        sa.Column('min_external_marks', sa.Numeric(5, 2), server_default='24.0'),
        sa.Column('min_total_marks', sa.Numeric(5, 2), server_default='40.0'),
        sa.Column('max_backlogs_for_promotion', sa.Integer(), server_default='4'),
        sa.Column('additional_rules', postgresql.JSONB(), nullable=True),
        sa.Column('version', sa.Integer(), server_default='1'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('effective_from', sa.DateTime(), nullable=True),
        sa.Column('effective_until', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['college_id'], ['colleges.id'], ondelete='CASCADE'),
        # Note: grade_scale_id FK removed - table doesn't exist yet
        sa.ForeignKeyConstraint(['created_by'], ['profiles.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('college_id', 'code', name='uq_regulation_college_code')
    )
    op.create_index('ix_regulation_college_year', 'regulations', ['college_id', 'year'])
    op.create_index('ix_regulation_active', 'regulations', ['is_active'])
    
    # Add regulation_id to cohorts
    op.add_column('cohorts', sa.Column('regulation_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_cohorts_regulation_id',
        'cohorts', 'regulations',
        ['regulation_id'], ['id']
    )
    
    # Create semester_promotions table
    op.create_table(
        'semester_promotions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cohort_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('from_semester', sa.Integer(), nullable=False),
        sa.Column('to_semester', sa.Integer(), nullable=False),
        sa.Column('academic_year', sa.String(10), nullable=False),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('approved_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('approval_notes', sa.Text(), nullable=True),
        sa.Column('total_students', sa.Integer(), server_default='0'),
        sa.Column('students_promoted', sa.Integer(), server_default='0'),
        sa.Column('students_detained', sa.Integer(), server_default='0'),
        sa.Column('students_on_hold', sa.Integer(), server_default='0'),
        sa.Column('promoted_student_ids', postgresql.JSONB(), nullable=True),
        sa.Column('detained_student_ids', postgresql.JSONB(), nullable=True),
        sa.Column('detention_reasons', postgresql.JSONB(), nullable=True),
        sa.Column('status', sa.String(20), server_default='completed'),
        sa.Column('rolled_back_at', sa.DateTime(), nullable=True),
        sa.Column('rolled_back_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('rollback_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['cohort_id'], ['cohorts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approved_by'], ['profiles.id']),
        sa.ForeignKeyConstraint(['rolled_back_by'], ['profiles.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_promotion_cohort_semester', 'semester_promotions', ['cohort_id', 'from_semester'])
    op.create_index('ix_promotion_academic_year', 'semester_promotions', ['academic_year'])
    
    # Create student_semester_status table
    op.create_table(
        'student_semester_status',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('promotion_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_usn', sa.String(), nullable=False),  # Changed from student_id UUID to student_usn String
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('backlog_count', sa.Integer(), server_default='0'),
        sa.Column('attendance_percentage', sa.Integer(), nullable=True),
        sa.Column('cgpa', sa.String(10), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['promotion_id'], ['semester_promotions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_usn'], ['students.usn'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_student_status_promotion', 'student_semester_status', ['promotion_id', 'student_usn'], unique=True)
    
    # Create backlog_attempts table
    op.create_table(
        'backlog_attempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_usn', sa.String(), nullable=False),
        sa.Column('offering_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('attempt_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('exam_type', sa.String(20), nullable=False),
        sa.Column('semester_attempted', sa.Integer(), nullable=False),
        sa.Column('academic_year', sa.String(10), nullable=True),
        sa.Column('external_marks', sa.Numeric(5, 2), nullable=True),
        sa.Column('external_max_marks', sa.Numeric(5, 2), server_default='60'),
        sa.Column('internal_marks_carried', sa.Numeric(5, 2), nullable=True),
        sa.Column('internal_max_marks', sa.Numeric(5, 2), server_default='40'),
        sa.Column('total_marks', sa.Numeric(5, 2), nullable=True),
        sa.Column('result', sa.String(20), nullable=True),
        sa.Column('grade', sa.String(5), nullable=True),
        sa.Column('grade_points', sa.Numeric(3, 1), nullable=True),
        sa.Column('is_best_attempt', sa.Boolean(), server_default='false'),
        sa.Column('is_cleared', sa.Boolean(), server_default='false'),
        sa.Column('exam_date', sa.DateTime(), nullable=True),
        sa.Column('result_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['student_usn'], ['students.usn'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['offering_id'], ['subject_offerings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['profiles.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_usn', 'offering_id', 'attempt_number', name='uq_backlog_attempt'),
        sa.CheckConstraint('attempt_number > 0', name='ck_backlog_positive_attempt'),
        sa.CheckConstraint(
            'external_marks IS NULL OR (external_marks >= 0 AND external_marks <= external_max_marks)',
            name='ck_backlog_external_marks_range'
        )
    )
    op.create_index('ix_backlog_student_usn', 'backlog_attempts', ['student_usn'])
    op.create_index('ix_backlog_offering_id', 'backlog_attempts', ['offering_id'])
    op.create_index('ix_backlog_student_offering', 'backlog_attempts', ['student_usn', 'offering_id'])
    op.create_index('ix_backlog_student_result', 'backlog_attempts', ['student_usn', 'result'])
    op.create_index('ix_backlog_offering_semester', 'backlog_attempts', ['offering_id', 'semester_attempted'])


def downgrade() -> None:
    # Drop backlog_attempts table
    op.drop_index('ix_backlog_offering_semester', 'backlog_attempts')
    op.drop_index('ix_backlog_student_result', 'backlog_attempts')
    op.drop_index('ix_backlog_student_offering', 'backlog_attempts')
    op.drop_index('ix_backlog_offering_id', 'backlog_attempts')
    op.drop_index('ix_backlog_student_usn', 'backlog_attempts')
    op.drop_table('backlog_attempts')
    
    # Drop student_semester_status table
    op.drop_index('ix_student_status_promotion', 'student_semester_status')
    op.drop_table('student_semester_status')
    
    # Drop semester_promotions table
    op.drop_index('ix_promotion_academic_year', 'semester_promotions')
    op.drop_index('ix_promotion_cohort_semester', 'semester_promotions')
    op.drop_table('semester_promotions')
    
    # Remove regulation_id from cohorts
    op.drop_constraint('fk_cohorts_regulation_id', 'cohorts', type_='foreignkey')
    op.drop_column('cohorts', 'regulation_id')
    
    # Drop regulations table
    op.drop_index('ix_regulation_active', 'regulations')
    op.drop_index('ix_regulation_college_year', 'regulations')
    op.drop_table('regulations')
