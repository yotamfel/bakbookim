"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EMBEDDING_DIM = 3072

request_type_enum = postgresql.ENUM("return", "new", name="request_type", create_type=False)
cluster_status_enum = postgresql.ENUM("active", "fulfilled", name="cluster_status", create_type=False)
range_type_enum = postgresql.ENUM(
    "week", "month", "3months", "6months", "year", name="range_type", create_type=False
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    bind = op.get_bind()
    request_type_enum.create(bind, checkfirst=True)
    cluster_status_enum.create(bind, checkfirst=True)
    range_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "clusters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("request_type", request_type_enum, nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("canonical_brand", sa.Text(), nullable=True),
        sa.Column("canonical_variant", sa.Text(), nullable=True),
        sa.Column("canonical_name", sa.Text(), nullable=False),
        sa.Column("status", cluster_status_enum, nullable=False, server_default="active"),
        sa.Column("ai_summary_note", sa.Text(), nullable=True),
        sa.Column("total_requests", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("unique_submitters", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("centroid_embedding", Vector(EMBEDDING_DIM), nullable=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_clusters_request_type_category", "clusters", ["request_type", "category"])

    op.create_table(
        "requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("request_type", request_type_enum, nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("canonical_brand", sa.Text(), nullable=True),
        sa.Column("canonical_variant", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("submitter_name", sa.Text(), nullable=True),
        sa.Column("submitter_phone", sa.Text(), nullable=True),
        sa.Column("is_joined_existing", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "cluster_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clusters.id"),
            nullable=False,
        ),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True),
        sa.Column("ip_hash", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_requests_cluster_id", "requests", ["cluster_id"])
    op.create_index("ix_requests_ip_hash_created_at", "requests", ["ip_hash", "created_at"])

    op.create_table(
        "cluster_daily_counts",
        sa.Column(
            "cluster_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clusters.id"),
            primary_key=True,
        ),
        sa.Column("date", sa.Date(), primary_key=True),
        sa.Column("count_that_day", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("cluster_id", "date", name="uq_cluster_daily_counts_cluster_date"),
    )

    op.create_table(
        "daily_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("request_type", request_type_enum, nullable=False),
        sa.Column("range_type", range_type_enum, nullable=False),
        sa.Column("ranked_list", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint(
            "snapshot_date", "request_type", "range_type", name="uq_daily_snapshots_date_type_range"
        ),
    )

    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("username", sa.Text(), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("admin_users")
    op.drop_table("daily_snapshots")
    op.drop_table("cluster_daily_counts")
    op.drop_table("requests")
    op.drop_table("clusters")

    bind = op.get_bind()
    range_type_enum.drop(bind, checkfirst=True)
    cluster_status_enum.drop(bind, checkfirst=True)
    request_type_enum.drop(bind, checkfirst=True)
