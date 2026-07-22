from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin, StatusMixin,
                             TimestampMixin)


class OrganisationICU(BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin):
    """Organisation ICU"""

    organisation_id: str = Field(..., description="Organisation ID")
    name: str = Field(..., description="Name of the organisation ICU")

    class Settings:
        collection = "organisation_icus"
        indexes = [
            [("organisation_id", 1), ("name", 1), {"unique": True}],
            [("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1)],
        ]
