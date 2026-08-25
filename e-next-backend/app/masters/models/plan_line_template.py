from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin, StatusMixin,
                             TimestampMixin)


class PlanLineTemplate(
    BaseSchema, IDMixin, StatusMixin, TimestampMixin, AuditMixin
):
    """Shared daily-round line template used for autocomplete hints."""

    field_type: str = Field(
        ..., description="Field this line belongs to, e.g. current_treatment"
    )
    text: str = Field(..., description="Original line text")
    text_normalized: str = Field(
        ..., description="Lowercased, whitespace-collapsed text for uniqueness"
    )
    usage_count: int = Field(default=1, description="How many times this line was saved")

    class Settings:
        collection = "plan_line_templates"
        indexes = [
            [("field_type", 1), ("text_normalized", 1)],
            [("field_type", 1), ("is_active", 1), ("is_deleted", 1)],
            [("usage_count", -1)],
        ]
