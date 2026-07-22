from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DischargeReportCreate(BaseModel):
    """Schema for creating a new discharge report"""

    history_of_present_illness: Optional[str] = Field(
        default="", description="History of present illness"
    )
    past_history: Optional[str] = Field(
        default="", description="Past history"
    )
    course_in_hospital: Optional[str] = Field(
        default="", description="Course in hospital"
    )
    condition_on_discharge: Optional[str] = Field(
        default="", description="Condition on the time of discharge"
    )
    medication_on_discharge: Optional[str] = Field(
        default="", description="Medication on discharge"
    )
    follow_up_advice: Optional[str] = Field(
        default="", description="Follow up advice"
    )


class DischargeReportResponse(BaseModel):
    """Schema for discharge report response"""

    id: str
    patient_id: str = Field(..., description="Patient ID")
    organisation_id: str
    history_of_present_illness: Optional[str] = Field(
        default="", description="History of present illness"
    )
    past_history: Optional[str] = Field(
        default="", description="Past history"
    )
    course_in_hospital: Optional[str] = Field(
        default="", description="Course in hospital"
    )
    condition_on_discharge: Optional[str] = Field(
        default="", description="Condition on the time of discharge"
    )
    medication_on_discharge: Optional[str] = Field(
        default="", description="Medication on discharge"
    )
    follow_up_advice: Optional[str] = Field(
        default="", description="Follow up advice"
    )
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class DischargeReportUpdate(BaseModel):
    """Schema for updating an existing discharge report"""

    history_of_present_illness: Optional[str] = Field(
        default=None, description="History of present illness"
    )
    past_history: Optional[str] = Field(
        default=None, description="Past history"
    )
    course_in_hospital: Optional[str] = Field(
        default=None, description="Course in hospital"
    )
    condition_on_discharge: Optional[str] = Field(
        default=None, description="Condition on the time of discharge"
    )
    medication_on_discharge: Optional[str] = Field(
        default=None, description="Medication on discharge"
    )
    follow_up_advice: Optional[str] = Field(
        default=None, description="Follow up advice"
    )

