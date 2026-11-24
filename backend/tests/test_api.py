import io
import hashlib
import csv
import json
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.pool import StaticPool
from PIL import Image

from app.db.base import Base
from app.db.models import AuditLog, RestorationSession, UploadedFile, User
from app.db.session import SessionLocal
from app.main import app
from app.services.log_restorer import LogInferenceError


FIELDS = [
    "Time", "Duration", "SrcDevice", "DstDevice", "Protocol", "SrcPort",
    "DstPort", "SrcPackets", "DstPackets", "SrcBytes", "DstBytes",
]


class StubImageRestorer:
    confidence_method = "test flip-consistency heuristic"

    def restore(
        self,
        image_bytes: bytes,
        mask_bytes: bytes | None,
        reference_bytes: bytes | None = None,
    ):
        return image_bytes, 85.0, {
            "mask_coverage": 0.25,
            "quality_reference_available": reference_bytes is not None,
            "psnr_db": 31.2 if reference_bytes else None,
            "ssim": 0.91 if reference_bytes else None,
            "lpips": 0.08 if reference_bytes else None,
            "lpips_status": "available" if reference_bytes else "not_computed",
            "quality_metric_note": "test quality metrics",
        }


class StubLogRestorer:
    confidence_method = "test MC-dropout heuristic"

    def restore_csv(self, content: bytes):
        reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
        if reader.fieldnames != FIELDS:
            raise LogInferenceError("The logs model only supports NetFlow CSV with the exact header.")
        rows = list(reader)
        for row in rows:
            if row["Protocol"] == "<MASK>":
                row["Protocol"] = "6"
        restored = json.dumps(rows, ensure_ascii=False, indent=2).encode("utf-8")
        return restored, 78.0, {"records_processed": len(rows), "records_restored": 1}, rows, rows

    def compare_with_reference(self, damaged_rows, restored_rows, reference_content):
        return {
            "quality_reference_available": True,
            "categorical_accuracy_percent": 100.0,
            "categorical_fields_evaluated": 1,
            "categorical_accuracy_by_field": {"Protocol": {"masked_values": 1, "accuracy_percent": 100.0}},
            "numeric_fields_evaluated": 0,
            "numeric_metrics_by_field": {},
            "quality_metric_note": "test reference metrics",
        }


class StubModelRegistry:
    def __init__(self):
        self.image_restorer = StubImageRestorer()
        self.log_restorer = StubLogRestorer()

    def load_once(self):
        return None

    def status(self):
        return {
            "image": {"checkpoint_loaded": True, "inference_ready": True, "detail": "test adapter"},
            "logs": {"checkpoint_loaded": True, "inference_ready": True, "detail": "test adapter"},
        }


@pytest.fixture
def client(tmp_path, monkeypatch):
    import app.main as main_module
    from app.core.config import settings

    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    original_engine = main_module.engine
    original_storage = settings.storage_dir
    original_database_url = settings.database_url
    monkeypatch.setattr(main_module, "engine", test_engine)
    monkeypatch.setattr(main_module, "ModelRegistry", StubModelRegistry)
    monkeypatch.setattr(settings, "storage_dir", tmp_path / "storage")
    monkeypatch.setattr(settings, "database_url", "sqlite://")
    SessionLocal.configure(bind=test_engine)
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        Base.metadata.drop_all(bind=test_engine)
        SessionLocal.configure(bind=original_engine)
        monkeypatch.setattr(settings, "storage_dir", original_storage)
        monkeypatch.setattr(settings, "database_url", original_database_url)
        test_engine.dispose()


def register(client: TestClient) -> str:
    response = client.post(
        "/api/auth/register",
        json={"email": "analyst@example.com", "password": "secure-password-123", "name": "Analyst"},
    )
    assert response.status_code == 201
    return response.json()["token"]


