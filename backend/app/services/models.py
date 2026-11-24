import logging
import pickle

from app.services.image_restorer import ImageRestorer
from app.services.log_restorer import LogRestorer

logger = logging.getLogger(__name__)


class ModelRegistry:
    def __init__(self) -> None:
        self.image_restorer: ImageRestorer | None = None
        self.log_restorer: LogRestorer | None = None
        self._status: dict[str, dict[str, str | bool]] = {}

    def load_once(self) -> None:
        self._load_image()
        self._load_logs()

    def status(self) -> dict[str, dict[str, str | bool]]:
        return {name: details.copy() for name, details in self._status.items()}

    def _load_image(self) -> None:
        try:
            self.image_restorer = ImageRestorer()
        except (ImportError, OSError, RuntimeError, TypeError, ValueError, KeyError, pickle.UnpicklingError) as exc:
            logger.exception("Could not initialize the image restoration model")
            self._status["image"] = {
                "checkpoint_loaded": False,
                "inference_ready": False,
                "detail": f"Image model initialization failed: {type(exc).__name__}: {exc}",
            }
            return
        self._status["image"] = {
            "checkpoint_loaded": True,
            "inference_ready": True,
            "detail": "HybridForensicGenerator initialized and checkpoint loaded strictly",
        }

    def _load_logs(self) -> None:
        try:
            self.log_restorer = LogRestorer()
        except (ImportError, OSError, RuntimeError, TypeError, ValueError, KeyError, pickle.UnpicklingError) as exc:
            logger.exception("Could not initialize the logs restoration model")
            self._status["logs"] = {
                "checkpoint_loaded": False,
                "inference_ready": False,
                "detail": f"Logs model initialization failed: {type(exc).__name__}: {exc}",
            }
            return
        self._status["logs"] = {
            "checkpoint_loaded": True,
            "inference_ready": True,
            "detail": "RecordGenerator initialized and checkpoint loaded strictly",
        }
