"""
Two-stage clustering (SPEC.md section 5):
  1. Bucket by near-exact match on normalized fields (category + canonical_brand), partitioned by
     request_type — clusters from `return` and `new` never mix even for identical text.
  2. Within that bucket, use embedding cosine similarity to confirm the closest existing variant,
     or decide the variant is different enough that a new cluster is warranted.
If no same-brand bucket exists (or the request has no extracted brand), fall back to a stricter
global embedding search within the category, to tolerate any brand-normalization drift from Claude.
"""

from datetime import date as date_type

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Cluster, ClusterDailyCount, Request, RequestType

settings = get_settings()

BRAND_MATCH_SIMILARITY = settings.cluster_similarity_threshold
NO_BRAND_MATCH_SIMILARITY = 0.93


def _norm(value: str | None) -> str:
    return (value or "").strip().lower()


def build_canonical_name(category: str, brand: str, variant: str) -> str:
    parts = [p for p in [brand.strip(), variant.strip()] if p]
    return " ".join(parts) if parts else category


def find_matching_cluster(
    db: Session,
    request_type: RequestType,
    category: str,
    canonical_brand: str,
    canonical_variant: str,
    embedding: list[float],
) -> Cluster | None:
    norm_brand = _norm(canonical_brand)

    if norm_brand:
        row = db.execute(
            select(Cluster, Cluster.centroid_embedding.cosine_distance(embedding).label("distance"))
            .where(
                Cluster.request_type == request_type,
                Cluster.category == category,
                func.lower(func.trim(Cluster.canonical_brand)) == norm_brand,
            )
            .order_by("distance")
            .limit(1)
        ).first()
        if row is not None:
            cluster, distance = row
            if (1 - distance) >= BRAND_MATCH_SIMILARITY:
                return cluster
            return None  # same brand exists, but this variant is different enough -> new cluster

    # No same-brand bucket (or no brand extracted) -> stricter global fallback within the category.
    row = db.execute(
        select(Cluster, Cluster.centroid_embedding.cosine_distance(embedding).label("distance"))
        .where(Cluster.request_type == request_type, Cluster.category == category)
        .order_by("distance")
        .limit(1)
    ).first()
    if row is not None:
        cluster, distance = row
        if (1 - distance) >= NO_BRAND_MATCH_SIMILARITY:
            return cluster
    return None


def is_new_submitter(db: Session, cluster_id, phone: str | None, name: str | None) -> bool:
    if not phone and not name:
        return False
    query = select(Request.id).where(Request.cluster_id == cluster_id)
    query = query.where(Request.submitter_phone == phone) if phone else query.where(Request.submitter_name == name)
    return db.execute(query.limit(1)).first() is None


def bump_daily_count(db: Session, cluster_id) -> None:
    today = date_type.today()
    row = db.get(ClusterDailyCount, {"cluster_id": cluster_id, "date": today})
    if row:
        row.count_that_day += 1
    else:
        db.add(ClusterDailyCount(cluster_id=cluster_id, date=today, count_that_day=1))


def join_cluster(db: Session, cluster: Cluster, embedding: list[float], phone: str | None, name: str | None) -> None:
    n = cluster.total_requests
    if cluster.centroid_embedding is not None and n > 0:
        cluster.centroid_embedding = [
            (c * n + e) / (n + 1) for c, e in zip(cluster.centroid_embedding, embedding, strict=True)
        ]
    else:
        cluster.centroid_embedding = embedding
    cluster.total_requests = n + 1
    if is_new_submitter(db, cluster.id, phone, name):
        cluster.unique_submitters += 1
    bump_daily_count(db, cluster.id)


def create_cluster(
    db: Session,
    request_type: RequestType,
    category: str,
    canonical_brand: str,
    canonical_variant: str,
    embedding: list[float],
    phone: str | None,
    name: str | None,
) -> Cluster:
    cluster = Cluster(
        request_type=request_type,
        category=category,
        canonical_brand=canonical_brand or None,
        canonical_variant=canonical_variant or None,
        canonical_name=build_canonical_name(category, canonical_brand, canonical_variant),
        centroid_embedding=embedding,
        total_requests=1,
        unique_submitters=1 if (phone or name) else 0,
    )
    db.add(cluster)
    db.flush()
    bump_daily_count(db, cluster.id)
    return cluster
