from sqlalchemy import distinct, select
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Cluster, RequestType
from app.schemas import CatalogProductOut

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/brands", response_model=list[str])
def list_brands(request_type: RequestType, category: str, db: Session = Depends(get_db)) -> list[str]:
    """Brands already known for this (request_type, category) — lets the request form offer
    picking an existing product instead of always requiring free text + AI normalization."""
    rows = db.execute(
        select(distinct(Cluster.canonical_brand))
        .where(
            Cluster.request_type == request_type,
            Cluster.category == category,
            Cluster.canonical_brand.is_not(None),
            Cluster.canonical_brand != "",
        )
        .order_by(Cluster.canonical_brand)
    ).scalars().all()
    return list(rows)


@router.get("/products", response_model=list[CatalogProductOut])
def list_products(
    request_type: RequestType, category: str, canonical_brand: str, db: Session = Depends(get_db)
) -> list[CatalogProductOut]:
    clusters = (
        db.execute(
            select(Cluster)
            .where(
                Cluster.request_type == request_type,
                Cluster.category == category,
                Cluster.canonical_brand == canonical_brand,
            )
            .order_by(Cluster.canonical_name)
        )
        .scalars()
        .all()
    )
    return [
        CatalogProductOut(cluster_id=c.id, canonical_variant=c.canonical_variant, canonical_name=c.canonical_name)
        for c in clusters
    ]
