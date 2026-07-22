from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from ..enums import Gender


class PatientHistorySchema(BaseModel):
    """Schema for patient medical history"""
    
    tobacco_use: Optional[str] = Field(None, description="Tobacco use details")
    alcohol_use: Optional[str] = Field(None, description="Alcohol use details")
    substance_use: Optional[str] = Field(None, description="Substance use details")
    past_illness: Optional[str] = Field(None, description="Past illness details")
    past_procedures: Optional[str] = Field(None, description="Past procedures details")


class OPDPatientBase(BaseModel):
    """Base OPD patient schema with common fields"""

    visit_date: datetime = Field(..., description="Date and time of OPD visit (ISO 8601 format: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DDTHH:MM:SSZ)")
    doc_number: Optional[str] = Field(None, max_length=100, description="Document number / Registration number")
    patient_name: str = Field(..., min_length=1, max_length=200, description="Full name of the patient")
    age: int = Field(..., ge=0, le=150, description="Age of the patient")
    gender: Gender = Field(..., description="Gender of the patient")
    uhid: str = Field(..., min_length=1, max_length=100, description="Unique Health Identification Number")
    consultant_user_id: Optional[str] = Field(None, description="User ID of the consultant doctor (fetch user details from User API)")
    episode_no: Optional[str] = Field(None, max_length=100, description="Episode number")
    allergy: Optional[str] = Field(None, max_length=500, description="Patient allergies")
    vitals: Optional[str] = Field(None, description="Vital signs")
    # signature: Optional[str] = Field(None, description="Digital signature (base64 encoded image or signature data)")
    patient_history: Optional[PatientHistorySchema] = Field(None, description="Patient medical history")
    general_examination: Optional[str] = Field(None, description="General examination findings")
    systemic_examination: Optional[str] = Field(None, description="Systemic examination findings")
    procedures: Optional[List[str]] = Field(None, description="List of procedures performed")
    treatment_note: Optional[str] = Field(None, description="Treatment notes")
    followup_note: Optional[str] = Field(None, description="Follow-up notes and instructions")


class OPDPatientCreate(OPDPatientBase):
    """Schema for creating a new OPD patient"""
    
    pass


class OPDPatientResponse(OPDPatientBase):
    """Schema for OPD patient response"""

    id: str
    organisation_id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    class Config:
        json_schema_extra = {
            "example": {
                "visit_date": "2025-12-10T14:30:00",
                "doc_number": "OPD-2025-001",
                "patient_name": "John Doe",
                "age": 45,
                "gender": "male",
                "uhid": "UHID123456",
                "consultant_user_id": "691c2658b3dffef2f95aa203",
                "episode_no": "EP001",
                "allergy": "Penicillin",
                "vitals": "100/70, 120/80, 98.6F",
                "patient_history": {
                    "tobacco_use": "Non-smoker",
                    "alcohol_use": "Occasional",
                    "substance_use": "None",
                    "past_illness": "Diabetes Type 2",
                    "past_procedures": "Appendectomy 2020"
                },
                "general_examination": "Patient appears well",
                "systemic_examination": "CVS: Normal, RS: Clear",
                "procedures": ["ECG", "Blood Pressure Check"],
                "treatment_note": "Prescribed medication for hypertension",
                "followup_note": "Follow-up in 2 weeks",
                "id": "693860d376fd9af1645aeeb1",
                "organisation_id": "68d4f677a5cf9be9ee86a9c1",
                "created_at": "2025-12-10T10:30:00",
                "updated_at": "2025-12-10T10:30:00",
                "is_active": True
            }
        }


class OPDPatientUpdate(BaseModel):
    """Schema for updating an existing OPD patient"""

    visit_date: Optional[datetime] = Field(None, description="Date and time of OPD visit (ISO 8601 format: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DDTHH:MM:SSZ)")
    doc_number: Optional[str] = Field(None, max_length=100)
    patient_name: Optional[str] = Field(None, min_length=1, max_length=200)
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[Gender] = None
    uhid: Optional[str] = Field(None, min_length=1, max_length=100)
    consultant_user_id: Optional[str] = Field(None)
    episode_no: Optional[str] = Field(None, max_length=100)
    allergy: Optional[str] = Field(None, max_length=500)
    # signature: Optional[str] = None
    vitals: Optional[str] = None
    patient_history: Optional[PatientHistorySchema] = None
    general_examination: Optional[str] = None
    systemic_examination: Optional[str] = None
    procedures: Optional[List[str]] = None
    treatment_note: Optional[str] = None
    followup_note: Optional[str] = None

