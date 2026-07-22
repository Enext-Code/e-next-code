from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin, StatusMixin,
                             TimestampMixin)


class OrganisationMember(BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin):
    """Organisation member"""

    organisation_id: str = Field(..., description="Organisation ID")
    user_id: str = Field(..., description="User ID")

    class Settings:
        collection = "organisation_members"
        indexes = [
            [("organisation_id", 1), ("user_id", 1), {"unique": True}],
            [("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1)],
        ]
