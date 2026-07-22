from typing import Optional

from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin,
                             OrganisationMixin, StatusMixin, TimestampMixin)

from ..enums import (LL, EyeOpening, MotorResponse, PupilReaction, PupilSize,
                     VerbalResponse)


class PatientHeent(
    BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin, OrganisationMixin
):
    """Patient Heent"""

    # Relations
    patient_id: str = Field(..., description="Patient ID")

    # Details
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

    class Settings:
        collection = "patient_heent"
        indexes = [
            [("patient_id", 1), {"unique": True}],
            [("patient_id", 1)],
            [("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1), ("organisation_id", 1)],
        ]

    @property
    def gcs_score(self) -> int:
        """GCS score"""
        verbal_response = (
            1
            if self.verbal_response == VerbalResponse.NONE
            else int(self.verbal_response)
        )
        return int(self.eye_opening) + verbal_response + int(self.motor_response)
