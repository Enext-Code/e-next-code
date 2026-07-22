from typing import List, Optional

from pydantic import BaseModel, Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin,
                             OrganisationMixin, StatusMixin, TimestampMixin)

from ..enums import MedicalHistory, PersonalHz


class Complaint(BaseModel):
    """Complaint"""

    serial_number: int
    complaint: str


class Medication(BaseModel):
    """Medication"""

    serial_number: int
    medication: str


class PatientPastMedicalHistory(
    BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin, OrganisationMixin
):
    """Patient Past Medical History"""

    # Relations
    patient_id: str = Field(..., description="Patient ID")

    # Details
    presenting_complaints: List[Complaint] = Field(
        ..., description="Presenting complaints", default_factory=list
    )
    current_medications: List[Medication] = Field(
        ..., description="Current medications", default_factory=list
    )
    food_allergies: List[str] = Field(
        ..., description="Food allergies", default_factory=list
    )
    drug_allergies: List[str] = Field(
        ..., description="Drug allergies", default_factory=list
    )
    personal_hz: List[PersonalHz] = Field(
        ..., description="Personal history", default_factory=list
    )
    personal_hz_others: Optional[str] = Field(
        default="", description="Personal history others"
    )
    medical_history: List[MedicalHistory] = Field(
        ..., description="Medical history", default_factory=list
    )
    medical_history_others: Optional[str] = Field(
        default="", description="Medical history others"
    )
    bp: Optional[str] = Field(default="", description="Blood pressure")
    hr: Optional[int] = Field(default=None, description="Heart rate")
    rr: Optional[int] = Field(default=None, description="Respiratory rate")
    spo2: Optional[str] = Field(default=None, description="SpO2")
    temperature: Optional[float] = Field(default=None, description="Temperature")
    rbs: Optional[int] = Field(default=None, description="RBS")
    initial_treatment: Optional[str] = Field(
        default="", description="Initial Treatment"
    )

    class Settings:
        collection = "patient_past_medical_history"
        indexes = [
            [("patient_id", 1), {"unique": True}],
            [("patient_id", 1)],
            [("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1), ("organisation_id", 1)],
        ]
