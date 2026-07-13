import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request as FastAPIRequest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Request as RequestModel

settings = get_settings()


def hash_ip(ip: str) -> str:
    return hashlib.sha256(f"{ip}:{settings.ip_hash_salt}".encode()).hexdigest()


def get_client_ip(request: FastAPIRequest) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_rate_limit(db: Session, ip_hash: str) -> None:
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    count = db.scalar(
        select(func.count())
        .select_from(RequestModel)
        .where(RequestModel.ip_hash == ip_hash, RequestModel.created_at >= since)
    )
    if count is not None and count >= settings.rate_limit_per_hour:
        raise HTTPException(status_code=429, detail="יותר מדי בקשות מכתובת IP זו. נסו שוב מאוחר יותר.")
