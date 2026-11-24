from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserSummary(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str


class AuthResponse(BaseModel):
    token: str
    expiresIn: int
    user: UserSummary


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    name: str = Field(min_length=1, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ReportRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=36)


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    kind: str
    sha256: str
    size_bytes: int
    created_at: datetime


class RestoreResponse(BaseModel):
    session_id: str
    kind: str
    status: str
    failure_reason: str | None = None
    model_name: str
    original_sha256: str
    mask_sha256: str | None = None
    result_sha256: str | None = None
    confidence_score: float | None = None
    confidence_metric: str | None = None
    confidence_method: str | None = None
    inference_time_ms: float | None = None
    metrics: dict | None = None
    created_at: datetime
    completed_at: datetime | None = None


class SessionResultResponse(RestoreResponse):
    model_config = ConfigDict(from_attributes=True)
    original_image: str | None = None
    mask_image: str | None = None
    restored_image: str | None = None
    original_text: str | None = None
    restored_text: str | None = None
    original_data: list[dict[str, str]] | None = None
    restored_data: list[dict[str, str]] | None = None
