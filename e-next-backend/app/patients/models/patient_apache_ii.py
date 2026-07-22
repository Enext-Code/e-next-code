from typing import Any, Dict

from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin,
                             OrganisationMixin, StatusMixin, TimestampMixin)


class PatientApacheII(
    BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin, OrganisationMixin
):
    """Patient Apache II Score"""

    # Relations
    patient_id: str = Field(..., description="Patient ID")

    # Input data (stored as dict for flexibility)
    input_data: Dict = Field(..., description="Apache II input parameters")

    # Calculated results
    apache_ii_score: int = Field(..., description="APACHE II score (0-71)")
    predicted_mortality_percent: float = Field(
        ..., description="Predicted hospital mortality percentage"
    )
    component_scores: Dict = Field(..., description="Breakdown of component scores")

    class Settings:
        collection = "patient_apache_ii"
        indexes = [
            [("patient_id", 1), ("created_at", -1)],
            [("patient_id", 1)],
            [("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1), ("organisation_id", 1)],
        ]

