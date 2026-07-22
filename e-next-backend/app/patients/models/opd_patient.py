from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin, OrganisationMixin,
                             StatusMixin, TimestampMixin)

from ..enums import Gender


class PatientHistory(BaseSchema):
    """Patient medical history"""
    
    tobacco_use: Optional[str] = Field(default=None, description="Tobacco use details")
    alcohol_use: Optional[str] = Field(default=None, description="Alcohol use details")
    substance_use: Optional[str] = Field(default=None, description="Substance use details")
    past_illness: Optional[str] = Field(default=None, description="Past illness details")
    past_procedures: Optional[str] = Field(default=None, description="Past procedures details")


class OPDPatient(
    BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin, OrganisationMixin
):
    """OPD (Outpatient Department) Patient"""

    # Basic Patient Information
    visit_date: datetime = Field(..., description="Date and time of OPD visit")
    doc_number: Optional[str] = Field(default=None, description="Document number / Registration number")
    patient_name: str = Field(..., description="Full name of the patient")
    age: int = Field(..., description="Age of the patient")
    gender: Gender = Field(..., description="Gender of the patient")
    uhid: str = Field(..., description="Unique Health Identification Number")
    
    # Consultant Reference (links to User table - fetch name, designation, etc. from User API)
    consultant_user_id: Optional[str] = Field(default=None, description="User ID of the consultant doctor")
    
    # Episode Information
    episode_no: Optional[str] = Field(default=None, description="Episode number")
    allergy: Optional[str] = Field(default=None, description="Patient allergies")
    vitals: Optional[str] = Field(default=None, description="Vital signs")
    # Digital Signature
    # signature: Optional[str] = Field(
    #     default=None, description="Digital signature (base64 encoded image or signature data)"
    # )
    
    # Patient History
    patient_history: Optional["PatientHistory"] = Field(
        default=None, description="Patient medical history"
    )
    
    # Examination Details
    general_examination: Optional[str] = Field(
        default=None, description="General examination findings"
    )
    systemic_examination: Optional[str] = Field(
        default=None, description="Systemic examination findings"
    )
    
    # Treatment Information
    procedures: Optional[List[str]] = Field(
        default=None, description="List of procedures performed"
    )
    treatment_note: Optional[str] = Field(
        default=None, description="Treatment notes"
    )
    followup_note: Optional[str] = Field(
        default=None, description="Follow-up notes and instructions"
    )

    class Settings:
        collection = "opd_patients"
        indexes = [
            [("visit_date", -1)],
            [("doc_number", 1)],
            [("uhid", 1)],
            [("episode_no", 1)],
            [("patient_name", 1)],
            [("organisation_id", 1), ("visit_date", -1)],
            [("consultant_user_id", 1), ("visit_date", -1)],
            [("is_active", 1), ("is_deleted", 1)],
            [("created_at", -1)],
        ]

    @property
    def patient_full_info(self) -> str:
        """Get patient full information summary"""
        return f"{self.patient_name} ({self.age}/{self.gender}) - UHID: {self.uhid}"

    def has_allergies(self) -> bool:
        """Check if patient has any recorded allergies"""
        return self.allergy is not None and len(self.allergy.strip()) > 0

    def has_history(self) -> bool:
        """Check if patient has any medical history recorded"""
        if not self.patient_history:
            return False
        return any([
            self.patient_history.tobacco_use,
            self.patient_history.alcohol_use,
            self.patient_history.substance_use,
            self.patient_history.past_illness,
            self.patient_history.past_procedures,
        ])