def test_authentication_upload_and_log_inference_audit(client: TestClient) -> None:
    token = register(client)
    headers = {"Authorization": f"Bearer {token}"}

    denied = client.post(
        "/api/auth/login",
        json={"email": "analyst@example.com", "password": "wrong-password"},
    )
    assert denied.status_code == 401

    csv_content = (
        ",".join(FIELDS) + "\n"
        + "1,0.1,src,dst,<MASK>,80,443,10,20,1000,2000\n"
    ).encode()
    upload = client.post(
        "/api/upload/logs",
        headers=headers,
        files={"file": ("sample.csv", csv_content, "text/csv")},
    )
    assert upload.status_code == 201
    assert upload.json()["sha256"] == hashlib.sha256(csv_content).hexdigest()

    with SessionLocal() as db:
        entries = db.scalars(select(AuditLog)).all()
        actions = {entry.action for entry in entries}
        user = db.scalar(select(User).where(User.email == "analyst@example.com"))
    assert user is not None
    assert "http.request" in actions
    assert "file.upload.logs" in actions
    upload_event = next(entry for entry in entries if entry.action == "file.upload.logs")
    assert upload_event.actor_id == user.id

    restored = client.post(
        "/api/restore/logs",
        headers=headers,
        data={"file_id": upload.json()["file_id"]},
        files={
            "reference": (
                "truth.csv",
                (",".join(FIELDS) + "\n1,0.1,src,dst,6,80,443,10,20,1000,2000\n").encode(),
                "text/csv",
            )
        },
    )
    assert restored.status_code == 200
    assert restored.json()["status"] == "completed"
    assert restored.json()["confidence_score"] == 78.0
    assert restored.json()["restored_data"][0]["Protocol"] == "6"
    assert restored.json()["result_sha256"]
    assert restored.json()["metrics"]["quality_reference_available"] is True
    assert restored.json()["metrics"]["categorical_accuracy_percent"] == 100.0
    session_id = restored.json()["session_id"]
    with SessionLocal() as db:
        uploaded_files = db.scalars(select(UploadedFile)).all()
        session = db.get(RestorationSession, session_id)
        inference_audit = db.scalar(
            select(AuditLog).where(AuditLog.action == "restoration.logs.completed")
        )
    assert len(uploaded_files) == 3
    assert session is not None
    assert session.status == "completed"
    assert session.original_file_id == upload.json()["file_id"]
    assert session.reference_file_id is not None
    assert session.result_file_id is not None
    assert inference_audit is not None
    assert inference_audit.actor_id == user.id
    report = client.post(
        "/api/report/generate",
        headers=headers,
        json={"session_id": session_id},
    )
    assert report.status_code == 200
    assert report.content.startswith(b"%PDF-")


def test_log_quality_metrics_are_unavailable_without_reference(client: TestClient) -> None:
    headers = {"Authorization": f"Bearer {register(client)}"}
    csv_content = (
        ",".join(FIELDS) + "\n"
        + "1,0.1,src,dst,<MASK>,80,443,10,20,1000,2000\n"
    ).encode()
    upload = client.post(
        "/api/upload/logs",
        headers=headers,
        files={"file": ("sample.csv", csv_content, "text/csv")},
    )
    restored = client.post(
        "/api/restore/logs",
        headers=headers,
        data={"file_id": upload.json()["file_id"]},
    )

    assert restored.status_code == 200
    metrics = restored.json()["metrics"]
    assert metrics["quality_reference_available"] is False
    assert metrics["categorical_accuracy_percent"] is None
    assert metrics["numeric_metrics_by_field"] == {}
    assert "clean reference CSV" in metrics["quality_metric_note"]


