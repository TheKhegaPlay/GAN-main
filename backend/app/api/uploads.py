from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas import UploadResponse
from app.services.audit import write_audit
from app.services.files import store_upload

router = APIRouter(prefix="/api/upload", tags=["uploads"])


async def upload(
    kind: str,
    file: UploadFile,
    request: Request,
    user: User,
    db: Session,
) -> UploadResponse:
    record, _ = await store_upload(file, kind, user.id, db)
    write_audit(
        request_id=request.state.request_id,
        actor_id=user.id,
        action=f"file.upload.{kind}",
        method=request.method,
        path=request.url.path,
        status_code=201,
        details={"file_id": record.id, "sha256": record.sha256, "size_bytes": record.size_bytes},
    )
    return UploadResponse(
        file_id=record.id,
        filename=record.original_name,
        kind=record.kind,
        sha256=record.sha256,
        size_bytes=record.size_bytes,
        created_at=record.created_at,
    )


@router.post("/image", response_model=UploadResponse, status_code=201)
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UploadResponse:
    return await upload("image", file, request, user, db)


@router.post("/logs", response_model=UploadResponse, status_code=201)
async def upload_logs(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UploadResponse:
    return await upload("logs", file, request, user, db)
