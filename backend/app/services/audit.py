import logging

from sqlalchemy.exc import SQLAlchemyError

from app.db.models import AuditLog
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


def write_audit(
    *,
    request_id: str,
    actor_id: str | None,
    action: str,
    method: str,
    path: str,
    status_code: int,
    details: dict | None = None,
) -> None:
    db = SessionLocal()
    try:
        db.add(
            AuditLog(
                request_id=request_id,
                actor_id=actor_id,
                action=action,
                method=method,
                path=path,
                status_code=status_code,
                details=details or {},
            )
        )
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not persist audit event %s", action)
        raise
    finally:
        db.close()
