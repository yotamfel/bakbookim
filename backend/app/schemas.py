import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.models import ClusterStatus, RangeType, RequestType


# ---------- Public: submitting requests ----------

class RequestItemIn(BaseModel):
    category: str
    original_text: str = Field(min_length=1, max_length=500)
    reason: str | None = Field(default=None, max_length=1000)

    @field_validator("original_text")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()


class RequestSubmissionIn(BaseModel):
    request_type: RequestType
    submitter_name: str | None = Field(default=None, max_length=200)
    submitter_phone: str | None = Field(default=None, max_length=50)
    items: list[RequestItemIn] = Field(min_length=1, max_length=10)


class RequestResultOut(BaseModel):
    request_id: uuid.UUID
    cluster_id: uuid.UUID
    canonical_name: str
    is_new_cluster: bool
    redirected_to_return: bool = False


class RequestSubmissionOut(BaseModel):
    results: list[RequestResultOut]


class JoinExistingIn(BaseModel):
    submitter_name: str | None = Field(default=None, max_length=200)
    submitter_phone: str | None = Field(default=None, max_length=50)


class JoinExistingOut(BaseModel):
    request_id: uuid.UUID
    cluster_id: uuid.UUID
    total_requests: int


# ---------- Public: lists ----------

class ClusterListItemOut(BaseModel):
    cluster_id: uuid.UUID
    canonical_name: str
    category: str
    status: ClusterStatus
    total_requests: int
    unique_submitters: int
    first_seen_at: datetime
    trend_delta: int = 0

    model_config = {"from_attributes": True}


class ClusterReasonsOut(BaseModel):
    ai_summary_note: str | None
    recent_reasons: list[str]


# ---------- Admin ----------

class AdminLoginIn(BaseModel):
    username: str
    password: str


class AdminLoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminRequestOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    request_type: RequestType
    category: str
    canonical_brand: str | None
    canonical_variant: str | None
    original_text: str
    submitter_name: str | None
    submitter_phone: str | None
    status: ClusterStatus | None = None
    cluster_id: uuid.UUID
    canonical_name: str | None = None

    model_config = {"from_attributes": True}


class AdminRequestUpdateIn(BaseModel):
    category: str | None = None
    original_text: str | None = None
    submitter_name: str | None = None
    submitter_phone: str | None = None
    cluster_id: uuid.UUID | None = None


class AdminClusterOut(BaseModel):
    id: uuid.UUID
    request_type: RequestType
    category: str
    canonical_name: str
    status: ClusterStatus
    total_requests: int
    unique_submitters: int
    first_seen_at: datetime
    last_seen_at: datetime

    model_config = {"from_attributes": True}


class AdminClusterUpdateIn(BaseModel):
    status: ClusterStatus | None = None
    canonical_name: str | None = None


class AdminClusterMergeIn(BaseModel):
    source_cluster_id: uuid.UUID
    target_cluster_id: uuid.UUID
