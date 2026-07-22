import json

from fastapi import APIRouter, Depends, Form, Query

from app.accounts.api.v1 import (get_current_user,
                                 validate_organisation_access,
                                 validate_resource_access)
from app.base.models import BaseResponse, PaginationResponse, ValidationError
from app.utils import format_response

from ....filters import ProgressSheetFilterParams
from ....models import PatientProgressSheet
from ....schemas import (BloodGasSectionSchema, CatheterSectionSchema,
                         CreatePatientProgressSheetSchema,
                         FluidDataByDateResponse, FluidSectionSchema,
                         GCSSectionSchema, PatientProgressSheetDetailSchema,
                         RespiratorySectionSchema, VitalsSectionSchema)
from ....services import progress_sheet_service

router = APIRouter()


@router.post(
    "/",
    response_model=BaseResponse[PatientProgressSheetDetailSchema],
    description="Create a new progress sheet",
)
@format_response(
    response_model=PatientProgressSheetDetailSchema,
    message="Progress sheet created successfully",
)
async def create_progress_sheet(
    request: CreatePatientProgressSheetSchema,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> PatientProgressSheetDetailSchema:
    """
    Create a new progress sheet for a patient.
    This generates a unique sheet ID and returns it immediately.
    """
    try:
        request.organisation_id = organisation_id
        sheet = await progress_sheet_service.create_progress_sheet(
            request, current_user
        )
        return sheet
    except Exception as e:
        raise e


@router.get(
    "/{sheet_id}",
    response_model=BaseResponse[PatientProgressSheetDetailSchema],
    description="Get progress sheet by ID",
)
@format_response(
    response_model=PatientProgressSheetDetailSchema,
    message="Progress sheet retrieved successfully",
)
async def get_progress_sheet(
    sheet_id: str,
    current_user=Depends(get_current_user),
) -> PatientProgressSheetDetailSchema:
    """
    Get detailed progress sheet by sheet ID.
    """
    try:
        await validate_resource_access(
            field_name="sheet_id",
            field_value=sheet_id,
            model_class=PatientProgressSheet,
            current_user=current_user,
        )
        sheet = await progress_sheet_service.get_progress_sheet(sheet_id, current_user)
        return sheet
    except Exception as e:
        raise e


@router.get(
    "/patient/{patient_id}/date/{date}",
    response_model=BaseResponse[PatientProgressSheetDetailSchema],
    description="Get progress sheet by patient ID and date",
)
@format_response(
    response_model=PatientProgressSheetDetailSchema,
    message="Progress sheet retrieved successfully",
)
async def get_progress_sheet_by_patient_id_and_date(
    patient_id: str,
    date: str,
    current_user=Depends(get_current_user),
) -> PatientProgressSheetDetailSchema:
    """
    Get progress sheet by patient ID and date.
    """
    try:
        sheet = await progress_sheet_service.get_progress_sheet_by_patient_id_and_date(
            patient_id, date, current_user
        )
        return sheet
    except Exception as e:
        raise e


@router.get(
    "/patient/{patient_id}/date/{date}/ensure",
    response_model=BaseResponse[PatientProgressSheetDetailSchema],
    description="Get or create progress sheet by patient ID and date",
)
@format_response(
    response_model=PatientProgressSheetDetailSchema,
    message="Progress sheet retrieved/created successfully",
)
async def get_or_create_progress_sheet_by_patient_id_and_date(
    patient_id: str,
    date: str,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> PatientProgressSheetDetailSchema:
    """
    Get or create a progress sheet by patient ID and date.
    If a sheet exists for the given patient and date, it is returned.
    If not, a new sheet is created and returned.
    This endpoint eliminates the need for frontend to make two separate API calls.
    """
    try:
        sheet = await progress_sheet_service.get_or_create_progress_sheet(
            patient_id=patient_id,
            date=date,
            organisation_id=organisation_id,
            current_user=current_user,
        )
        return sheet
    except Exception as e:
        raise e


@router.get(
    "/patient/{patient_id}/date/{date}/fluid",
    response_model=BaseResponse[FluidDataByDateResponse],
    description="Get all fluid data for a patient on a given date",
)
@format_response(
    response_model=FluidDataByDateResponse,
    message="Fluid data retrieved successfully",
)
async def get_fluid_data_by_date(
    patient_id: str,
    date: str,
    final_only: bool = Query(
        default=False,
        description="If true, returns only totals (total_input, total_output, cumulative_balance) without detailed entries",
    ),
    current_user=Depends(get_current_user),
) -> FluidDataByDateResponse:
    """
    Get all fluid data from the progress sheet for a patient on a given date.
    Returns fluid entries from all time slots, sorted by time,
    along with aggregated total input, total output, and cumulative balance.

    Set `final_only=true` to get only the aggregated totals without individual time slot entries.
    """
    try:
        result = await progress_sheet_service.get_fluid_data_by_date(
            patient_id=patient_id,
            date=date,
            current_user=current_user,
            final_only=final_only,
        )
        return result
    except Exception as e:
        raise e


@router.get(
    "",
    response_model=BaseResponse[PaginationResponse[PatientProgressSheetDetailSchema]],
    description="Get all progress sheets",
)
@format_response(
    response_model=PaginationResponse[PatientProgressSheetDetailSchema],
    message="Progress sheets retrieved successfully",
)
async def get_progress_sheets(
    params: ProgressSheetFilterParams = Depends(),
    current_user=Depends(get_current_user),
) -> PaginationResponse[PatientProgressSheetDetailSchema]:
    """
    Get all progress sheets with optional filters.
    Supports pagination and filtering by date range.
    """
    try:
        sheets = await progress_sheet_service.get_progress_sheets(params, current_user)
        return sheets
    except Exception as e:
        raise e


@router.post(
    "/{sheet_id}/gcs",
    response_model=BaseResponse[PatientProgressSheetDetailSchema],
    description="Add or update GCS entry",
)
@format_response(
    response_model=PatientProgressSheetDetailSchema,
    message="GCS entry added/updated successfully",
)
async def add_gcs_entry(
    sheet_id: str,
    time: str = Form(..., description="Time in HH:00 format"),
    gcs_data: str = Form(..., description="GCS data"),
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> PatientProgressSheetDetailSchema:
    """
    Add or update GCS entry in progress sheet.
    If an entry exists for the given time, it will be updated.
    """
    try:
        await validate_resource_access(
            field_name="sheet_id",
            field_value=sheet_id,
            model_class=PatientProgressSheet,
            current_user=current_user,
        )

        gcs_data_dict = json.loads(gcs_data)
        gcs_data_dict["organisation_id"] = organisation_id

        gcs_data_schema = GCSSectionSchema.model_validate(gcs_data_dict)

        sheet = await progress_sheet_service.add_gcs_entry(
            sheet_id=sheet_id,
            time=time,
            gcs_data=gcs_data_schema,
            current_user=current_user,
        )
        return sheet
    except json.JSONDecodeError:
        raise ValidationError(
            message="Invalid GCS data format. Please provide a valid JSON object.",
            error_code="INVALID_GCS_DATA_FORMAT",
        )
    except Exception as e:
        raise e


@router.post(
    "/{sheet_id}/fluid",
    response_model=BaseResponse[PatientProgressSheetDetailSchema],
    description="Add or update fluid entry",
)
@format_response(
    response_model=PatientProgressSheetDetailSchema,
    message="Fluid entry added/updated successfully",
)
async def add_fluid_entry(
    sheet_id: str,
    time: str = Form(..., description="Time in HH:00 format"),
    fluid_data: str = Form(..., description="Fluid data"),
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> PatientProgressSheetDetailSchema:
    """
    Add or update fluid entry in progress sheet.
    If an entry exists for the given time, it will be updated.
    """
    try:
        await validate_resource_access(
            field_name="sheet_id",
            field_value=sheet_id,
            model_class=PatientProgressSheet,
            current_user=current_user,
        )
        fluid_data_dict = json.loads(fluid_data)
        fluid_data_dict["organisation_id"] = organisation_id
        fluid_data_schema = FluidSectionSchema.model_validate(fluid_data_dict)
        sheet = await progress_sheet_service.add_fluid_entry(
            sheet_id=sheet_id,
            time=time,
            fluid_data=fluid_data_schema,
            current_user=current_user,
        )
        return sheet
    except json.JSONDecodeError:
        raise ValidationError(
            message="Invalid fluid data format. Please provide a valid JSON object.",
            error_code="INVALID_FLUID_DATA_FORMAT",
        )
    except Exception as e:
        raise e


@router.post(
    "/{sheet_id}/vitals",
    response_model=BaseResponse[PatientProgressSheetDetailSchema],
    description="Add or update vitals entry",
)
@format_response(
    response_model=PatientProgressSheetDetailSchema,
    message="Vitals entry added/updated successfully",
)
async def add_vitals_entry(
    sheet_id: str,
    time: str = Form(..., description="Time in HH:00 format"),
    vitals_data: str = Form(..., description="Vitals data"),
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> PatientProgressSheetDetailSchema:
    """
    Add or update vitals entry in progress sheet.
    If an entry exists for the given time, it will be updated.
    """
    try:
        await validate_resource_access(
            field_name="sheet_id",
            field_value=sheet_id,
            model_class=PatientProgressSheet,
            current_user=current_user,
        )
        vitals_data_dict = json.loads(vitals_data)
        vitals_data_dict["organisation_id"] = organisation_id
        vitals_data_schema = VitalsSectionSchema.model_validate(vitals_data_dict)

        sheet = await progress_sheet_service.add_vitals_entry(
            sheet_id=sheet_id,
            time=time,
            vitals_data=vitals_data_schema,
            current_user=current_user,
        )
        return sheet
    except json.JSONDecodeError:
        raise ValidationError(
            message="Invalid vitals data format. Please provide a valid JSON object.",
            error_code="INVALID_VITALS_DATA_FORMAT",
        )
    except Exception as e:
        raise e


@router.post(
    "/{sheet_id}/blood-gas",
    response_model=BaseResponse[PatientProgressSheetDetailSchema],
    description="Add or update blood gas entry",
)
@format_response(
    response_model=PatientProgressSheetDetailSchema,
    message="Blood gas entry added/updated successfully",
)
async def add_blood_gas_entry(
    sheet_id: str,
    time: str = Form(..., description="Time in HH:00 format"),
    blood_gas_data: str = Form(..., description="Blood gas data"),
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> PatientProgressSheetDetailSchema:
    """
    Add or update blood gas entry in progress sheet.
    If an entry exists for the given time, it will be updated.
    """
    try:
        await validate_resource_access(
            field_name="sheet_id",
            field_value=sheet_id,
            model_class=PatientProgressSheet,
            current_user=current_user,
        )

        blood_gas_data_dict = json.loads(blood_gas_data)
        blood_gas_data_dict["organisation_id"] = organisation_id
        blood_gas_data_schema = BloodGasSectionSchema.model_validate(
            blood_gas_data_dict
        )

        sheet = await progress_sheet_service.add_blood_gas_entry(
            sheet_id=sheet_id,
            time=time,
            blood_gas_data=blood_gas_data_schema,
            current_user=current_user,
        )
        return sheet
    except Exception as e:
        raise e


@router.post(
    "/{sheet_id}/respiratory",
    response_model=BaseResponse[PatientProgressSheetDetailSchema],
    description="Add or update respiratory entry",
)
@format_response(
    response_model=PatientProgressSheetDetailSchema,
    message="Respiratory entry added/updated successfully",
)
async def add_respiratory_entry(
    sheet_id: str,
    time: str = Form(..., description="Time in HH:00 format"),
    respiratory_data: str = Form(..., description="Respiratory data"),
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> PatientProgressSheetDetailSchema:
    """
    Add or update respiratory entry in progress sheet.
    If an entry exists for the given time, it will be updated.
    """
    try:
        await validate_resource_access(
            field_name="sheet_id",
            field_value=sheet_id,
            model_class=PatientProgressSheet,
            current_user=current_user,
        )
        respiratory_data_dict = json.loads(respiratory_data)
        respiratory_data_dict["organisation_id"] = organisation_id
        respiratory_data_schema = RespiratorySectionSchema.model_validate(
            respiratory_data_dict
        )

        sheet = await progress_sheet_service.add_respiratory_entry(
            sheet_id=sheet_id,
            time=time,
            respiratory_data=respiratory_data_schema,
            current_user=current_user,
        )
        return sheet
    except Exception as e:
        raise e


@router.post(
    "/{sheet_id}/catheter",
    response_model=BaseResponse[PatientProgressSheetDetailSchema],
    description="Add or update catheter entry",
)
@format_response(
    response_model=PatientProgressSheetDetailSchema,
    message="Catheter entry added/updated successfully",
)
async def add_catheter_entry(
    sheet_id: str,
    time: str = Form(..., description="Time in HH:00 format"),
    catheter_data: str = Form(..., description="Catheter data"),
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> PatientProgressSheetDetailSchema:
    """
    Add or update catheter entry in progress sheet.
    If an entry exists for the given time, it will be updated.
    """
    try:
        await validate_resource_access(
            field_name="sheet_id",
            field_value=sheet_id,
            model_class=PatientProgressSheet,
            current_user=current_user,
        )

        catheter_data_dict = json.loads(catheter_data)
        catheter_data_dict["organisation_id"] = organisation_id
        catheter_data_schema = CatheterSectionSchema.model_validate(catheter_data_dict)

        sheet = await progress_sheet_service.add_catheter_entry(
            sheet_id=sheet_id,
            time=time,
            catheter_data=catheter_data_schema,
            current_user=current_user,
        )
        return sheet
    except Exception as e:
        raise e
