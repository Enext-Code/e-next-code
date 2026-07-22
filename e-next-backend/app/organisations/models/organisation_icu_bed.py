from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin, StatusMixin,
                             TimestampMixin)


class OrganisationICUBed(BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin):
    """Organisation ICU Bed"""

    organisation_icu_id: str = Field(..., description="Organisation ICU ID")
    bed_number: int = Field(..., description="Bed number")
    is_available: bool = Field(..., description="Is available")

    class Settings:
        collection = "organisation_icu_beds"
        indexes = [
            [("organisation_icu_id", 1), ("bed_number", 1), {"unique": True}],
            [("organisation_icu_id", 1), ("is_available", 1)],
            [("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1)],
        ]
