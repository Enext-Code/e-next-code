from typing import List

from pydantic import BaseModel, Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin,
                             OrganisationMixin, StatusMixin, TimestampMixin)

from ..enums import (RADIOLOGY_SUBTYPES, ArterialAnalysis, BloodAnalysis,
                     Microbiology, Radiology)


class RadiologyInvestigation(BaseModel):
    type: Radiology
    subtypes: List[str] = Field(default_factory=list)


class PatientInvestigation(
    BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin, OrganisationMixin
):
    """Patient Investigation"""

    # Relations
    patient_id: str = Field(..., description="Patient ID")

    # Details
    blood_analysis: List[BloodAnalysis] = Field(default_factory=list)
    radiology: List[RadiologyInvestigation] = Field(default_factory=list)
    microbiology: List[Microbiology] = Field(default_factory=list)
    arterial_analysis: List[ArterialAnalysis] = Field(default_factory=list)

    class Settings:
        collection = "patient_investigation"
        indexes = [
            [("patient_id", 1), {"unique": True}],
            [("patient_id", 1)],
            [("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1), ("organisation_id", 1)],
        ]
