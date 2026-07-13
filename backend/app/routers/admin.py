import uuid
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_admin
from app.models import AdminUser, Cluster, ClusterDailyCount
from app.models import Request as RequestModel
from app.schemas import (
    AdminClusterMergeIn,
    AdminClusterOut,
    AdminClusterUpdateIn,
    AdminLoginIn,
    AdminLoginOut,
    AdminRequestOut,
    AdminRequestUpdateIn,
)
from app.services.auth import create_access_token, verify_password

router = APIRouter(prefix="/admin", tags=["admin"])


def _recompute_cluster_counters(db: Session, cluster_id: uuid.UUID) -> None:
    """Keeps a cluster's counters/daily-counts consistent after its requests change outside the
    normal submission pipeline (admin delete/bulk-delete). Deletes the cluster entirely if it
    ends up with no requests left."""
    remaining = db.execute(select(RequestModel).where(RequestModel.cluster_id == cluster_id)).scalars().all()
    cluster = db.get(Cluster, cluster_id)
    if cluster is None:
        return
    if not remaining:
        db.delete(cluster)
        return

    cluster.total_requests = len(remaining)
    identifiers = {r.submitter_phone or r.submitter_name for r in remaining if (r.submitter_phone or r.submitter_name)}
    cluster.unique_submitters = len(identifiers)

    db.execute(delete(ClusterDailyCount).where(ClusterDailyCount.cluster_id == cluster_id))
    for day, count in Counter(r.created_at.date() for r in remaining).items():
        db.add(ClusterDailyCount(cluster_id=cluster_id, date=day, count_that_day=count))


@router.post("/login", response_model=AdminLoginOut)
def login(payload: AdminLoginIn, db: Session = Depends(get_db)) -> AdminLoginOut:
    user = db.execute(select(AdminUser).where(AdminUser.username == payload.username)).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="שם משתמש או סיסמה שגויים")
    return AdminLoginOut(access_token=create_access_token(user.username))


@router.get("/requests", response_model=list[AdminRequestOut])
def list_requests(
    search: str | None = None,
    _admin: str = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AdminRequestOut]:
    # Single free-text box searching phone/name/original_text/canonical_name (SPEC.md section 10.1) —
    # ILIKE is enough at MVP scale, no need for full-text/trigram indexes yet.
    query = select(RequestModel, Cluster.canonical_name).join(Cluster, RequestModel.cluster_id == Cluster.id)
    if search:
        like = f"%{search}%"
        query = query.where(
            or_(
                RequestModel.original_text.ilike(like),
                RequestModel.submitter_name.ilike(like),
                RequestModel.submitter_phone.ilike(like),
                Cluster.canonical_name.ilike(like),
            )
        )
    query = query.order_by(RequestModel.created_at.desc()).limit(500)

    out: list[AdminRequestOut] = []
    for req, canonical_name in db.execute(query).all():
        item = AdminRequestOut.model_validate(req)
        item.canonical_name = canonical_name
        out.append(item)
    return out


