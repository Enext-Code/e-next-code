from datetime import datetime
from typing import List, Optional

from pydantic import Field

from app.base.models import AuditMixin, BaseSchema, IDMixin, StatusMixin, TimestampMixin


class APIKey(BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin):
    """API Key model for third-party integrations"""

    name: str = Field(..., description="Name/identifier for the API key")
    description: Optional[str] = Field(
        default=None, description="Description of the API key usage"
    )
    api_key: str = Field(..., description="Public API key (used for identification)")
    secret_key: str = Field(..., description="Secret key (hashed for storage)")
    allowed_domains: List[str] = Field(
        default_factory=list,
        description="List of allowed domains that can use this API key",
    )
    last_used_at: Optional[datetime] = Field(
        default=None, description="Timestamp of last usage"
    )

    class Settings:
        """Settings for API Key"""

        collection = "api_keys"
        indexes = [
            [("api_key", 1), {"unique": True}],
            [("name", 1)],
            [("is_active", 1)],
            [("created_at", -1)],
        ]

