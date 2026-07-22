from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from ..enums import (LL, EyeOpening, MotorResponse, PupilReaction, PupilSize,
                     VerbalResponse)


class PatientHeentBase(BaseModel):
    """Base patient heent schema with common fields"""

    patient_id: str = Field(..., description="Patient ID")
    cvs: str = Field(..., description="CVS")
    rs: str = Field(..., description="RS")
    p_a: str = Field(..., description="PA")
    right_pupil_size: PupilSize = Field(..., description="Right pupil size")
    right_pupil_reaction: PupilReaction = Field(..., description="Right pupil reaction")
    left_pupil_size: PupilSize = Field(..., description="Left pupil size")
    left_pupil_reaction: PupilReaction = Field(..., description="Left pupil reaction")
    eye_opening: EyeOpening = Field(..., description="Eye opening")
    verbal_response: VerbalResponse = Field(..., description="Verbal response")
    motor_response: MotorResponse = Field(..., description="Motor response")
    rul: LL = Field(..., description="RUL")
    lul: LL = Field(..., description="LUL")
    rll: LL = Field(..., description="RLL")
    lll: LL = Field(..., description="LLL")
    other_medical_findings: Optional[str] = Field(
        default="", description="Other medical findings"
    )


class PatientHeentCreate(PatientHeentBase):
    """Schema for creating a new patient heent"""

    pass


class PatientHeentResponse(PatientHeentBase):
    """Schema for patient heent response"""

    id: str
    gcs_score: int
    organisation_id: str
    created_at: datetime
    updated_at: datetime


class PatientHeentUpdate(BaseModel):
    """Schema for updating an existing patient heent"""

    cvs: Optional[str] = None
    rs: Optional[str] = None
    p_a: Optional[str] = None
    right_pupil_size: Optional[PupilSize] = None
    right_pupil_reaction: Optional[PupilReaction] = None
    left_pupil_size: Optional[PupilSize] = None
    left_pupil_reaction: Optional[PupilReaction] = None
    eye_opening: Optional[EyeOpening] = None
    verbal_response: Optional[VerbalResponse] = None
    motor_response: Optional[MotorResponse] = None
    rul: Optional[LL] = None
    lul: Optional[LL] = None
    rll: Optional[LL] = None
    lll: Optional[LL] = None
    other_medical_findings: Optional[str] = None
