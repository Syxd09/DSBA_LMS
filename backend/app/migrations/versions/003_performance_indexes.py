"""Add optimistic locking version columns

Revision ID: 003_performance_indexes
Revises: 002_phase2_models
Create Date: 2026-02-07 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_performance_indexes'
down_revision = '002_phase2_models'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add version column for optimistic locking (MAJ-016)
    # This ensures concurrent edits don't overwrite each other
    op.add_column('student_marks', sa.Column('version', sa.Integer(), server_default='1', nullable=False))
    op.add_column('student_question_marks', sa.Column('version', sa.Integer(), server_default='1', nullable=False))
    op.add_column('final_marks', sa.Column('version', sa.Integer(), server_default='1', nullable=False))
    op.add_column('exams', sa.Column('version', sa.Integer(), server_default='1', nullable=False))


def downgrade() -> None:
    # Remove version columns
    op.drop_column('exams', 'version')
    op.drop_column('final_marks', 'version')
    op.drop_column('student_question_marks', 'version')
    op.drop_column('student_marks', 'version')
