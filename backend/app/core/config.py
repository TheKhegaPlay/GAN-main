from pathlib import Path
import secrets

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    app_name: str = "GAN Restoration API"
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'data' / 'app.db').as_posix()}"
    storage_dir: Path = BACKEND_DIR / "storage"
    model_dir: Path = PROJECT_DIR / "models"
    jwt_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(48))
    access_token_minutes: int = 60
    max_upload_bytes: int = 25 * 1024 * 1024
    cors_origins: str = "http://localhost:4200"

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
