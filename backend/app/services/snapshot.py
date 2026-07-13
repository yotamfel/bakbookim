"""
Daily job logic (SPEC.md section 3/9): for every (request_type x range_type) combination, sums
`cluster_daily_counts` over the range's trailing window to rank clusters, computes a trend delta
(recent half of the window vs. the previous half), and upserts one `daily_snapshots` row. Public
lists read only from these snapshots, never the raw tables.

`unique_submitters` in the ranked list is the cluster's lifetime best-effort counter (SPEC.md
already documents unique_submitters as best-effort, since not every request includes contact
info) rather than a windowed count — there is no per-window identity log to derive that from.
"""

import uuid
from datetime import date, timedelta

from anthropic import Anthropic
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Cluster, ClusterDailyCount, DailySnapshot, RangeType
from app.models import Request as RequestModel
from app.models import RequestType

settings = get_settings()
_client = Anthropic(api_key=settings.anthropic_api_key)

_RANGE_DAYS = {
    RangeType.week: 7,
    RangeType.month: 30,
    RangeType.three_months: 90,
    RangeType.six_months: 180,
    RangeType.year: 365,
}


def build_snapshot(db: Session, request_type: RequestType, range_type: RangeType, today: date) -> list[dict]:
    window_days = _RANGE_DAYS[range_type]
    since = today - timedelta(days=window_days)
    half_cutoff = today - timedelta(days=window_days // 2)

    rows = db.execute(
        select(ClusterDailyCount.cluster_id, ClusterDailyCount.date, ClusterDailyCount.count_that_day)
        .join(Cluster, Cluster.id == ClusterDailyCount.cluster_id)
        .where(Cluster.request_type == request_type, ClusterDailyCount.date >= since)
    ).all()

    totals: dict[uuid.UUID, int] = {}
    recent: dict[uuid.UUID, int] = {}
    previous: dict[uuid.UUID, int] = {}
    for cluster_id, day, count in rows:
        totals[cluster_id] = totals.get(cluster_id, 0) + count
        bucket = recent if day >= half_cutoff else previous
        bucket[cluster_id] = bucket.get(cluster_id, 0) + count

    if not totals:
        return []

    ranked = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)[: settings.list_top_n]
    clusters_by_id = {c.id: c for c in db.execute(select(Cluster).where(Cluster.id.in_([cid for cid, _ in ranked]))).scalars()}

    ranked_list = []
    for cluster_id, windowed_total in ranked:
        cluster = clusters_by_id.get(cluster_id)
        if cluster is None:
            continue
        ranked_list.append(
            {
                "cluster_id": str(cluster.id),
                "canonical_name": cluster.canonical_name,
                "category": cluster.category,
                "status": cluster.status.value,
                "total_requests": windowed_total,
                "unique_submitters": cluster.unique_submitters,
                "first_seen_at": cluster.first_seen_at.isoformat(),
                "trend_delta": recent.get(cluster_id, 0) - previous.get(cluster_id, 0),
            }
        )
    return ranked_list


def upsert_snapshot(
    db: Session, request_type: RequestType, range_type: RangeType, today: date, ranked_list: list[dict]
) -> None:
    existing = db.execute(
        select(DailySnapshot).where(
            DailySnapshot.snapshot_date == today,
            DailySnapshot.request_type == request_type,
            DailySnapshot.range_type == range_type,
        )
    ).scalar_one_or_none()
    if existing:
        existing.ranked_list = ranked_list
    else:
        db.add(
            DailySnapshot(
                snapshot_date=today, request_type=request_type, range_type=range_type, ranked_list=ranked_list
            )
        )


def _summarize_reasons(product_name: str, reasons: list[str]) -> str:
    joined = "\n".join(f"- {r}" for r in reasons)
    message = _client.messages.create(
        model=settings.summary_model,
        max_tokens=200,
        messages=[
            {
                "role": "user",
                "content": (
                    f"להלן סיבות שחברי קהילה כתבו לבקשת המוצר '{product_name}':\n{joined}\n\n"
                    "כתוב תמצות קצר (1-2 משפטים, בעברית) של הסיבות הנפוצות. החזר רק את התמצות, בלי הקדמות."
                ),
            }
        ],
    )
    return "".join(block.text for block in message.content if block.type == "text").strip()


def refresh_ai_summaries(db: Session, cluster_ids: set[uuid.UUID]) -> None:
    for cluster_id in cluster_ids:
        cluster = db.get(Cluster, cluster_id)
        if cluster is None:
            continue
        reasons = (
            db.execute(
                select(RequestModel.reason)
                .where(
                    RequestModel.cluster_id == cluster_id,
                    RequestModel.reason.is_not(None),
                    RequestModel.reason != "",
                )
                .order_by(RequestModel.created_at.desc())
                .limit(20)
            )
            .scalars()
            .all()
        )
        if reasons:
            cluster.ai_summary_note = _summarize_reasons(cluster.canonical_name, list(reasons))


def run_daily_job(db: Session) -> None:
    today = date.today()
    touched_cluster_ids: set[uuid.UUID] = set()
    for request_type in RequestType:
        for range_type in RangeType:
            ranked_list = build_snapshot(db, request_type, range_type, today)
            upsert_snapshot(db, request_type, range_type, today, ranked_list)
            touched_cluster_ids.update(uuid.UUID(item["cluster_id"]) for item in ranked_list)
    refresh_ai_summaries(db, touched_cluster_ids)
    db.commit()
