import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Cluster, DailySnapshot, RangeType, RequestType
from app.models import Request as RequestModel
from app.schemas import ClusterListItemOut, ClusterReasonsOut

router = APIRouter(tags=["lists"])

_SORT_KEYS = {"top": "total_requests", "unique": "unique_submitters", "trending": "trend_delta"}


@router.get("/lists/{request_type}", response_model=list[ClusterListItemOut])
def get_list(
    request_type: RequestType,
    sort: str = Query("top", pattern="^(top|unique|trending|newest)$"),
    category: str | None = None,
    range: RangeType = Query(RangeType.month, alias="range"),
    db: Session = Depends(get_db),
) -> list[ClusterListItemOut]:
    snapshot = db.execute(
        select(DailySnapshot)
        .where(DailySnapshot.request_type == request_type, DailySnapshot.range_type == range)
        .order_by(DailySnapshot.snapshot_date.desc())
        .limit(1)
    ).scalar_one_or_none()

    if snapshot is None:
        return []

    items = list(snapshot.ranked_list)

    if category:
        items = [i for i in items if i.get("category") == category]

    if sort == "newest":
        items.sort(key=lambda i: i.get("first_seen_at", ""), reverse=True)
    else:
        key = _SORT_KEYS.get(sort, "total_requests")
        items.sort(key=lambda i: i.get(key, 0), reverse=True)

    return [ClusterListItemOut(**i) for i in items]


@router.get("/clusters/{cluster_id}/reasons", response_model=ClusterReasonsOut)
def get_cluster_reasons(
    cluster_id: uuid.UUID, limit: int = Query(5, ge=1, le=20), db: Session = Depends(get_db)
) -> ClusterReasonsOut:
    cluster = db.get(Cluster, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="קלאסטר לא נמצא")

    reasons = (
        db.execute(
            select(RequestModel.reason)
            .where(
                RequestModel.cluster_id == cluster_id,
                RequestModel.reason.is_not(None),
                RequestModel.reason != "",
            )
            .order_by(RequestModel.created_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    return ClusterReasonsOut(ai_summary_note=cluster.ai_summary_note, recent_reasons=list(reasons))
