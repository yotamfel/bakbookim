"""remove ai_summary_note / ai_summary_updated_at from clusters

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("clusters", "ai_summary_updated_at")
    op.drop_column("clusters", "ai_summary_note")


def downgrade() -> None:
    op.add_column("clusters", sa.Column("ai_summary_note", sa.Text(), nullable=True))
    op.add_column("clusters", sa.Column("ai_summary_updated_at", sa.DateTime(timezone=True), nullable=True))
