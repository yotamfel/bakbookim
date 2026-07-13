"""replace cluster status enum with free-text status_note

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("clusters", sa.Column("status_note", sa.Text(), nullable=True))
    op.execute("UPDATE clusters SET status_note = 'סופק' WHERE status = 'fulfilled'")
    op.execute("UPDATE clusters SET status_note = 'בקרוב' WHERE status = 'coming_soon'")
    op.drop_column("clusters", "status")
    op.execute("DROP TYPE IF EXISTS cluster_status")


def downgrade() -> None:
    cluster_status = sa.Enum("active", "coming_soon", "fulfilled", name="cluster_status")
    cluster_status.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "clusters", sa.Column("status", cluster_status, nullable=False, server_default="active")
    )
    op.drop_column("clusters", "status_note")
