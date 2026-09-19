from fastapi import APIRouter, Depends, Query

from app.accounts.api.v1 import get_current_user
from app.base.models import BaseResponse, NotFoundError
from app.utils import format_response

from .hl7.samples import MINDRAY_DUMMY_ORU
from .models import MonitorBedSnapshot
from .schemas import Hl7IngestRequest, Hl7SampleResponse, MonitorSnapshotSchema
from .service import MonitorIngestService

router = APIRouter()


def _to_schema(snapshot: MonitorBedSnapshot) -> MonitorSnapshotSchema:
    return MonitorSnapshotSchema(
        id=str(snapshot.id),
        vendor=snapshot.vendor,
        device_mac=snapshot.device_mac,
        observed_at=snapshot.observed_at,
        vitals=snapshot.vitals or {},
        progress_sheet_vitals=snapshot.progress_sheet_vitals or {},
        progress_sheet_id=snapshot.progress_sheet_id,
        progress_sheet_date=snapshot.progress_sheet_date,
        progress_sheet_time=snapshot.progress_sheet_time,
        progress_sheet_note=snapshot.progress_sheet_note,
        match={
            "hospital_name": snapshot.hospital_name,
            "icu_name": snapshot.icu_name,
            "bed_number": snapshot.bed_number,
            "organisation_id": snapshot.organisation_id or "",
            "organisation_icu_id": snapshot.organisation_icu_id,
            "organisation_icu_bed_id": snapshot.organisation_icu_bed_id,
            "patient_id": snapshot.patient_id,
            "patient_unique_id": snapshot.patient_unique_id,
            "patient_name": None,
        },
    )


@router.post(
    "/ingest",
    response_model=BaseResponse[MonitorSnapshotSchema],
    description="Parse HL7 ORU^R01, match hospital+bed, save monitor vitals",
)
@format_response(
    response_model=MonitorSnapshotSchema,
    message="Monitor vitals saved for the matched bed",
)
async def ingest_hl7(
    payload: Hl7IngestRequest,
    current_user=Depends(get_current_user),
) -> MonitorSnapshotSchema:
    snapshot = await MonitorIngestService.ingest(payload.raw_hl7, current_user)
    return _to_schema(snapshot)


@router.get(
    "/sample",
    response_model=BaseResponse[Hl7SampleResponse],
    description="Dummy Mindray ORU for XYZ HOSPITAL bed 5",
)
@format_response(response_model=Hl7SampleResponse, message="HL7 sample loaded")
async def get_hl7_sample(
    current_user=Depends(get_current_user),
) -> Hl7SampleResponse:
    return Hl7SampleResponse(name="mindray_xyz_bed_5", raw_hl7=MINDRAY_DUMMY_ORU)


@router.get(
    "/latest",
    response_model=BaseResponse[MonitorSnapshotSchema],
    description="Latest saved monitor vitals for a patient on a bed",
)
@format_response(
    response_model=MonitorSnapshotSchema,
    message="Latest monitor vitals",
)
async def get_latest_for_patient(
    patient_id: str = Query(..., description="Patient id"),
    current_user=Depends(get_current_user),
) -> MonitorSnapshotSchema:
    snapshot = await MonitorIngestService.get_latest_for_patient(patient_id)
    if not snapshot:
        raise NotFoundError(
            message="No monitor data saved for this patient's bed yet",
            error_code="MONITOR_SNAPSHOT_NOT_FOUND",
        )
    return _to_schema(snapshot)


# First decoder endpoint — kept commented, do not delete.
# @router.post(
#     "/decode",
#     response_model=BaseResponse[Hl7DecodeResponse],
#     description="Decode raw HL7 v2 ORU^R01 into vitals JSON (Mindray / Philips)",
# )
# @format_response(
#     response_model=Hl7DecodeResponse,
#     message="HL7 decoded successfully",
# )
# async def decode_hl7_message(
#     payload: Hl7DecodeRequest,
#     current_user=Depends(get_current_user),
# ) -> Hl7DecodeResponse:
#     try:
#         decoded = decode_hl7(payload.raw_hl7)
#         return Hl7DecodeResponse.model_validate(decoded)
#     except ValueError as exc:
#         raise ValidationError(message=str(exc), error_code="INVALID_HL7") from exc
