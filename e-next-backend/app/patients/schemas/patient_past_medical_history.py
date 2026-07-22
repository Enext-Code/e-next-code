from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from ..enums import MedicalHistory, PersonalHz
from ..models import Complaint, Medication


class PatientPastMedicalHistoryBase(BaseModel):
    """Base schema for patient past medical history"""

    patient_id: str = Field(..., description="Patient ID")
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


class PatientPastMedicalHistoryCreate(PatientPastMedicalHistoryBase):
    """Create schema for patient past medical history"""

    pass


class PatientPastMedicalHistoryResponse(PatientPastMedicalHistoryBase):
    """Response schema for patient past medical history"""

    id: str
    created_at: datetime
    updated_at: datetime


class PatientPastMedicalHistoryUpdate(BaseModel):
    """Update schema for patient past medical history"""

    presenting_complaints: Optional[List[Complaint]] = Field(
        default=None, description="Presenting complaints"
    )
    current_medications: Optional[List[Medication]] = Field(
        default=None, description="Current medications"
    )
    food_allergies: Optional[List[str]] = Field(
        default=None, description="Food allergies"
    )
    drug_allergies: Optional[List[str]] = Field(
        default=None, description="Drug allergies"
    )
    personal_hz: Optional[List[PersonalHz]] = Field(
        default=None, description="Personal history"
    )
    personal_hz_others: Optional[str] = Field(
        default=None, description="Personal history others"
    )
    medical_history: Optional[List[MedicalHistory]] = Field(
        default=None, description="Medical history"
    )
    medical_history_others: Optional[str] = Field(
        default=None, description="Medical history others"
    )
    bp: Optional[str] = Field(default=None, description="Blood pressure")
    hr: Optional[int] = Field(default=None, description="Heart rate")
    rr: Optional[int] = Field(default=None, description="Respiratory rate")
    spo2: Optional[str] = Field(default=None, description="SpO2")
    temperature: Optional[float] = Field(default=None, description="Temperature")
    rbs: Optional[int] = Field(default=None, description="RBS")
    initial_treatment: Optional[str] = Field(
        default=None, description="Initial Treatment"
    )
