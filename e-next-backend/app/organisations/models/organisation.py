from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin, StatusMixin,
                             TimestampMixin)


class Organisation(BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin):
    """Organisation"""

    unique_id: str = Field(..., description="Unique ID of the organisation")
    name: str = Field(..., description="Name of the organisation")
    location: str = Field(..., description="Location of the organisation")

    class Settings:
        collection = "organisations"
        indexes = [
            [("unique_id", 1), {"unique": True}],
            [("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1)],
        ]
