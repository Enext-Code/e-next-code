import logging
from datetime import datetime

from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, DuplicateError, IDMixin,
                             OrganisationMixin, StatusMixin, TimestampMixin)
from app.utils import generate_random_string

logger = logging.getLogger(__name__)


class PatientCriticality(
    BaseSchema, AuditMixin, IDMixin, OrganisationMixin, StatusMixin, TimestampMixin
):
    """Patient Criticality Model"""

    criticality_id: str = Field(..., description="The ID of the patient criticality record")
    patient_id: str = Field(..., description="The ID of the patient")
    date: datetime = Field(..., description="The date of the criticality assessment")
    blood_pressure: str = Field(..., description="Blood pressure reading")
    heart_rate: str = Field(..., description="Heart rate reading")
    rhythm: str = Field(..., description="Heart rhythm")
    spo2: str = Field(..., description="Oxygen saturation level")
    temp: str = Field(..., description="Body temperature")
    remarks: str = Field(..., description="Additional remarks or notes")

    class Settings:
        """Pydantic settings"""

        collection = "patient_criticalities"
        indexes = [
            [("patient_id", 1), ("date", -1)],
            [("criticality_id", 1)],
            [("organisation_id", 1), ("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1)],
        ]

    @classmethod
    async def generate_criticality_id(cls) -> str:
        """Generate a unique ID for the patient criticality record"""

        max_attempts = 5
        attempt = 0

        while attempt < max_attempts:
            try:
                cursor = (
                    cls.get_collection().find({}, {"criticality_id": 1, "_id": 0}).limit(1000)
                )

                existing_criticality_ids = set()
                async for doc in cursor:
                    existing_criticality_ids.add(doc["criticality_id"])

                # Generate new criticality ID
                criticality_id = generate_random_string("PC", 10)

                # Verify criticality ID uniqueness with index
                existing = await cls.find_one({"criticality_id": criticality_id}, {"_id": 1})
                if not existing:
                    return criticality_id
            except Exception as e:
                logger.error(f"Error generating criticality ID: {e}")

            attempt += 1

        raise DuplicateError(
            message="Failed to generate unique criticality ID",
            error_code="CRITICALITY_ID_GENERATION_FAILED",
        )
