"""add coming_soon cluster status

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-13

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adding an enum value can't run inside the normal migration transaction.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE cluster_status ADD VALUE IF NOT EXISTS 'coming_soon'")


def downgrade() -> None:
    # Postgres has no DROP VALUE for enums; downgrading would require rebuilding the type.
    pass
