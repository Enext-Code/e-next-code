from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin, StatusMixin,
                             TimestampMixin)


class ICDCode(BaseSchema, IDMixin, StatusMixin, TimestampMixin, AuditMixin):
    """ICD Code"""

    code: str = Field(..., description="ICD code")
    description: str = Field(..., description="ICD description")

    class Settings:
        collection = "icd_codes"
        indexes = [
            [("code", 1)],
            [("is_active", 1), ("is_deleted", 1), ("organisation_id", 1)],
        ]
