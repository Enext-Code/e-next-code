from typing import Any, Dict, Optional

from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin, OrganisationMixin,
                             StatusMixin, TimestampMixin)


class MonitorBedSnapshot(
    BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin, OrganisationMixin
):
    """Latest monitor vitals for one ICU bed."""

    organisation_icu_id: str
    organisation_icu_bed_id: str
    hospital_name: str
    icu_name: str
    bed_number: int
    patient_id: Optional[str] = None
    patient_unique_id: Optional[str] = None
    vendor: str = "mindray"
    device_mac: Optional[str] = None
    device_id: Optional[str] = None
    message_control_id: Optional[str] = None
    observed_at: Optional[str] = None
    vitals: Dict[str, Any] = Field(default_factory=dict)
    progress_sheet_vitals: Dict[str, str] = Field(default_factory=dict)
    progress_sheet_id: Optional[str] = None
    progress_sheet_date: Optional[str] = None
    progress_sheet_time: Optional[str] = None
    progress_sheet_note: Optional[str] = None
    raw_hl7: str = ""

    class Settings:
        collection = "monitor_bed_snapshots"
        indexes = [
            [("organisation_icu_bed_id", 1)],
            [("organisation_id", 1), ("bed_number", 1)],
            [("patient_id", 1)],
            [("created_at", -1)],
        ]
