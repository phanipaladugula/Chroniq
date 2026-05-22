"""Application configuration using Pydantic Settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/scalar_cal"

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "Scalar Calendar"

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    # App
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"
    APP_NAME: str = "Scalar Cal"

    # Default user (no auth)
    DEFAULT_USER_ID: int = 1

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
