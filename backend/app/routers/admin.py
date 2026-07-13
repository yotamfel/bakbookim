import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_admin
from app.models import AdminUser, Cluster
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
    query = select(RequestModel, Cluster.status, Cluster.canonical_name).join(
        Cluster, RequestModel.cluster_id == Cluster.id
    )
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
    for req, status, canonical_name in db.execute(query).all():
        item = AdminRequestOut.model_validate(req)
        item.status = status
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
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(req, field, value)
    db.commit()
    db.refresh(req)

    cluster = db.get(Cluster, req.cluster_id)
    out = AdminRequestOut.model_validate(req)
    out.status = cluster.status if cluster else None
    out.canonical_name = cluster.canonical_name if cluster else None
    return out


@router.delete("/requests/{request_id}")
def delete_request(
    request_id: uuid.UUID, _admin: str = Depends(require_admin), db: Session = Depends(get_db)
) -> dict:
    req = db.get(RequestModel, request_id)
    if req is None:
        raise HTTPException(status_code=404, detail="בקשה לא נמצאה")
    db.delete(req)
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
        raise HTTPException(status_code=404, detail="קלאסטר לא נמצא")
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
        raise HTTPException(status_code=404, detail="קלאסטר לא נמצא")
    if source.id == target.id:
        raise HTTPException(status_code=400, detail="לא ניתן למזג קלאסטר לתוך עצמו")
    if source.request_type != target.request_type:
        raise HTTPException(status_code=400, detail="לא ניתן למזג קלאסטרים ממסלולים שונים (חזרה/חדש)")

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
