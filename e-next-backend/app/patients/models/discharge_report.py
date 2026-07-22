from typing import Optional

from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin,
                             OrganisationMixin, StatusMixin, TimestampMixin)


class DischargeReport(
    BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin, OrganisationMixin
):
    """Discharge Report"""

    # Relations
    patient_id: str = Field(..., description="Patient ID")

    # Report Fields
    history_of_present_illness: Optional[str] = Field(
        default="", description="History of present illness"
    )
    past_history: Optional[str] = Field(
        default="", description="Past history"
    )
    course_in_hospital: Optional[str] = Field(
        default="", description="Course in hospital"
    )
    condition_on_discharge: Optional[str] = Field(
        default="", description="Condition on the time of discharge"
    )
    medication_on_discharge: Optional[str] = Field(
        default="", description="Medication on discharge"
    )
    follow_up_advice: Optional[str] = Field(
        default="", description="Follow up advice"
    )

    class Settings:
        collection = "discharge_reports"
        indexes = [
            [("patient_id", 1), {"unique": True}],
            [("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1), ("organisation_id", 1)],
        ]

