"""add include_in_clustering to users

Revision ID: 84171967b583
Revises: 1280fb69f423
Create Date: 2026-06-27 04:42:38.602229

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '84171967b583'
down_revision: Union[str, Sequence[str], None] = '1280fb69f423'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """Add include_in_clustering to users if not already present."""
    if not _column_exists('users', 'include_in_clustering'):
        op.add_column(
            'users',
            sa.Column('include_in_clustering', sa.Boolean(), nullable=False, server_default='1'),
        )


def downgrade() -> None:
    """Drop include_in_clustering from users if present."""
    if _column_exists('users', 'include_in_clustering'):
        op.drop_column('users', 'include_in_clustering')
