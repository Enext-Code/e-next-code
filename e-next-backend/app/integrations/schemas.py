from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class Hl7IngestRequest(BaseModel):
    raw_hl7: str = Field(..., min_length=10)


class MonitorMatchSchema(BaseModel):
    hospital_name: str
    icu_name: str
    bed_number: int
    organisation_id: str
    organisation_icu_id: str
    organisation_icu_bed_id: str
    patient_id: Optional[str] = None
    patient_unique_id: Optional[str] = None
    patient_name: Optional[str] = None


class MonitorSnapshotSchema(BaseModel):
    id: str
    vendor: str
    device_mac: Optional[str] = None
    observed_at: Optional[str] = None
    vitals: Dict[str, Any]
    progress_sheet_vitals: Dict[str, str]
    progress_sheet_id: Optional[str] = None
    progress_sheet_date: Optional[str] = None
    progress_sheet_time: Optional[str] = None
    progress_sheet_note: Optional[str] = None
    match: MonitorMatchSchema


class Hl7SampleResponse(BaseModel):
    name: str
    raw_hl7: str


# First decoder schemas — kept commented, do not delete.
# class Hl7DecodeRequest(BaseModel):
#     raw_hl7: str = Field(..., min_length=3, description="Raw HL7 v2 text or MLLP payload")
#
# class Hl7VitalValue(BaseModel):
#     value: float
#     unit: Optional[str] = None
#     source: Optional[str] = None
#     code: Optional[str] = None
#     observed_at: Optional[str] = None
#
# class Hl7DecodedMessage(BaseModel):
#     vendor: str
#     message_type: str
#     control_id: str
#     sent_at: Optional[str] = None
#     observed_at: Optional[str] = None
#     patient: Dict[str, str]
#     location: Dict[str, str]
#     vitals: Dict[str, Any]
#     progress_sheet_vitals: Dict[str, str]
#     ack: str
#     observation_count: int
#     observations: List[Dict[str, Any]]
#     error: Optional[str] = None
#
# class Hl7DecodeResponse(BaseModel):
#     message_count: int
#     messages: List[Hl7DecodedMessage]