@router.patch("/requests/{request_id}", response_model=AdminRequestOut)
def update_request(
    request_id: uuid.UUID,
    payload: AdminRequestUpdateIn,
    _admin: str = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminRequestOut:
    req = db.get(RequestModel, request_id)
    if req is None:
        raise HTTPException(status_code=404, detail="בקשה לא נמצאה")

    updates = payload.model_dump(exclude_unset=True)
    previous_cluster_id = req.cluster_id
    for field, value in updates.items():
        setattr(req, field, value)
    db.flush()

    # Manual "split" (SPEC.md section 10.2) moves a request to a different/new cluster_id — the
    # product it left behind may now be empty and should disappear; the one it joined needs its
    # counters recomputed too.
    if "cluster_id" in updates and updates["cluster_id"] != previous_cluster_id:
        _recompute_cluster_counters(db, previous_cluster_id)
        _recompute_cluster_counters(db, req.cluster_id)

    db.commit()
    db.refresh(req)

    cluster = db.get(Cluster, req.cluster_id)
    out = AdminRequestOut.model_validate(req)
    out.canonical_name = cluster.canonical_name if cluster else None
    return out


@router.delete("/requests/bulk")
def bulk_delete_requests(
    submitter_phone: str | None = None,
    submitter_name: str | None = None,
    cluster_id: uuid.UUID | None = None,
    _admin: str = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Deletes every request matching the given filter(s) — e.g. everything from one submitter,
    or every request tied to one product. At least one filter is required as a safety rail."""
    if not submitter_phone and not submitter_name and cluster_id is None:
        raise HTTPException(status_code=400, detail="יש לספק לפחות פילטר אחד (טלפון/שם/מוצר)")

    query = select(RequestModel)
    if submitter_phone:
        query = query.where(RequestModel.submitter_phone == submitter_phone)
    if submitter_name:
        query = query.where(RequestModel.submitter_name == submitter_name)
    if cluster_id is not None:
        query = query.where(RequestModel.cluster_id == cluster_id)

    rows = db.execute(query).scalars().all()
    affected_cluster_ids = {r.cluster_id for r in rows}
    deleted_count = len(rows)
    for r in rows:
        db.delete(r)
    db.flush()

    for cid in affected_cluster_ids:
        _recompute_cluster_counters(db, cid)

    db.commit()
    return {"deleted": deleted_count}


@router.delete("/requests/{request_id}")
def delete_request(
    request_id: uuid.UUID, _admin: str = Depends(require_admin), db: Session = Depends(get_db)
) -> dict:
    req = db.get(RequestModel, request_id)
    if req is None:
        raise HTTPException(status_code=404, detail="בקשה לא נמצאה")
    cluster_id = req.cluster_id
    db.delete(req)
    db.flush()
    _recompute_cluster_counters(db, cluster_id)
    db.commit()
    return {"ok": True}


@router.get("/clusters", response_model=list[AdminClusterOut])
def list_clusters(_admin: str = Depends(require_admin), db: Session = Depends(get_db)) -> list[AdminClusterOut]:
    clusters = db.execute(select(Cluster).order_by(Cluster.last_seen_at.desc()).limit(500)).scalars().all()
    return [AdminClusterOut.model_validate(c) for c in clusters]


@router.patch("/clusters/{cluster_id}", response_model=AdminClusterOut)
def update_cluster(
    cluster_id: uuid.UUID,
    payload: AdminClusterUpdateIn,
    _admin: str = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminClusterOut:
    cluster = db.get(Cluster, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="מוצר לא נמצא")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cluster, field, value)
    db.commit()
    db.refresh(cluster)
    return AdminClusterOut.model_validate(cluster)


@router.post("/clusters/merge", response_model=AdminClusterOut)
def merge_clusters(
    payload: AdminClusterMergeIn, _admin: str = Depends(require_admin), db: Session = Depends(get_db)
) -> AdminClusterOut:
    """Manual fix for AI mis-clustering (SPEC.md section 10.2), e.g. whiskey wrongly grouped with
    bourbon — moves every request from source into target and deletes the now-empty source.
    Manual "split" is done from the requests table instead: editing a request's cluster_id
    (PATCH /admin/requests/{id}) moves it to a different (or brand-new) cluster one at a time."""
    source = db.get(Cluster, payload.source_cluster_id)
    target = db.get(Cluster, payload.target_cluster_id)
    if source is None or target is None:
        raise HTTPException(status_code=404, detail="מוצר לא נמצא")
    if source.id == target.id:
        raise HTTPException(status_code=400, detail="לא ניתן למזג מוצר לתוך עצמו")
    if source.request_type != target.request_type:
        raise HTTPException(status_code=400, detail="לא ניתן למזג מוצרים ממסלולים שונים (חזרה/חדש)")

    db.execute(
        RequestModel.__table__.update().where(RequestModel.cluster_id == source.id).values(cluster_id=target.id)
    )

    identifiers = db.execute(
        select(RequestModel.submitter_phone, RequestModel.submitter_name).where(
            RequestModel.cluster_id == target.id
        )
    ).all()
    target.total_requests += source.total_requests
    target.unique_submitters = len({phone or name for phone, name in identifiers if (phone or name)})
    target.last_seen_at = max(target.last_seen_at, source.last_seen_at)

    db.delete(source)
    db.commit()
    db.refresh(target)
    return AdminClusterOut.model_validate(target)
