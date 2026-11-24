import asyncio
import hashlib
import io
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import UploadedFile

CHUNK_SIZE = 1024 * 1024
ALLOWED_LOG_SUFFIXES = {".log", ".txt", ".csv", ".json"}
IMAGE_MIME_TYPES = {
    "BMP": "image/bmp",
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


async def store_upload(upload: UploadFile, kind: str, user_id: str, db: Session) -> tuple[UploadedFile, bytes]:
    content = bytearray()
    digest = hashlib.sha256()
    while True:
        chunk = await upload.read(CHUNK_SIZE)
        if not chunk:
            break
        content.extend(chunk)
        if len(content) > settings.max_upload_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds the {settings.max_upload_bytes}-byte limit",
            )
        digest.update(chunk)

    data = bytes(content)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    verified_content_type = validate_content(data, upload.filename or "", kind)

    safe_name = (upload.filename or "upload").replace("\\", "/").rsplit("/", 1)[-1][:255]
    suffix = Path(safe_name).suffix.lower()
    file_id = str(uuid.uuid4())
    target_dir = settings.storage_dir / kind
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / f"{file_id}{suffix}"
    await asyncio.to_thread(path.write_bytes, data)

    record = UploadedFile(
        id=file_id,
        user_id=user_id,
        kind=kind,
        original_name=safe_name,
        content_type=verified_content_type or upload.content_type or "application/octet-stream",
        storage_path=str(path.resolve()),
        sha256=digest.hexdigest(),
        size_bytes=len(data),
    )
    try:
        db.add(record)
        db.commit()
        db.refresh(record)
    except SQLAlchemyError:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    return record, data


def store_bytes(content: bytes, kind: str, user_id: str, filename: str, content_type: str, db: Session) -> UploadedFile:
    if not content:
        raise ValueError("Cannot store an empty model result")
    file_id = str(uuid.uuid4())
    target_dir = settings.storage_dir / kind
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / f"{file_id}{Path(filename).suffix.lower()}"
    path.write_bytes(content)
    record = UploadedFile(
        id=file_id,
        user_id=user_id,
        kind=kind,
        original_name=filename[:255],
        content_type=content_type,
        storage_path=str(path.resolve()),
        sha256=hashlib.sha256(content).hexdigest(),
        size_bytes=len(content),
    )
    try:
        db.add(record)
        db.commit()
        db.refresh(record)
    except SQLAlchemyError:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    return record


def validate_content(data: bytes, filename: str, kind: str) -> str | None:
    if kind in {"image", "mask", "image_reference"}:
        try:
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in IMAGE_MIME_TYPES:
                    raise HTTPException(status_code=415, detail="Unsupported image format")
                if image.width * image.height > 50_000_000:
                    raise HTTPException(status_code=413, detail="Image dimensions are too large")
                content_type = IMAGE_MIME_TYPES[image.format]
                image.verify()
                return content_type
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
            raise HTTPException(status_code=415, detail="File is not a valid supported image") from exc
    elif kind in {"logs", "logs_reference"}:
        suffix = Path(filename).suffix.lower()
        if suffix not in ALLOWED_LOG_SUFFIXES:
            raise HTTPException(status_code=415, detail="Logs must be .log, .txt, .csv, or .json files")
        if kind == "logs_reference" and suffix != ".csv":
            raise HTTPException(status_code=415, detail="Log evaluation references must be .csv files")
        try:
            data.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise HTTPException(status_code=415, detail="Log file must be UTF-8 encoded text") from exc
        return "application/json" if Path(filename).suffix.lower() == ".json" else "text/plain"
    raise ValueError(f"Unsupported upload kind: {kind}")
