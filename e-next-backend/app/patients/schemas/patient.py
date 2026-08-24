from datetime import UTC, date, datetime, time
from typing import List, Optional

from pydantic import BaseModel, Field

from app.masters.schemas import ICDCodeResponse

from ..enums import Criticality, Gender, PatientStatus, Triage


class PatientBase(BaseModel):
    """Base patient schema with common fields"""

    first_name: str = Field(..., description="First name of the patient")
    last_name: str = Field(..., description="Last name of the patient")
    gender: Gender = Field(..., description="Gender of the patient")
    age: int = Field(..., description="Age of the patient")
    height: Optional[float] = Field(default=None, description="Height of the patient in cm")
    weight: Optional[float] = Field(default=None, description="Weight of the patient in kg")
    criticality: Criticality = Field(..., description="Criticality of the patient")
    triage: Triage = Field(..., description="Triage of the patient")
    uid_number: str = Field(..., description="UID number of the patient")
    ipid_number: str = Field(..., description="IPID number of the patient")
    admission_date: date = Field(..., description="Admission date of the patient")
    admission_time: time = Field(..., description="Admission time of the patient")
    tele_icu_date: date = Field(..., description="Tele-ICU date of the patient")
    tele_icu_time: Optional[time] = Field(
        default=None, description="Tele-ICU time of the patient"
    )
    mlc_or_non_mlc_number: str = Field(
        ..., description="MLC or non-MLC number of the patient"
    )
    insurance: Optional[str] = Field(default=None, description="Insurance of the patient")
    organisation_icu_id: str = Field(..., description="ICU ID of the organisation")
    organisation_icu_bed_id: Optional[str] = Field(
        default=None, description="Bed ID of the organisation ICU (required when status is ADMISSION)"
    )
    doctor_id: str = Field(..., description="Doctor ID of the patient")
    icd_code_ids: List[str] = Field(..., description="ICD code IDs of the patient")
    status: Optional[PatientStatus] = Field(
        default=None, description="Status of the patient"
    )
    remark: Optional[str] = Field(default=None, description="Remark for the patient status")
    remark_datetime: Optional[datetime] = Field(default=None, description="Datetime when remark was added")
    report_generated: bool = Field(default=False, description="Whether report has been generated")
    status_change_datetime: Optional[datetime] = Field(default=None, description="Datetime when patient status was last changed")
    address: Optional[str] = Field(default=None, description="Address of the patient")
    consultant_id: Optional[str] = Field(default=None, description="Consultant doctor user ID")


class PatientCreate(PatientBase):
    """Schema for creating a new patient"""

    pass


class PatientResponse(PatientBase):
    """Schema for patient response"""

    id: str
    unique_id: str
    organisation_id: str
    created_at: datetime
    updated_at: datetime
    organisation_icu_bed_number: Optional[int] = None
    organisation_icu_name: Optional[str] = None
    doctor_full_name: Optional[str] = None
    consultant_full_name: Optional[str] = None
    icd_codes: Optional[List[ICDCodeResponse]] = None
    is_patient_past_medical_history: bool = Field(
        False, description="Whether the patient has past medical history"
    )
    is_patient_heent: bool = Field(False, description="Whether the patient has heent")
    is_patient_investigation: bool = Field(
        False, description="Whether the patient has investigation"
    )
    remark: Optional[str] = Field(default=None, description="Remark for the patient status")
    remark_datetime: Optional[datetime] = Field(default=None, description="Datetime when remark was added")
    report_generated: bool = Field(default=False, description="Whether report has been generated")
    status_change_datetime: Optional[datetime] = Field(default=None, description="Datetime when patient status was last changed")


class PatientUpdate(BaseModel):
    """Schema for updating an existing patient"""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[Gender] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    criticality: Optional[Criticality] = None
    triage: Optional[Triage] = None
    uid_number: Optional[str] = None
    ipid_number: Optional[str] = None
    admission_date: Optional[date] = None
    admission_time: Optional[time] = None
    tele_icu_date: Optional[date] = None
    tele_icu_time: Optional[time] = None
    mlc_or_non_mlc_number: Optional[str] = None
    insurance: Optional[str] = None
    organisation_icu_id: Optional[str] = None
    organisation_icu_bed_id: Optional[str] = None
    doctor_id: Optional[str] = None
    icd_code_ids: Optional[List[str]] = None
    status: Optional[PatientStatus] = None
    remark: Optional[str] = None
    remark_datetime: Optional[datetime] = None
    report_generated: Optional[bool] = None
    status_change_datetime: Optional[datetime] = None
    address: Optional[str] = None
    consultant_id: Optional[str] = None

    def model_dump(self, *args, **kwargs):
        data = super().model_dump(*args, **kwargs)
        if data.get("admission_date") and isinstance(data["admission_date"], date):
            data["admission_date"] = datetime.combine(
                data["admission_date"], datetime.min.time(), tzinfo=UTC
            )
        if data.get("tele_icu_date") and isinstance(data["tele_icu_date"], date):
            data["tele_icu_date"] = datetime.combine(
                data["tele_icu_date"], datetime.min.time(), tzinfo=UTC
            )
        if data.get("admission_time") and isinstance(data["admission_time"], time):
            # Format time as "18:02:22.293000Z" with microseconds and timezone
            # Create a datetime with current date and the time, then format it
            current_date = datetime.now(UTC).date()
            time_datetime = datetime.combine(
                current_date, data["admission_time"], tzinfo=UTC
            )
            data["admission_time"] = time_datetime.strftime("%H:%M:%S.%f")[:-3] + "Z"
        if data.get("tele_icu_time") and isinstance(data["tele_icu_time"], time):
            current_date = datetime.now(UTC).date()
            time_datetime = datetime.combine(
                current_date, data["tele_icu_time"], tzinfo=UTC
            )
            data["tele_icu_time"] = time_datetime.strftime("%H:%M:%S.%f")[:-3] + "Z"
        if data.get("remark_datetime") and isinstance(data["remark_datetime"], datetime):
            data["remark_datetime"] = data["remark_datetime"].isoformat()
        if data.get("status_change_datetime") and isinstance(data["status_change_datetime"], datetime):
            data["status_change_datetime"] = data["status_change_datetime"].isoformat()
        return data
