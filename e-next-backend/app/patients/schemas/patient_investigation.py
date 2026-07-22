from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from ..enums import ArterialAnalysis, BloodAnalysis, Microbiology
from ..models import RadiologyInvestigation


class PatientInvestigationBase(BaseModel):
    """Base patient investigation schema with common fields"""

    patient_id: str = Field(..., description="Patient ID")
    blood_analysis: List[BloodAnalysis] = Field(default_factory=list)
    radiology: List[RadiologyInvestigation] = Field(default_factory=list)
    microbiology: List[Microbiology] = Field(default_factory=list)
    arterial_analysis: List[ArterialAnalysis] = Field(default_factory=list)


class PatientInvestigationCreate(PatientInvestigationBase):
    """Schema for creating a new patient investigation"""

    pass


class PatientInvestigationResponse(PatientInvestigationBase):
    """Schema for patient investigation response"""

    id: str
    organisation_id: str
    created_at: datetime
    updated_at: datetime


class PatientInvestigationUpdate(BaseModel):
    """Schema for updating an existing patient investigation"""

    blood_analysis: Optional[List[BloodAnalysis]] = None
    radiology: Optional[List[RadiologyInvestigation]] = None
    microbiology: Optional[List[Microbiology]] = None
    arterial_analysis: Optional[List[ArterialAnalysis]] = None
