import io
from pathlib import Path
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Image, Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.models import RestorationSession, UploadedFile, User
from app.db.session import get_db
from app.schemas import ReportRequest
from app.services.audit import write_audit

router = APIRouter(prefix="/api/report", tags=["reports"])


@router.post("/generate")
def generate_report(
    payload: ReportRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    session = db.scalar(
        select(RestorationSession).where(
            RestorationSession.id == payload.session_id,
            RestorationSession.user_id == user.id,
        )
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Restoration session not found")
    if session.status != "completed" or not session.result_file_id:
        raise HTTPException(status_code=409, detail="A report is available only for completed restorations")

    original = db.get(UploadedFile, session.original_file_id)
    result = db.get(UploadedFile, session.result_file_id)
    mask = db.get(UploadedFile, session.mask_file_id) if session.mask_file_id else None
    reference = db.get(UploadedFile, session.reference_file_id) if session.reference_file_id else None
    if original is None or result is None:
        raise HTTPException(status_code=500, detail="Session files are missing")

    if session.reference_file_id and reference is None:
        raise HTTPException(status_code=500, detail="Session evaluation reference is missing")

    pdf = _build_pdf(user, session, original, result, mask, reference)
    write_audit(
        request_id=request.state.request_id,
        actor_id=user.id,
        action="report.generate",
        method=request.method,
        path=request.url.path,
        status_code=200,
        details={"session_id": session.id, "original_sha256": original.sha256, "result_sha256": result.sha256},
    )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="restoration-{session.id}.pdf"'},
    )


def _build_pdf(
    user: User,
    session: RestorationSession,
    original: UploadedFile,
    result: UploadedFile,
    mask: UploadedFile | None,
    reference: UploadedFile | None,
) -> bytes:
    output = io.BytesIO()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="LogData", parent=styles["Code"], fontSize=7, leading=9, alignment=TA_LEFT))
    story = [
        Paragraph("Digital Evidence Restoration Report", styles["Title"]),
        Spacer(1, 0.2 * inch),
    ]

    confidence = (
        f"{session.confidence_score:.2f}% ({escape(session.confidence_metric or 'model confidence')})"
        if session.confidence_score is not None
        else "Not provided by the model"
    )
    rows = [
        ("Employee", user.full_name),
        ("Employee email", user.email),
        ("Session ID", session.id),
        ("Session type", session.kind),
        ("Status", session.status),
        ("Model", session.model_name),
        ("Started at (UTC)", session.created_at.isoformat()),
        ("Completed at (UTC)", session.completed_at.isoformat() if session.completed_at else "N/A"),
        ("Inference confidence", confidence),
        ("Confidence method", session.confidence_method or "N/A"),
        ("Inference duration", f"{session.inference_time_ms:.2f} ms" if session.inference_time_ms is not None else "N/A"),
        ("Original filename", original.original_name),
        ("Original SHA-256", original.sha256),
        ("Mask SHA-256", mask.sha256 if mask else "N/A"),
        ("Evaluation reference", reference.original_name if reference else "Not provided"),
        ("Reference SHA-256", reference.sha256 if reference else "N/A"),
        ("Result filename", result.original_name),
        ("Result SHA-256", result.sha256),
    ]
    table = Table(
        [[Paragraph(escape(str(key)), styles["BodyText"]), Paragraph(escape(str(value)), styles["BodyText"])] for key, value in rows],
        colWidths=[1.55 * inch, 4.95 * inch],
        repeatRows=0,
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.lightgrey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(table)

    if session.metrics:
        story.extend([
            Spacer(1, 0.2 * inch),
            Paragraph("Restoration Metrics", styles["Heading2"]),
        ])
        metric_rows = [
            [
                Paragraph(escape(_metric_label(key)), styles["BodyText"]),
                Paragraph(escape(_metric_value(value)), styles["BodyText"]),
            ]
            for key, value in _flatten_metrics(session.metrics)
        ]
        metrics_table = Table(metric_rows, colWidths=[2.5 * inch, 4.0 * inch])
        metrics_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.lightgrey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(metrics_table)

    if session.kind == "image":
        story.append(Spacer(1, 0.25 * inch))
        story.append(Paragraph("Original image", styles["Heading2"]))
        story.append(_report_image(Path(original.storage_path)))
        if mask is not None:
            story.append(Paragraph("Damage mask", styles["Heading2"]))
            story.append(_report_image(Path(mask.storage_path)))
        if reference is not None:
            story.append(Paragraph("Clean evaluation reference", styles["Heading2"]))
            story.append(_report_image(Path(reference.storage_path)))
        story.append(Paragraph("Restored image", styles["Heading2"]))
        story.append(_report_image(Path(result.storage_path)))
    else:
        story.extend([
            Spacer(1, 0.25 * inch),
            Paragraph("Original log", styles["Heading2"]),
            Preformatted(Path(original.storage_path).read_text(encoding="utf-8-sig"), styles["LogData"]),
            Spacer(1, 0.15 * inch),
            Paragraph("Restored log", styles["Heading2"]),
            Preformatted(Path(result.storage_path).read_text(encoding="utf-8"), styles["LogData"]),
        ])

    document = SimpleDocTemplate(output, pagesize=letter, title=f"Restoration report {session.id}")
    document.build(story)
    return output.getvalue()


def _metric_label(key: str) -> str:
    labels = {
        "psnr_db": "PSNR (dB)",
        "ssim": "SSIM",
        "lpips": "LPIPS",
        "quality_reference_available": "Clean reference supplied",
        "categorical_accuracy_percent": "Categorical accuracy (%)",
        "numeric_mae": "Numeric MAE",
        "numeric_rmse": "Numeric RMSE",
        "numeric_metrics_by_field": "Numeric metrics by field",
        "categorical_accuracy_by_field": "Categorical accuracy by field",
        "accuracy_percent": "Accuracy (%)",
        "masked_values": "Masked values",
        "exact_matches": "Exact matches",
        "mae": "MAE",
        "rmse": "RMSE",
        "reference_sha256": "Reference SHA-256",
        "quality_metric_note": "Metric note",
    }
    return labels.get(key, key.replace("_", " ").capitalize())


def _flatten_metrics(
    metrics: dict[str, object],
    prefix: str = "",
) -> list[tuple[str, object]]:
    flattened = []
    for key, value in metrics.items():
        label = f"{prefix} · {_metric_label(key)}" if prefix else _metric_label(key)
        if isinstance(value, dict):
            flattened.extend(_flatten_metrics(value, label))
        else:
            flattened.append((label, value))
    return flattened


def _metric_value(value: object) -> str:
    if value is None:
        return "Not available"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, float):
        return f"{value:.5f}"
    return str(value)


def _report_image(path: Path) -> Image:
    with PILImage.open(path) as source:
        converted = source.convert("RGB")
        stream = io.BytesIO()
        converted.save(stream, format="PNG")
    stream.seek(0)
    return Image(stream, width=6.2 * inch, height=4.2 * inch, kind="proportional")
