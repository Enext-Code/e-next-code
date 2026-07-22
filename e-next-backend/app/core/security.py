from pydantic_settings import BaseSettings, SettingsConfigDict


class SecuritySettings(BaseSettings):
    """Security settings"""

    # JWT Settings
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_MINUTES: int

    # Password Settings
    MIN_PASSWORD_LENGTH: int = 8
    BCRYPT_ROUNDS: int = 12
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 15

    # OTP Settings
    OTP_LENGTH: int = 6
    OTP_EXPIRE_MINUTES: int = 5
    MAX_OTP_ATTEMPTS: int = 3

    # Rate Limiting
    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    # Project Settings
    PROJECT_NAME: str = "E-Next Backend"
    API_V1_STR: str = "/api/v1"

    # MongoDB Settings
    MONGODB_URL: str
    MONGODB_DB_NAME: str = "e-next"

    # Redis Settings
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_DB0: int = 0
    REDIS_DB1: int = 1

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",  # This allows extra fields from env
    )


security_settings = SecuritySettings()
