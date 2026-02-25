"""Application configuration settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./ecowatch.db"

    # JWT Authentication
    SECRET_KEY: str = "ecowatch-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB

    # App Info
    APP_NAME: str = "EcoWatch API"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "Ekologiya va Yo'l Qurilish Monitoring Platformasi"

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
