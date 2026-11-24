import base64
import csv
import io
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.security import get_current_user
from app.db.models import RestorationSession, UploadedFile, User, new_id
from app.db.session import get_db
from app.schemas import SessionResultResponse
from app.services.audit import write_audit
from app.services.files import store_bytes, store_upload
from app.services.image_restorer import ImageInferenceError
from app.services.log_restorer import LogInferenceError
from app.services.models import ModelRegistry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/restore", tags=["restoration"])


@router.post("/image", response_model=SessionResultResponse)
async def restore_image(
    request: Request,
    image: UploadFile | None = File(default=None),
    mask: UploadFile | None = File(default=None),
    reference: UploadFile | None = File(default=None),
    mode: str = Form(default="masked"),
    image_id: str | None = Form(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionResultResponse:
    if (image is None) == (image_id is None):
        raise HTTPException(status_code=422, detail="Provide exactly one of image or image_id")
    if mode not in {"auto", "masked"}:
        raise HTTPException(status_code=422, detail="mode must be 'auto' or 'masked'")
    if mode == "auto":
        raise HTTPException(
            status_code=422,
            detail="Automatic damage detection is not supported by this mask-conditioned model.",
        )
    if mask is None:
        raise HTTPException(
            status_code=422,
            detail="This image model requires an explicit damage mask; automatic damage localization is unavailable.",
        )

    if image is not None:
        original, image_bytes = await store_upload(image, "image", user.id, db)
        _audit_upload(request, user, original, "image")
    else:
        original = _get_owned_file(image_id, user.id, "image", db)
        image_bytes = Path(original.storage_path).read_bytes()

    mask_bytes = await mask.read(settings.max_upload_bytes + 1)
    if len(mask_bytes) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Mask exceeds the configured file size limit")
    _check_mask_dimensions(image_bytes, mask_bytes)
    await mask.seek(0)
    mask_record, mask_bytes = await store_upload(mask, "mask", user.id, db)
    _audit_upload(request, user, mask_record, "mask")

    reference_record = None
    reference_bytes = None
    if reference is not None:
        reference_bytes = await reference.read(settings.max_upload_bytes + 1)
        if len(reference_bytes) > settings.max_upload_bytes:
            raise HTTPException(status_code=413, detail="Reference image exceeds the configured file size limit")
        _check_reference_dimensions(image_bytes, reference_bytes)
        await reference.seek(0)
        reference_record, reference_bytes = await store_upload(
            reference, "image_reference", user.id, db
        )
        _audit_upload(request, user, reference_record, "image_reference")

    session = _start_session(
        user=user,
        kind="image",
        original=original,
        mask=mask_record,
        reference=reference_record,
        model_name="hfi_gan_final",
        request=request,
        db=db,
    )
    registry: ModelRegistry = request.app.state.model_registry
    inference_started = time.perf_counter()
    try:
        if registry.image_restorer is None:
            raise HTTPException(status_code=503, detail=registry.status()["image"]["detail"])
        image_data, confidence, metrics = await run_in_threadpool(
            registry.image_restorer.restore, image_bytes, mask_bytes, reference_bytes
        )
        if reference_record is not None:
            metrics["reference_sha256"] = reference_record.sha256
        result = store_bytes(
            image_data, "result_image", user.id, "restored.png", "image/png", db
        )
        session.result_file_id = result.id
        session.status = "completed"
        session.confidence_score = confidence
        session.confidence_metric = "flip_consistency"
        session.confidence_method = registry.image_restorer.confidence_method
        session.metrics = metrics
        session.inference_time_ms = (time.perf_counter() - inference_started) * 1000
        session.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(session)
        write_audit(
            request_id=request.state.request_id,
            actor_id=user.id,
            action="restoration.image.completed",
            method=request.method,
            path=request.url.path,
            status_code=200,
            details={
                "session_id": session.id,
                "model": session.model_name,
                "original_sha256": original.sha256,
                "mask_sha256": mask_record.sha256,
                "reference_sha256": reference_record.sha256 if reference_record else None,
                "result_sha256": result.sha256,
                "confidence_score": confidence,
                "confidence_method": session.confidence_metric,
                "metrics": metrics,
            },
        )
        return _result_response(session, original, mask_record, result)
    except ImageInferenceError as exc:
        _fail_session(session, str(exc), db)
        _audit_failure(request, user, session, original, mask_record, exc, reference_record)
        raise HTTPException(
            status_code=422,
            detail={"session_id": session.id, "message": str(exc)},
        ) from exc
    except HTTPException as exc:
        _fail_session(session, str(exc.detail), db)
        _audit_failure(request, user, session, original, mask_record, exc, reference_record)
        raise HTTPException(
            status_code=exc.status_code,
            detail={"session_id": session.id, "message": str(exc.detail)},
        ) from exc
    except Exception as exc:
        logger.exception("Image inference failed for session %s", session.id)
        _fail_session(session, f"Inference failed: {type(exc).__name__}", db)
        _audit_failure(request, user, session, original, mask_record, exc, reference_record)
        raise HTTPException(
            status_code=500,
            detail={"session_id": session.id, "message": "Image inference failed"},
        ) from exc


@router.post("/logs", response_model=SessionResultResponse)
async def restore_logs(
    request: Request,
    file: UploadFile | None = File(default=None),
    reference: UploadFile | None = File(default=None),
    file_id: str | None = Form(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionResultResponse:
    if (file is None) == (file_id is None):
        raise HTTPException(status_code=422, detail="Provide exactly one of file or file_id")
    if file is not None:
        original, file_bytes = await store_upload(file, "logs", user.id, db)
        _audit_upload(request, user, original, "logs")
    else:
        original = _get_owned_file(file_id, user.id, "logs", db)
        file_bytes = Path(original.storage_path).read_bytes()

    reference_record = None
    reference_bytes = None
    if reference is not None:
        reference_record, reference_bytes = await store_upload(
            reference, "logs_reference", user.id, db
        )
        _audit_upload(request, user, reference_record, "logs_reference")

    session = _start_session(
        user=user,
        kind="logs",
        original=original,
        mask=None,
        reference=reference_record,
        model_name="logs_best_checkpoint",
        request=request,
        db=db,
    )
    registry: ModelRegistry = request.app.state.model_registry
    inference_started = time.perf_counter()
    try:
        if registry.log_restorer is None:
            raise HTTPException(status_code=503, detail=registry.status()["logs"]["detail"])
        output, confidence, metrics, original_data, restored_data = await run_in_threadpool(
            registry.log_restorer.restore_csv, file_bytes
        )
        if reference_bytes is not None:
            quality_metrics = await run_in_threadpool(
                registry.log_restorer.compare_with_reference,
                original_data,
                restored_data,
                reference_bytes,
            )
            metrics.update(quality_metrics)
        else:
            metrics.update({
                "quality_reference_available": False,
                "categorical_accuracy_percent": None,
                "categorical_fields_evaluated": 0,
                "categorical_accuracy_by_field": {},
                "numeric_fields_evaluated": 0,
                "numeric_metrics_by_field": {},
                "quality_metric_note": (
                    "Upload a clean reference CSV with the exact same rows and row order "
                    "to calculate categorical accuracy and per-field numeric MAE/RMSE."
                ),
            })
        if reference_record is not None:
            metrics["reference_sha256"] = reference_record.sha256
        result = store_bytes(
            output, "result_logs", user.id, "restored.json", "application/json", db
        )
        session.result_file_id = result.id
        session.status = "completed"
        session.confidence_score = confidence
        session.confidence_metric = "mc_dropout_field_confidence"
        session.confidence_method = registry.log_restorer.confidence_method
        session.metrics = metrics
        session.inference_time_ms = (time.perf_counter() - inference_started) * 1000
        session.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(session)
        write_audit(
            request_id=request.state.request_id,
            actor_id=user.id,
            action="restoration.logs.completed",
            method=request.method,
            path=request.url.path,
            status_code=200,
            details={
                "session_id": session.id,
                "model": session.model_name,
                "original_sha256": original.sha256,
                "reference_sha256": reference_record.sha256 if reference_record else None,
                "result_sha256": result.sha256,
                "confidence_score": confidence,
                "confidence_method": session.confidence_metric,
                "metrics": metrics,
            },
        )
        return _result_response(session, original, None, result, original_data, restored_data)
    except LogInferenceError as exc:
        _fail_session(session, str(exc), db)
        _audit_failure(request, user, session, original, None, exc, reference_record)
        raise HTTPException(
            status_code=422,
            detail={"session_id": session.id, "message": str(exc)},
        ) from exc
    except HTTPException as exc:
        _fail_session(session, str(exc.detail), db)
        _audit_failure(request, user, session, original, None, exc, reference_record)
        raise HTTPException(
            status_code=exc.status_code,
            detail={"session_id": session.id, "message": str(exc.detail)},
        ) from exc
    except Exception as exc:
        logger.exception("Logs inference failed for session %s", session.id)
        _fail_session(session, f"Inference failed: {type(exc).__name__}", db)
        _audit_failure(request, user, session, original, None, exc, reference_record)
        raise HTTPException(
            status_code=500,
            detail={"session_id": session.id, "message": "Logs inference failed"},
        ) from exc


@router.get("/{session_id}/result", response_model=SessionResultResponse)
def get_result(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionResultResponse:
    session = db.scalar(
        select(RestorationSession).where(
            RestorationSession.id == session_id,
            RestorationSession.user_id == user.id,
        )
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Restoration session not found")

    original = db.get(UploadedFile, session.original_file_id)
    mask = db.get(UploadedFile, session.mask_file_id) if session.mask_file_id else None
    result = db.get(UploadedFile, session.result_file_id) if session.result_file_id else None
    if session.status == "completed" and result is None:
        raise HTTPException(status_code=500, detail="Completed session is missing its result file")
    if original is None:
        raise HTTPException(status_code=500, detail="Session original file is missing")

    original_data: list[dict[str, str]] | None = None
    restored_data: list[dict[str, str]] | None = None
    if session.kind == "logs":
        original_text = Path(original.storage_path).read_text(encoding="utf-8-sig")
        original_data = _csv_data(original_text)
        restored_text = Path(result.storage_path).read_text(encoding="utf-8") if result else None
        restored_data = json.loads(restored_text) if restored_text else None
        return _result_response(
            session, original, mask, result, original_data, restored_data,
            original_text=original_text, restored_text=restored_text,
        )

    result_bytes = Path(result.storage_path).read_bytes() if result else None
    return _result_response(session, original, mask, result, result_bytes=result_bytes)


def _start_session(
    *,
    user: User,
    kind: str,
    original: UploadedFile,
    mask: UploadedFile | None,
    reference: UploadedFile | None,
    model_name: str,
    request: Request,
    db: Session,
) -> RestorationSession:
    session = RestorationSession(
        id=new_id(),
        user_id=user.id,
        kind=kind,
        status="processing",
        original_file_id=original.id,
        mask_file_id=mask.id if mask else None,
        reference_file_id=reference.id if reference else None,
        model_name=model_name,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    write_audit(
        request_id=request.state.request_id,
        actor_id=user.id,
        action=f"restoration.{kind}.started",
        method=request.method,
        path=request.url.path,
        status_code=202,
        details={
            "session_id": session.id,
            "model": model_name,
            "original_sha256": original.sha256,
            "mask_sha256": mask.sha256 if mask else None,
            "reference_sha256": reference.sha256 if reference else None,
        },
    )
    return session


def _fail_session(session: RestorationSession, reason: str, db: Session) -> None:
    session.status = "failed"
    session.failure_reason = reason[:2000]
    session.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)


def _audit_failure(
    request: Request,
    user: User,
    session: RestorationSession,
    original: UploadedFile,
    mask: UploadedFile | None,
    error: Exception,
    reference: UploadedFile | None = None,
) -> None:
    write_audit(
        request_id=request.state.request_id,
        actor_id=user.id,
        action=f"restoration.{session.kind}.failed",
        method=request.method,
        path=request.url.path,
        status_code=error.status_code if isinstance(error, HTTPException) else 500,
        details={
            "session_id": session.id,
            "model": session.model_name,
            "original_sha256": original.sha256,
            "mask_sha256": mask.sha256 if mask else None,
            "reference_sha256": reference.sha256 if reference else None,
            "reason": str(error.detail) if isinstance(error, HTTPException) else str(error),
        },
    )


def _result_response(
    session: RestorationSession,
    original: UploadedFile,
    mask: UploadedFile | None,
    result: UploadedFile | None,
    original_data: list[dict[str, str]] | bytes | None = None,
    restored_data: list[dict[str, str]] | None = None,
    original_text: str | None = None,
    restored_text: str | None = None,
    result_bytes: bytes | None = None,
) -> SessionResultResponse:
    values = {
        "session_id": session.id,
        "kind": session.kind,
        "status": session.status,
        "failure_reason": session.failure_reason,
        "model_name": session.model_name,
        "original_sha256": original.sha256,
        "mask_sha256": mask.sha256 if mask else None,
        "result_sha256": result.sha256 if result else None,
        "confidence_score": session.confidence_score,
        "confidence_metric": session.confidence_metric,
        "confidence_method": session.confidence_method,
        "inference_time_ms": session.inference_time_ms,
        "metrics": session.metrics,
        "created_at": session.created_at,
        "completed_at": session.completed_at,
        "original_data": original_data if isinstance(original_data, list) else None,
        "restored_data": restored_data,
        "original_text": original_text,
        "restored_text": restored_text,
    }
    if session.kind == "image":
        if isinstance(original_data, bytes):
            source_bytes = original_data
        else:
            source_bytes = Path(original.storage_path).read_bytes()
        source_mask = Path(mask.storage_path).read_bytes() if mask else None
        if result_bytes is None and result:
            result_bytes = Path(result.storage_path).read_bytes()
        values.update(
            original_image=_data_url(source_bytes, original.content_type),
            mask_image=_data_url(source_mask, mask.content_type) if source_mask and mask else None,
            restored_image=_data_url(result_bytes, result.content_type) if result_bytes and result else None,
        )
    return SessionResultResponse(**values)


def _csv_data(text: str) -> list[dict[str, str]]:
    reader = csv.DictReader(io.StringIO(text))
    return [dict(row) for row in reader if row and None not in row]


def _check_mask_dimensions(image_bytes: bytes, mask_bytes: bytes) -> None:
    try:
        with Image.open(io.BytesIO(image_bytes)) as original, Image.open(io.BytesIO(mask_bytes)) as mask:
            if original.size != mask.size:
                raise HTTPException(status_code=422, detail="Mask dimensions must match the original image")
            if original.width * original.height > 50_000_000:
                raise HTTPException(status_code=413, detail="Image dimensions are too large")
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=415, detail="Invalid image or mask file") from exc


def _check_reference_dimensions(image_bytes: bytes, reference_bytes: bytes) -> None:
    try:
        with Image.open(io.BytesIO(image_bytes)) as original:
            with Image.open(io.BytesIO(reference_bytes)) as reference:
                if original.size != reference.size:
                    raise HTTPException(
                        status_code=422,
                        detail="Reference image dimensions must match the damaged image",
                    )
                if original.width * original.height > 50_000_000:
                    raise HTTPException(status_code=413, detail="Image dimensions are too large")
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=415, detail="Invalid reference image") from exc


def _get_owned_file(file_id: str | None, user_id: str, kind: str, db: Session) -> UploadedFile:
    if file_id is None:
        raise HTTPException(status_code=422, detail="File identifier is required")
    record = db.scalar(
        select(UploadedFile).where(
            UploadedFile.id == file_id,
            UploadedFile.user_id == user_id,
            UploadedFile.kind == kind,
        )
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Uploaded file not found")
    if not Path(record.storage_path).is_file():
        raise HTTPException(status_code=500, detail="Stored upload is missing from disk")
    return record


def _audit_upload(request: Request, user: User, record: UploadedFile, kind: str) -> None:
    write_audit(
        request_id=request.state.request_id,
        actor_id=user.id,
        action=f"file.upload.{kind}",
        method=request.method,
        path=request.url.path,
        status_code=201,
        details={"file_id": record.id, "sha256": record.sha256, "size_bytes": record.size_bytes},
    )


def _data_url(content: bytes | None, content_type: str) -> str | None:
    if content is None:
        return None
    return f"data:{content_type};base64,{base64.b64encode(content).decode('ascii')}"
