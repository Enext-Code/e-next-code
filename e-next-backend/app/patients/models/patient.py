import logging
from datetime import UTC, date, datetime, time, timedelta, timezone
from typing import List, Optional

from pydantic import Field, field_validator

from app.base.models import (AuditMixin, BaseSchema, DuplicateError, IDMixin,
                             OrganisationMixin, StatusMixin, TimestampMixin)
from app.utils import generate_random_string

from ..enums import Criticality, Gender, PatientStatus, Triage

logger = logging.getLogger(__name__)

# IST timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))


class Patient(
    BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin, OrganisationMixin
):
    """Patient"""

    # Patient Unique ID
    unique_id: str = Field(..., description="Unique ID of the patient")

    # Patient Basic Details
    first_name: str = Field(..., description="First name of the patient")
    last_name: str = Field(..., description="Last name of the patient")
    gender: Gender = Field(..., description="Gender of the patient")
    age: int = Field(..., description="Age of the patient")
    height: Optional[float] = Field(default=None, description="Height of the patient in cm")
    weight: Optional[float] = Field(default=None, description="Weight of the patient in kg")

    # Patient Medical Details
    criticality: Criticality = Field(..., description="Criticality of the patient")
    triage: Triage = Field(..., description="Triage of the patient")
    uid_number: str = Field(..., description="UID number of the patient")
    ipid_number: str = Field(..., description="IPID number of the patient")
    admission_date: date = Field(..., description="Admission date of the patient")
    admission_time: time = Field(..., description="Admission time of the patient")
    tele_icu_date: date = Field(..., description="Tele-ICU date of the patient")
    mlc_or_non_mlc_number: str = Field(
        ..., description="MLC or non-MLC number of the patient"
    )
    insurance: Optional[str] = Field(
        default=None, description="Insurance of the patient"
    )
    status: Optional[PatientStatus] = Field(
        default=PatientStatus.ADMISSION, description="Status of the patient"
    )
    
    # Patient Additional Details
    address: Optional[str] = Field(default=None, description="Address of the patient")
    consultant_id: Optional[str] = Field(default=None, description="Consultant doctor user ID")
    
    # Patient Status Fields
    remark: Optional[str] = Field(default=None, description="Remark for the patient status")
    remark_datetime: Optional[datetime] = Field(default=None, description="Datetime when remark was added")
    report_generated: bool = Field(default=False, description="Whether report has been generated")
    status_change_datetime: Optional[datetime] = Field(default=None, description="Datetime when patient status was last changed")

    # Relations
    organisation_icu_id: str = Field(..., description="ICU ID of the organisation")
    organisation_icu_bed_id: Optional[str] = Field(
        default=None, description="Bed ID of the organisation ICU (required when status is ADMISSION)"
    )
    doctor_id: str = Field(..., description="Doctor ID of the patient")
    icd_code_ids: List[str] = Field(..., description="ICD code IDs of the patient")

    @field_validator('admission_date', 'tele_icu_date', mode='before')
    @classmethod
    def convert_datetime_to_date(cls, v):
        """
        Convert datetime to date in IST timezone when loading from MongoDB.
        MongoDB stores dates as datetime objects (e.g., 2025-11-29T18:30:00Z UTC).
        We need to convert to IST first, then extract the date.
        """
        if isinstance(v, datetime):
            # If datetime is naive, assume it's UTC
            if v.tzinfo is None:
                v = v.replace(tzinfo=UTC)
            # Convert to IST and extract date
            dt_ist = v.astimezone(IST)
            return dt_ist.date()
        return v

    class Settings:
        collection = "patients"
        indexes = [
            [("organisation_icu_id", 1), ("organisation_icu_bed_id", 1)],
            [("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1), ("organisation_id", 1)],
        ]

    @classmethod
    async def generate_patient_unique_id(cls) -> str:
        """Generate a unique ID for the patient"""

        max_attempts = 5
        attempt = 0

        while attempt < max_attempts:
            try:
                cursor = (
                    cls.get_collection()
                    .find({}, {"unique_id": 1, "_id": 0})
                    .limit(1000)
                )

                existing_unique_ids = set()
                async for doc in cursor:
                    existing_unique_ids.add(doc["unique_id"])

                # Generate new unique ID
                unique_id = generate_random_string("PA", 10)

                # Verify username uniqueness with index
                existing = await cls.find_one({"unique_id": unique_id}, {"_id": 1})
                if not existing:
                    return unique_id
            except Exception as e:
                logger.error(f"Error generating patient unique ID: {e}")

            attempt += 1

        raise DuplicateError(
            message="Failed to generate unique patient ID",
            error_code="PATIENT_ID_GENERATION_FAILED",
        )

    @property
    def full_name(self) -> str:
        """Get the full name of the patient"""
        full_name = ""
        if self.first_name:
            full_name += self.first_name
        if self.last_name:
            full_name += f" {self.last_name}"
        return full_name.strip()

    @property
    def is_active_for_progress_sheets(self) -> bool:
        """Check if patient is active and can have progress sheets created"""
        return self.status == PatientStatus.ADMISSION

    @property
    def is_final_status(self) -> bool:
        """Check if patient has reached a final status (no reactivate from these)"""
        return self.status in [
            PatientStatus.DISCHARGE,
            PatientStatus.REFERRED,
            PatientStatus.LAMA,
            PatientStatus.DECEASED,
        ]

    def model_dump(self, *args, **kwargs):
        """Dump the model"""
        data = super().model_dump(*args, **kwargs)
        if isinstance(data["admission_date"], date):
            data["admission_date"] = datetime.combine(
                data["admission_date"], datetime.min.time(), tzinfo=UTC
            )
        if isinstance(data["tele_icu_date"], date):
            data["tele_icu_date"] = datetime.combine(
                data["tele_icu_date"], datetime.min.time(), tzinfo=UTC
            )
        if isinstance(data.get("admission_time"), time):
            # Format time as "18:02:22.293000Z" with microseconds and timezone
            # Create a datetime with current date and the time, then format it
            current_date = datetime.now(UTC).date()
            time_datetime = datetime.combine(
                current_date, data["admission_time"], tzinfo=UTC
            )
            data["admission_time"] = time_datetime.strftime("%H:%M:%S.%f")[:-3] + "Z"
        return data
