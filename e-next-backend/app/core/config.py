from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings"""

    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "E-Next Backend"

    # MongoDB
    MONGODB_URL: str
    MONGODB_DB_NAME: str

    # Superadmin Configuration
    SUPERADMIN_EMAIL: str
    SUPERADMIN_PASSWORD: str
    SUPERADMIN_USERNAME: str
    SUPERADMIN_FIRST_NAME: str
    SUPERADMIN_LAST_NAME: str

    # Redis
    REDIS_HOST: str
    REDIS_PORT: int
    REDIS_DB0: int
    REDIS_DB1: int
    REDIS_CACHE_TIMEOUT: int

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_MINUTES: int

    # AWS S3
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_STORAGE_BUCKET_NAME: str
    AWS_S3_REGION_NAME: str = "ap-south-1"
    AWS_S3_ENDPOINT_URL: Optional[str] = None
    AWS_MAX_CONNECTIONS: int = 50
    AWS_PRESIGNED_EXPIRATION: int = 3600  # 1 hour
    AWS_MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    AWS_ALLOWED_FILE_TYPES: List[str] = ["image/jpeg", "image/png", "application/pdf"]

    @property
    def CELERY_BROKER_URL(self) -> str:
        """Celery broker URL"""
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB0}"

    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        """Celery result backend"""
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB1}"

    class Config:
        """Config"""

        env_file = ".env"
        extra = "ignore"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    """Get settings"""
    return Settings()


settings = get_settings()