def test_masked_image_restore_saves_sha_and_completed_session(client: TestClient) -> None:
    token = register(client)
    headers = {"Authorization": f"Bearer {token}"}
    image = io.BytesIO()
    Image.new("RGB", (4, 4), color=(30, 60, 90)).save(image, format="PNG")

    upload = client.post(
        "/api/upload/image",
        headers=headers,
        files={"file": ("evidence.png", image.getvalue(), "image/png")},
    )
    mask = io.BytesIO()
    Image.new("L", (4, 4), color=255).save(mask, format="PNG")
    reference = io.BytesIO()
    Image.new("RGB", (4, 4), color=(30, 60, 90)).save(reference, format="PNG")
    response = client.post(
        "/api/restore/image",
        headers=headers,
        data={"mode": "masked", "image_id": upload.json()["file_id"]},
        files={
            "mask": ("mask.png", mask.getvalue(), "image/png"),
            "reference": ("clean.png", reference.getvalue(), "image/png"),
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert response.json()["confidence_score"] == 85.0
    assert response.json()["metrics"]["quality_reference_available"] is True
    assert response.json()["metrics"]["psnr_db"] == 31.2
    assert response.json()["confidence_method"]
    assert response.json()["restored_image"].startswith("data:image/png;base64,")
    assert len(response.json()["result_sha256"]) == 64
    session_id = response.json()["session_id"]
    result = client.get(f"/api/restore/{session_id}/result", headers=headers)
    assert result.status_code == 200
    assert result.json()["status"] == "completed"
    assert result.json()["confidence_score"] == 85.0

    with SessionLocal() as db:
        session = db.get(RestorationSession, session_id)
        assert session is not None
        assert session.model_name == "hfi_gan_final"
        assert session.result_file_id is not None


def test_report_is_rejected_for_processing_restoration(client: TestClient) -> None:
    token = register(client)
    headers = {"Authorization": f"Bearer {token}"}
    image = io.BytesIO()
    Image.new("RGB", (4, 4)).save(image, format="PNG")
    uploaded = client.post(
        "/api/upload/image",
        headers=headers,
        files={"file": ("image.png", image.getvalue(), "image/png")},
    )
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "analyst@example.com"))
        assert user is not None
        session = RestorationSession(
            user_id=user.id,
            kind="image",
            status="processing",
            original_file_id=uploaded.json()["file_id"],
            model_name="hfi_gan_final",
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id

    response = client.post("/api/report/generate", headers=headers, json={"session_id": session_id})
    assert response.status_code == 409


def test_automatic_image_mode_is_rejected_without_mask_detection(client: TestClient) -> None:
    token = register(client)
    headers = {"Authorization": f"Bearer {token}"}
    image = io.BytesIO()
    Image.new("RGB", (4, 4)).save(image, format="PNG")
    upload = client.post(
        "/api/upload/image",
        headers=headers,
        files={"file": ("image.png", image.getvalue(), "image/png")},
    )
    response = client.post(
        "/api/restore/image",
        headers=headers,
        data={"mode": "auto", "image_id": upload.json()["file_id"]},
    )
    assert response.status_code == 422
    assert "Automatic damage detection" in response.json()["detail"]


def test_invalid_netflow_input_creates_failed_session(client: TestClient) -> None:
    token = register(client)
    headers = {"Authorization": f"Bearer {token}"}
    upload = client.post(
        "/api/upload/logs",
        headers=headers,
        files={"file": ("unrelated.csv", b"event,value\nx,y\n", "text/csv")},
    )
    assert upload.status_code == 201
    response = client.post(
        "/api/restore/logs",
        headers=headers,
        data={"file_id": upload.json()["file_id"]},
    )
    assert response.status_code == 422
    session_id = response.json()["detail"]["session_id"]
    result = client.get(f"/api/restore/{session_id}/result", headers=headers)
    assert result.status_code == 200
    assert result.json()["status"] == "failed"
    assert "exact header" in result.json()["failure_reason"]


def test_model_checkpoints_load_and_real_inference(client: TestClient) -> None:
    from app.services.models import ModelRegistry

    registry = ModelRegistry()
    registry.load_once()
    model_status = registry.status()
    assert model_status["image"]["inference_ready"] is True
    assert model_status["logs"]["inference_ready"] is True
    assert registry.image_restorer is not None
    assert registry.log_restorer is not None

    source = io.BytesIO()
    Image.new("RGB", (32, 32), color=(80, 120, 160)).save(source, format="PNG")
    mask = io.BytesIO()
    Image.new("L", (32, 32), color=0).save(mask, format="PNG")
    with Image.open(mask) as mask_image:
        from PIL import ImageDraw
        ImageDraw.Draw(mask_image).rectangle((8, 8, 20, 20), fill=255)
        mask.seek(0)
        mask_image.save(mask, format="PNG")
    restored_image, image_confidence, image_metrics = registry.image_restorer.restore(
        source.getvalue(), mask.getvalue(), source.getvalue()
    )
    with Image.open(io.BytesIO(restored_image)) as restored:
        assert restored.size == (256, 256)
    assert 0 <= image_confidence <= 100
    assert image_metrics["quality_reference_available"] is True
    assert isinstance(image_metrics["psnr_db"], float)
    assert isinstance(image_metrics["ssim"], float)
    assert image_metrics["lpips_status"] in {"available", "unavailable"}

    rows = []
    reference_rows = []
    for index in range(5):
        row = ["1", "0.1", "src", "dst", "6", "80", "443", "10", "20", "1000", "2000"]
        reference_rows.append(list(row))
        if index == 2:
            row[4] = "<MASK>"
            row[7] = "<MASK>"
        rows.append(row)
    content = (",".join(FIELDS) + "\n" + "\n".join(",".join(row) for row in rows) + "\n").encode()
    _, log_confidence, log_metrics, original_data, restored_data = registry.log_restorer.restore_csv(content)
    assert 0 <= log_confidence <= 100
    assert log_metrics["records_restored"] == 1
    assert restored_data[2]["Protocol"] != "<MASK>"
    assert log_metrics["fields_restored"] == 2
    reference_content = (
        ",".join(FIELDS)
        + "\n"
        + "\n".join(",".join(row) for row in reference_rows)
        + "\n"
    ).encode()
    quality_metrics = registry.log_restorer.compare_with_reference(
        original_data, restored_data, reference_content
    )
    assert quality_metrics["quality_reference_available"] is True
    assert quality_metrics["categorical_fields_evaluated"] == 1
    assert quality_metrics["numeric_fields_evaluated"] == 1
    assert quality_metrics["numeric_metrics_by_field"]["SrcPackets"]["masked_values"] == 1


def test_completed_image_session_generates_pdf_with_hashes(client: TestClient) -> None:
    token = register(client)
    headers = {"Authorization": f"Bearer {token}"}
    original_bytes = io.BytesIO()
    Image.new("RGB", (4, 4), color=(30, 60, 90)).save(original_bytes, format="PNG")
    result_bytes = io.BytesIO()
    Image.new("RGB", (4, 4), color=(90, 60, 30)).save(result_bytes, format="PNG")
    original_response = client.post(
        "/api/upload/image",
        headers=headers,
        files={"file": ("original.png", original_bytes.getvalue(), "image/png")},
    )
    result_response = client.post(
        "/api/upload/image",
        headers=headers,
        files={"file": ("restored.png", result_bytes.getvalue(), "image/png")},
    )

    session_id = str(uuid4())
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "analyst@example.com"))
        assert user is not None
        db.add(
            RestorationSession(
                id=session_id,
                user_id=user.id,
                kind="image",
                status="completed",
                original_file_id=original_response.json()["file_id"],
                result_file_id=result_response.json()["file_id"],
                model_name="test-model",
                confidence_score=82.5,
                confidence_method="test consistency",
                completed_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    response = client.post("/api/report/generate", headers=headers, json={"session_id": session_id})
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-")


def test_masked_restore_rejects_dimensions_that_do_not_match(client: TestClient) -> None:
    token = register(client)
    headers = {"Authorization": f"Bearer {token}"}
    original = io.BytesIO()
    Image.new("RGB", (4, 4)).save(original, format="PNG")
    mask = io.BytesIO()
    Image.new("L", (3, 4), color=255).save(mask, format="PNG")

    response = client.post(
        "/api/restore/image",
        headers=headers,
        data={"mode": "masked"},
        files={
            "image": ("original.png", original.getvalue(), "image/png"),
            "mask": ("mask.png", mask.getvalue(), "image/png"),
        },
    )
    assert response.status_code == 422
