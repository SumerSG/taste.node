"""add_venue_columns_address_source_url_rating_review_count

Revision ID: 6bc3b7f9efa3
Revises: 84171967b583
Create Date: 2026-06-27 08:03:38.075357

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6bc3b7f9efa3'
down_revision: Union[str, Sequence[str], None] = '84171967b583'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    return table_name in inspector.get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """Upgrade schema."""
    if not _table_exists("venues"):
        op.create_table(
            "venues",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("address", sa.String(), nullable=True),
            sa.Column("location", sa.JSON(), nullable=True),
            sa.Column("cuisines", sa.JSON(), nullable=False),
            sa.Column("dietary_tags", sa.JSON(), nullable=False),
            sa.Column("price_tier", sa.Integer(), nullable=True),
            sa.Column("health_score", sa.Float(), nullable=True),
            sa.Column("source", sa.String(), nullable=False, server_default="synthetic"),
            sa.Column("source_url", sa.String(), nullable=True),
            sa.Column("image_url", sa.String(), nullable=True),
            sa.Column("rating", sa.Float(), nullable=True),
            sa.Column("review_count", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _column_exists("venues", "address"):
        op.add_column("venues", sa.Column("address", sa.String(), nullable=True))
    if not _column_exists("venues", "source_url"):
        op.add_column("venues", sa.Column("source_url", sa.String(), nullable=True))
    if not _column_exists("venues", "rating"):
        op.add_column("venues", sa.Column("rating", sa.Float(), nullable=True))
    if not _column_exists("venues", "review_count"):
        op.add_column("venues", sa.Column("review_count", sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    if _column_exists("venues", "review_count"):
        op.drop_column("venues", "review_count")
    if _column_exists("venues", "rating"):
        op.drop_column("venues", "rating")
    if _column_exists("venues", "source_url"):
        op.drop_column("venues", "source_url")
    if _column_exists("venues", "address"):
        op.drop_column("venues", "address")
    if _table_exists("venues"):
        op.drop_table("venues")
