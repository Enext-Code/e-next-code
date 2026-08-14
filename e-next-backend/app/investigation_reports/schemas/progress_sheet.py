from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from ..enums import (BloodGasParameter, CatheterType, GCSParameter,
                     InfusionParameter, IntakeType, RespiratoryParameter,
                     VitalParameter)


class GCSSectionSchema(BaseModel):
    """GCS Section Schema"""

    values: Dict[GCSParameter, Any]


class InfusionEntrySchema(BaseModel):
    """Infusion Entry Schema"""

    name: InfusionParameter
    quantity: Optional[float] = None
    unit: Optional[str] = "ml"

    @field_validator("name", mode="before")
    @classmethod
    def normalize_infusion_name(cls, value):
        if isinstance(value, str):
            return InfusionParameter(value)
        return value


class IntakeEntrySchema(BaseModel):
    """Intake Entry Schema"""

    name: IntakeType
    quantity: Optional[float] = None


class OutputEntrySchema(BaseModel):
    """Output Entry Schema"""

    name: str
    quantity: Optional[float] = None


class OtherInfusionEntrySchema(BaseModel):
    """Other Infusion Entry Schema"""

    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = "ml"


class ColloidEntrySchema(BaseModel):
    """Colloid Entry Schema"""

    name: str
    quantity: Optional[float] = None


class CrystalloidEntrySchema(BaseModel):
    """Crystalloid Entry Schema"""

    name: str
    quantity: Optional[float] = None


class OralIntakeEntrySchema(BaseModel):
    """Oral Intake Entry Schema"""

    name: str
    quantity: Optional[float] = None


class RylesTubeEntrySchema(BaseModel):
    """Ryles Tube Entry Schema"""

    name: str
    quantity: Optional[float] = None


class UrinesEntrySchema(BaseModel):
    """Urines Entry Schema"""

    name: str
    quantity: Optional[float] = None


class DrainageEntrySchema(BaseModel):
    """Drainage Entry Schema"""

    name: str
    quantity: Optional[float] = None


class FluidSectionSchema(BaseModel):
    """Fluid Section Schema"""

    infusions: Optional[List[InfusionEntrySchema]] = []
    intakes: Optional[List[IntakeEntrySchema]] = []
    outputs: Optional[List[OutputEntrySchema]] = []
    other_infusions: Optional[List[OtherInfusionEntrySchema]] = []
    colloids: Optional[List[ColloidEntrySchema]] = []
    crystalloids: Optional[List[CrystalloidEntrySchema]] = []
    oral_intakes: Optional[List[OralIntakeEntrySchema]] = []
    ryles_tubes: Optional[List[RylesTubeEntrySchema]] = []
    urines: Optional[List[UrinesEntrySchema]] = []
    drainages: Optional[List[DrainageEntrySchema]] = []
    total_input: Optional[float] = None
    total_output: Optional[float] = None
    cumulative_balance: Optional[float] = None


class VitalsSectionSchema(BaseModel):
    """Vitals Section Schema"""

    values: Dict[VitalParameter, Any]


class BloodGasSectionSchema(BaseModel):
    """Blood Gas Section Schema"""

    values: Dict[BloodGasParameter, Any]


class RespiratorySectionSchema(BaseModel):
    """Respiratory Section Schema"""

    values: Dict[RespiratoryParameter, Any]


class CatheterEntrySchema(BaseModel):
    """Catheter Entry Schema"""

    type: CatheterType
    size: Optional[float] = None
    site: Optional[str] = None
    date_of_insertion: Optional[datetime] = None
    date_of_removal: Optional[datetime] = None
    days_in_use: Optional[int] = None


class CatheterSectionSchema(BaseModel):
    """Catheter Section Schema"""

    entries: List[CatheterEntrySchema]


class ProgressEntrySchema(BaseModel):
    """Progress Entry Schema"""

    time: str
    gcs: Optional[GCSSectionSchema] = None
    fluid: Optional[FluidSectionSchema] = None
    vitals: Optional[VitalsSectionSchema] = None
    blood_gas: Optional[BloodGasSectionSchema] = None
    respiratory: Optional[RespiratorySectionSchema] = None
    catheter: Optional[CatheterSectionSchema] = None
    recorded_by: Optional[str] = None
    recorded_at: Optional[datetime] = None


class CreatePatientProgressSheetSchema(BaseModel):
    """Create Patient Progress Sheet Schema"""

    patient_id: str = Field(..., description="The ID of the patient")
    date: datetime = Field(..., description="The date of the progress sheet")
    entries: Optional[List[ProgressEntrySchema]] = Field(
        ..., description="The entries of the progress sheet"
    )
    organisation_id: Optional[str] = None


class PatientProgressSheetDetailSchema(BaseModel):
    """Patient Progress Sheet Detail Schema"""

    id: str = Field(..., description="The ID of the progress sheet")
    sheet_id: str = Field(..., description="The ID of the progress sheet")
    patient_id: str = Field(..., description="The ID of the patient")
    date: str = Field(..., description="The date of the progress sheet in format YYYY-MM-DDTHH:MM:SS")
    entries: Optional[List[ProgressEntrySchema]] = Field(
        default_factory=list, description="The entries of the progress sheet"
    )
    created_at: datetime = Field(
        ..., description="The date and time the progress sheet was created"
    )
    updated_at: datetime = Field(
        ..., description="The date and time the progress sheet was last updated"
    )


class FluidEntryWithTimeSchema(BaseModel):
    """Fluid entry with its time slot"""

    time: str = Field(..., description="Time slot in HH:00 format")
    fluid: FluidSectionSchema = Field(..., description="Fluid data for this time slot")


class FluidDataByDateResponse(BaseModel):
    """Response schema for all fluid data of a patient for a given date"""

    patient_id: str = Field(..., description="The ID of the patient")
    date: str = Field(..., description="The date in YYYY-MM-DD format")
    sheet_id: Optional[str] = Field(None, description="The progress sheet ID")
    entries: Optional[List[FluidEntryWithTimeSchema]] = Field(
        default=None, description="All fluid entries for the date, sorted by time. Omitted when final_only=true"
    )
    total_input: Optional[float] = Field(None, description="Sum of total_input across all time slots")
    total_output: Optional[float] = Field(None, description="Sum of total_output across all time slots")
    cumulative_balance: Optional[float] = Field(None, description="Overall cumulative balance (total_input - total_output)")
