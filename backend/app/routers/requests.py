import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi import Request as FastAPIRequest
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Cluster
from app.models import Request as RequestModel
from app.rate_limit import enforce_rate_limit, get_client_ip, hash_ip
from app.schemas import (
    JoinExistingIn,
    JoinExistingOut,
    RequestResultOut,
    RequestSubmissionIn,
    RequestSubmissionOut,
)
from app.services import clustering
from app.services.embeddings import embed_text
from app.services.normalization import normalize

router = APIRouter(tags=["requests"])


@router.post("/requests", response_model=RequestSubmissionOut)
def submit_requests(
    payload: RequestSubmissionIn, http_request: FastAPIRequest, db: Session = Depends(get_db)
) -> RequestSubmissionOut:
    ip_hash = hash_ip(get_client_ip(http_request))
    enforce_rate_limit(db, ip_hash)

    results: list[RequestResultOut] = []

    # Each product in a multi-product submission becomes its own `requests` row with its own
    # normalization/embedding/cluster (SPEC.md section 13) — keeps clustering accuracy per item.
    for item in payload.items:
        normalized = normalize(item.original_text, item.category)
        category = normalized.get("category") or item.category
        canonical_brand = normalized.get("canonical_brand") or ""
        canonical_variant = normalized.get("canonical_variant") or ""

        embedding_input = " ".join(p for p in [category, canonical_brand, canonical_variant] if p)
        embedding = embed_text(embedding_input)

        cluster = clustering.find_matching_cluster(
            db, payload.request_type, category, canonical_brand, canonical_variant, embedding
        )
        is_new_cluster = cluster is None
        if cluster is None:
            cluster = clustering.create_cluster(
                db,
                payload.request_type,
                category,
                canonical_brand,
                canonical_variant,
                embedding,
                payload.submitter_phone,
                payload.submitter_name,
            )
        else:
            clustering.join_cluster(db, cluster, embedding, payload.submitter_phone, payload.submitter_name)

        request_row = RequestModel(
            request_type=payload.request_type,
            category=category,
            original_text=item.original_text,
            canonical_brand=canonical_brand or None,
            canonical_variant=canonical_variant or None,
            reason=item.reason if payload.request_type.value == "new" else None,
            submitter_name=payload.submitter_name,
            submitter_phone=payload.submitter_phone,
            is_joined_existing=False,
            cluster_id=cluster.id,
            embedding=embedding,
            ip_hash=ip_hash,
        )
        db.add(request_row)
        db.flush()

        results.append(
            RequestResultOut(
                request_id=request_row.id,
                cluster_id=cluster.id,
                canonical_name=cluster.canonical_name,
                is_new_cluster=is_new_cluster,
            )
        )

    db.commit()
    return RequestSubmissionOut(results=results)


@router.post("/requests/join/{cluster_id}", response_model=JoinExistingOut)
def join_existing(
    cluster_id: uuid.UUID,
    payload: JoinExistingIn,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
) -> JoinExistingOut:
    ip_hash = hash_ip(get_client_ip(http_request))
    enforce_rate_limit(db, ip_hash)

    cluster = db.get(Cluster, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="הקלאסטר לא נמצא")

    # No normalization/embedding pass — the cluster is already known (SPEC.md section 7).
    clustering.join_cluster(db, cluster, cluster.centroid_embedding, payload.submitter_phone, payload.submitter_name)

    request_row = RequestModel(
        request_type=cluster.request_type,
        category=cluster.category,
        original_text=f"[גם אני רוצה] {cluster.canonical_name}",
        canonical_brand=cluster.canonical_brand,
        canonical_variant=cluster.canonical_variant,
        submitter_name=payload.submitter_name,
        submitter_phone=payload.submitter_phone,
        is_joined_existing=True,
        cluster_id=cluster.id,
        embedding=cluster.centroid_embedding,
        ip_hash=ip_hash,
    )
    db.add(request_row)
    db.commit()

    return JoinExistingOut(request_id=request_row.id, cluster_id=cluster.id, total_requests=cluster.total_requests)
