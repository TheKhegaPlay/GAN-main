import logging
import re
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import inspect, text
from starlette.responses import Response

from app.core.config import settings
from app.db import models
from app.db.base import Base
from app.db.session import engine
from app.api.auth import router as auth_router
from app.api.reports import router as reports_router
from app.api.restoration import router as restoration_router
from app.api.uploads import router as uploads_router
from app.services.audit import write_audit
from app.services.models import ModelRegistry

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    database_url = make_url(settings.database_url)
    if database_url.get_backend_name() == "sqlite" and database_url.database not in {None, "", ":memory:"}:
        database_path = Path(database_url.database)
        if not database_path.is_absolute():
            database_path = Path.cwd() / database_path
        database_path.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    session_columns = {column["name"] for column in inspect(engine).get_columns("restoration_sessions")}
    missing_columns = {
        "failure_reason": "TEXT",
        "confidence_method": "TEXT",
        "reference_file_id": "VARCHAR(36)",
    }
    for column_name, column_type in missing_columns.items():
        if column_name not in session_columns:
            with engine.begin() as connection:
                connection.execute(
                    text(f"ALTER TABLE restoration_sessions ADD COLUMN {column_name} {column_type}")
                )
    registry = ModelRegistry()
    registry.load_once()
    application.state.model_registry = registry
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(uploads_router)
app.include_router(restoration_router)
app.include_router(reports_router)


@app.middleware("http")
async def audit_requests(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", "")
    if not re.fullmatch(r"[A-Za-z0-9._:-]{1,100}", request_id):
        request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    response: Response | None = None
    try:
        response = await call_next(request)
    finally:
        try:
            write_audit(
                request_id=request_id,
                actor_id=getattr(request.state, "actor_id", None),
                action="http.request",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code if response is not None else 500,
            )
        except SQLAlchemyError:
            logger.exception("Could not audit request %s", request_id)
            if response is not None:
                raise
    if response is None:
        raise RuntimeError("Request handler completed without a response")
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/health")
@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/models/status")
def model_status(request: Request) -> dict:
    registry: ModelRegistry = request.app.state.model_registry
    return registry.status()
