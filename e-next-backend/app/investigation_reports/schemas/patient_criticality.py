from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PatientCriticalityBaseSchema(BaseModel):
    """Patient Criticality Base Schema"""

    patient_id: str = Field(..., description="The ID of the patient")
    date: datetime = Field(..., description="The date of the criticality assessment")
    blood_pressure: str = Field(..., description="Blood pressure reading")
    heart_rate: str = Field(..., description="Heart rate reading")
    rhythm: str = Field(..., description="Heart rhythm")
    spo2: str = Field(..., description="Oxygen saturation level")
    temp: str = Field(..., description="Body temperature")
    remarks: str = Field(..., description="Additional remarks or notes")


class PatientCriticalityCreateSchema(PatientCriticalityBaseSchema):
    """Patient Criticality Create Schema"""

    organisation_id: Optional[str] = None


class PatientCriticalityResponseSchema(PatientCriticalityBaseSchema):
    """Patient Criticality Response Schema"""

    id: str = Field(..., description="The ID of the patient criticality record")
    criticality_id: str = Field(..., description="The ID of the patient criticality record")
    created_at: datetime = Field(
        ..., description="The date and time the patient criticality record was created"
    )
    updated_at: datetime = Field(
        ..., description="The date and time the patient criticality record was last updated"
    )


class PatientCriticalityUpdateSchema(BaseModel):
    """Patient Criticality Update Schema"""

    date: Optional[datetime] = Field(
        None, description="The date of the criticality assessment"
    )
    blood_pressure: Optional[str] = Field(
        None, description="Blood pressure reading"
    )
    heart_rate: Optional[str] = Field(
        None, description="Heart rate reading"
    )
    rhythm: Optional[str] = Field(
        None, description="Heart rhythm"
    )
    spo2: Optional[str] = Field(
        None, description="Oxygen saturation level"
    )
    temp: Optional[str] = Field(
        None, description="Body temperature"
    )
    remarks: Optional[str] = Field(
        None, description="Additional remarks or notes"
    )
