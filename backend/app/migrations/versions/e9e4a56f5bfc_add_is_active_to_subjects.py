"""add_is_active_to_subjects

Revision ID: e9e4a56f5bfc
Revises: ffc6e82e9eed
Create Date: 2026-02-12 20:02:31.547710

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9e4a56f5bfc'
down_revision: Union[str, None] = 'ffc6e82e9eed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('subjects', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))


def downgrade() -> None:
    op.drop_column('subjects', 'is_active')
