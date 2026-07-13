import enum
import uuid
from datetime import date as date_type
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

EMBEDDING_DIM = 3072  # text-embedding-3-large


class RequestType(str, enum.Enum):
    return_ = "return"
    new = "new"


class ClusterStatus(str, enum.Enum):
    active = "active"
    fulfilled = "fulfilled"


class RangeType(str, enum.Enum):
    week = "week"
    month = "month"
    three_months = "3months"
    six_months = "6months"
    year = "year"


def pg_enum(enum_cls: type[enum.Enum], name: str) -> Enum:
    # SQLAlchemy's Enum binds by member *name* by default, not `.value` — several members here
    # (RequestType.return_, RangeType.three_months/six_months) have name != value, so this is required.
    return Enum(enum_cls, name=name, values_callable=lambda obj: [e.value for e in obj])


class Cluster(Base):
    __tablename__ = "clusters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_type: Mapped[RequestType] = mapped_column(pg_enum(RequestType, "request_type"), nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)

    # Normalized identity fields used for the exact/near-exact match stage (section 5.2 of SPEC.md).
    # Not listed verbatim in the spec's `clusters` table but required to compare a new request
    # against existing clusters before falling back to embedding similarity.
    canonical_brand: Mapped[str | None] = mapped_column(Text, nullable=True)
    canonical_variant: Mapped[str | None] = mapped_column(Text, nullable=True)

    canonical_name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ClusterStatus] = mapped_column(
        pg_enum(ClusterStatus, "cluster_status"), nullable=False, default=ClusterStatus.active
    )
    ai_summary_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    total_requests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unique_submitters: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Running centroid of member embeddings — compared against a new request's embedding
    # during the similarity stage, then updated incrementally as new requests join.
    centroid_embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM), nullable=True)

    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    requests: Mapped[list["Request"]] = relationship(back_populates="cluster")
    daily_counts: Mapped[list["ClusterDailyCount"]] = relationship(
        back_populates="cluster", cascade="all, delete-orphan"
    )


class Request(Base):
    __tablename__ = "requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_type: Mapped[RequestType] = mapped_column(pg_enum(RequestType, "request_type"), nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)

    canonical_brand: Mapped[str | None] = mapped_column(Text, nullable=True)
    canonical_variant: Mapped[str | None] = mapped_column(Text, nullable=True)

    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    submitter_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitter_phone: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_joined_existing: Mapped[bool] = mapped_column(nullable=False, default=False)

    cluster_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clusters.id"), nullable=False)
    cluster: Mapped["Cluster"] = relationship(back_populates="requests")

    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM), nullable=True)

    ip_hash: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ClusterDailyCount(Base):
    __tablename__ = "cluster_daily_counts"
    __table_args__ = (UniqueConstraint("cluster_id", "date", name="uq_cluster_daily_counts_cluster_date"),)

    cluster_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clusters.id"), primary_key=True
    )
    date: Mapped[date_type] = mapped_column(Date, primary_key=True)
    count_that_day: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    cluster: Mapped["Cluster"] = relationship(back_populates="daily_counts")


class DailySnapshot(Base):
    __tablename__ = "daily_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    request_type: Mapped[RequestType] = mapped_column(pg_enum(RequestType, "request_type"), nullable=False)
    range_type: Mapped[RangeType] = mapped_column(pg_enum(RangeType, "range_type"), nullable=False)
    ranked_list: Mapped[list] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "snapshot_date", "request_type", "range_type", name="uq_daily_snapshots_date_type_range"
        ),
    )


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
