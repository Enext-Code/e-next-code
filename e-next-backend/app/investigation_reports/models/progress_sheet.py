import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from app.base.models import (AuditMixin, BaseSchema, DuplicateError, IDMixin,
                             OrganisationMixin, StatusMixin, TimestampMixin)
from app.utils import generate_random_string

from ..enums import (BloodGasParameter, CatheterType, GCSParameter,
                     InfusionParameter, IntakeType, RespiratoryParameter,
                     VitalParameter)

logger = logging.getLogger(__name__)


class InfusionEntry(BaseModel):
    """Infusion Entry"""

    name: InfusionParameter
    quantity: Optional[float] = None

    @field_validator("name", mode="before")
    @classmethod
    def normalize_infusion_name(cls, value):
        # Map legacy DB strings (with U+2060 etc.) onto InfusionParameter via _missing_
        if isinstance(value, str):
            return InfusionParameter(value)
        return value


class IntakeEntry(BaseModel):
    """Intake Entry"""

    name: IntakeType
    quantity: Optional[float] = None


class OutputEntry(BaseModel):
    """Output Entry"""

    name: str
    quantity: Optional[float] = None


class OtherInfusionEntry(BaseModel):
    """Other Infusion Entry"""

    name: str
    quantity: Optional[float] = None


class ColloidEntry(BaseModel):
    """Colloid Entry"""

    name: str
    quantity: Optional[float] = None


class CrystalloidEntry(BaseModel):
    """Crystalloid Entry"""

    name: str
    quantity: Optional[float] = None


class OralIntakeEntry(BaseModel):
    """Oral Intake Entry"""

    name: str
    quantity: Optional[float] = None


class RylesTubeEntry(BaseModel):
    """Ryles Tube Entry"""

    name: str
    quantity: Optional[float] = None


class UrinesEntry(BaseModel):
    """Urines Entry"""

    name: str
    quantity: Optional[float] = None


class DrainageEntry(BaseModel):
    """Drainage Entry"""

    name: str
    quantity: Optional[float] = None


class CatheterEntry(BaseModel):
    """Catheter Entry"""

    type: CatheterType
    size: Optional[float] = None
    site: Optional[str] = None
    date_of_insertion: Optional[datetime] = None
    date_of_removal: Optional[datetime] = None
    days_in_use: Optional[int] = None


class FluidParametersModel(BaseModel):
    """Fluid Parameters Model"""

    infusions: Optional[List[InfusionEntry]] = []
    intakes: Optional[List[IntakeEntry]] = []
    outputs: Optional[List[OutputEntry]] = []
    other_infusions: Optional[List[OtherInfusionEntry]] = []
    colloids: Optional[List[ColloidEntry]] = []
    crystalloids: Optional[List[CrystalloidEntry]] = []
    oral_intakes: Optional[List[OralIntakeEntry]] = []
    ryles_tubes: Optional[List[RylesTubeEntry]] = []
    urines: Optional[List[UrinesEntry]] = []
    drainages: Optional[List[DrainageEntry]] = []
    total_input: Optional[float] = None
    total_output: Optional[float] = None
    cumulative_balance: Optional[float] = None


class ProgressParameterGroup(BaseModel):
    """Progress Parameter Group"""

    gcs: Optional[Dict[GCSParameter, Any]] = None
    fluid: Optional[FluidParametersModel] = None
    vitals: Optional[Dict[VitalParameter, Any]] = None
    blood_gas: Optional[Dict[BloodGasParameter, Any]] = None
    respiratory: Optional[Dict[RespiratoryParameter, Any]] = None
    catheter: Optional[List[CatheterEntry]] = None


class ProgressEntry(BaseModel):
    """Progress Entry"""

    time: str
    parameters: ProgressParameterGroup
    recorded_by: Optional[str] = None
    recorded_at: Optional[datetime] = None


class PatientProgressSheet(
    BaseSchema, AuditMixin, IDMixin, OrganisationMixin, StatusMixin, TimestampMixin
):
    """Patient Progress Sheet"""

    sheet_id: str = Field(..., description="The ID of the progress sheet")
    patient_id: str = Field(..., description="The ID of the patient")
    date: str = Field(..., description="The date of the progress sheet in format YYYY-MM-DDTHH:MM:SS")
    entries: List[ProgressEntry] = Field(
        default_factory=list, description="The entries of the progress sheet"
    )

    class Settings:
        """Pydantic settings"""

        collection = "patient_progress_sheets"
        indexes = [
            [("patient_id", 1), ("date", -1)],
            [("sheet_id", 1)],
            [("organisation_id", 1), ("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1)],
        ]

    @classmethod
    async def generate_sheet_id(cls) -> str:
        """Generate a unique ID for the progress sheet"""

        max_attempts = 5
        attempt = 0

        while attempt < max_attempts:
            try:
                cursor = (
                    cls.get_collection().find({}, {"sheet_id": 1, "_id": 0}).limit(1000)
                )

                existing_sheet_ids = set()
                async for doc in cursor:
                    existing_sheet_ids.add(doc["sheet_id"])

                # Generate new sheet ID
                sheet_id = generate_random_string("PS", 10)

                # Verify sheet ID uniqueness with index
                existing = await cls.find_one({"sheet_id": sheet_id}, {"_id": 1})
                if not existing:
                    return sheet_id
            except Exception as e:
                logger.error(f"Error generating sheet ID: {e}")

            attempt += 1

        raise DuplicateError(
            message="Failed to generate unique sheet ID",
            error_code="SHEET_ID_GENERATION_FAILED",
        )
