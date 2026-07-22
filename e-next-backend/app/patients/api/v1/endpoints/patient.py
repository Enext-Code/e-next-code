from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse, StreamingResponse

from bson import ObjectId

from app.accounts.api.v1 import (get_current_user,
                                 validate_organisation_access,
                                 validate_resource_access)
from app.base.models import BaseResponse, PaginationResponse, ValidationError
from app.utils import format_response

from ....enums import PatientStatus
from ....filters import PatientFilterParams
from ....models import Patient
from ....schemas import (DischargeReportCreate, DischargeReportResponse,
                         DischargeReportUpdate, PatientCreate, PatientResponse,
                         PatientUpdate)
from ....services import patient_service
from ....services.discharge_report_crud_service import DischargeReportCRUDService
from ....services.discharge_report_service import DischargeReportService


async def _validate_patient_not_admitted(patient_id: str):
    """Check that patient is not in ADMISSION status before allowing discharge report operations"""
    patient = await Patient.find_one({
        "_id": ObjectId(patient_id),
        "is_active": True,
        "is_deleted": False,
    })
    if patient and patient.status == PatientStatus.ADMISSION:
        raise ValidationError(
            message="Discharge report is not available while patient is still admitted",
            error_code="PATIENT_STILL_ADMITTED",
        )

router = APIRouter()


@router.get(
    "/",
    response_model=BaseResponse[PatientResponse],
    description="Get patient by ID",
)
@router.get(
    "/detail",
    response_model=BaseResponse[PatientResponse],
    description="Get patient by ID (slash-safe for local Next.js proxy)",
)
@format_response(
    response_model=PatientResponse, message="Patient retrieved successfully"
)
async def get_patient(
    patient_id: str, current_user=Depends(get_current_user)
) -> PatientResponse:
    """
    Get patient by ID
    """
    try:
        await validate_resource_access(
            field_name="_id",
            field_value=patient_id,
            model_class=Patient,
            current_user=current_user,
        )
        patient = await patient_service.get_patient(patient_id)
        return patient
    except Exception as e:
        raise e


@router.post(
    "",
    response_model=BaseResponse[PatientResponse],
    description="Create a new patient",
)
@router.post(
    "/",
    response_model=BaseResponse[PatientResponse],
    description="Create a new patient",
)
@format_response(response_model=PatientResponse, message="Patient created successfully")
async def create_patient(
    patient: PatientCreate,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> PatientResponse:
    """
    Create a new patient
    """
    try:
        patient_data = patient.model_dump()
        patient_data["organisation_id"] = organisation_id
        patient = await patient_service.create_patient(patient_data, current_user)
        return patient
    except Exception as e:
        raise e


@router.put(
    "",
    response_model=BaseResponse[PatientResponse],
    description="Update an existing patient",
)
@router.put(
    "/",
    response_model=BaseResponse[PatientResponse],
    description="Update an existing patient",
)
@format_response(response_model=PatientResponse, message="Patient updated successfully")
async def update_patient(
    patient_id: str,
    patient: PatientUpdate,
    current_user=Depends(get_current_user),
) -> PatientResponse:
    """
    Update an existing patient
    """
    try:
        await validate_resource_access(
            field_name="_id",
            field_value=patient_id,
            model_class=Patient,
            current_user=current_user,
        )
        patient = await patient_service.update_patient(
            patient_id, patient.model_dump(), current_user
        )
        return patient
    except Exception as e:
        raise e


@router.delete(
    "",
    response_model=BaseResponse[PatientResponse],
    description="Delete an existing patient",
)
@router.delete(
    "/",
    response_model=BaseResponse[PatientResponse],
    description="Delete an existing patient",
)
@format_response(response_model=PatientResponse, message="Patient deleted successfully")
async def delete_patient(
    patient_id: str, current_user=Depends(get_current_user)
) -> PatientResponse:
    """
    Delete an existing patient
    """
    try:
        await validate_resource_access(
            field_name="_id",
            field_value=patient_id,
            model_class=Patient,
            current_user=current_user,
        )
        patient = await patient_service.delete_patient(patient_id, current_user)
        return patient
    except Exception as e:
        raise e


@router.get(
    "",
    response_model=BaseResponse[PaginationResponse[PatientResponse]],
    description="Get all patients",
)
@format_response(
    response_model=PaginationResponse[PatientResponse],
    message="Patients retrieved successfully",
)
async def get_patients(
    params: PatientFilterParams = Depends(),
    statuses: Optional[List[PatientStatus]] = Query(
        default=None,
        description="Filter by multiple statuses (e.g. ?statuses=admission&statuses=discharge)",
    ),
    current_user=Depends(get_current_user),
) -> PaginationResponse[PatientResponse]:
    """
    Get all patients
    """
    try:
        if statuses:
            params.statuses = statuses
        patients = await patient_service.get_all_patients(params, current_user)
        return patients
    except Exception as e:
        raise e


@router.get(
    "/info",
    response_model=BaseResponse[dict],
    description="Get patient info",
)
@format_response(response_model=dict, message="Patient info retrieved successfully")
async def get_patient_info(
    patient_id: str, current_user=Depends(get_current_user)
) -> dict:
    """
    Get patient info
    """
    try:
        await validate_resource_access(
            field_name="_id",
            field_value=patient_id,
            model_class=Patient,
            current_user=current_user,
        )
        patient_info = await patient_service.get_patient_info(patient_id)
        return patient_info
    except Exception as e:
        raise e

@router.get(
    "/{patient_id}/discharge-report",
    description="Generate and download discharge report PDF",
    response_class=StreamingResponse,
)
async def generate_discharge_report(
    patient_id: str,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
):
    """
    Generate discharge report as PDF
    
    Returns a downloadable PDF file with the discharge report details including:
    - Patient information (name, age, gender, UHID, admission date)
    - Presenting complaints (from history sheet)
    - History of present illness
    - Past history
    - On examination (BP, HR, RR, SpO2, Temperature, RBS, GCS)
    - Course in hospital
    - Condition on the time of discharge
    - Medication given (from daily round sheets)
    - Medication on discharge
    - Follow up advice
    """
    try:
        await validate_resource_access(
            field_name="_id",
            field_value=patient_id,
            model_class=Patient,
            current_user=current_user,
        )
        await _validate_patient_not_admitted(patient_id)
        # Generate PDF
        pdf_buffer = await DischargeReportService.generate_pdf_report(
            patient_id=patient_id,
            organisation_id=organisation_id,
        )
        
        # Return as downloadable file
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=discharge_report_{patient_id}.pdf"
            }
        )
    except Exception as e:
        raise e


@router.get(
    "/{patient_id}/discharge-report/html",
    description="Generate and view discharge report as HTML",
    response_class=HTMLResponse,
)
async def generate_discharge_report_html(
    patient_id: str,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
):
    """
    Generate discharge report as HTML
    
    Returns an HTML page with the discharge report details including:
    - Patient information (name, age, gender, UHID, admission date)
    - Presenting complaints (from history sheet)
    - History of present illness
    - Past history
    - On examination (BP, HR, RR, SpO2, Temperature, RBS, GCS)
    - Course in hospital
    - Condition on the time of discharge
    - Medication given (from daily round sheets)
    - Medication on discharge
    - Follow up advice
    
    The HTML is optimized for printing and matches the PDF layout.
    """
    try:
        await validate_resource_access(
            field_name="_id",
            field_value=patient_id,
            model_class=Patient,
            current_user=current_user,
        )
        await _validate_patient_not_admitted(patient_id)
        # Generate HTML
        html_content = await DischargeReportService.generate_html_report(
            patient_id=patient_id,
            organisation_id=organisation_id,
        )
        
        # Return as HTML response
        return HTMLResponse(content=html_content)
    except Exception as e:
        raise e


@router.get(
    "/{patient_id}/discharge-report/data",
    response_model=BaseResponse[DischargeReportResponse],
    description="Get discharge report data for a patient",
)
@format_response(
    response_model=DischargeReportResponse,
    message="Discharge report retrieved successfully",
)
async def get_discharge_report_data(
    patient_id: str,
    current_user=Depends(get_current_user),
) -> DischargeReportResponse:
    """Get discharge report data by patient ID"""
    try:
        await validate_resource_access(
            field_name="_id",
            field_value=patient_id,
            model_class=Patient,
            current_user=current_user,
        )
        await _validate_patient_not_admitted(patient_id)
        report = await DischargeReportCRUDService.get_discharge_report(patient_id)
        return report
    except Exception as e:
        raise e


@router.post(
    "/{patient_id}/discharge-report/data",
    response_model=BaseResponse[DischargeReportResponse],
    description="Create discharge report data for a patient",
)
@format_response(
    response_model=DischargeReportResponse,
    message="Discharge report created successfully",
)
async def create_discharge_report_data(
    patient_id: str,
    report_data: DischargeReportCreate,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> DischargeReportResponse:
    """Create discharge report data for a patient"""
    try:
        await validate_resource_access(
            field_name="_id",
            field_value=patient_id,
            model_class=Patient,
            current_user=current_user,
        )
        await _validate_patient_not_admitted(patient_id)
        data = report_data.model_dump()
        data["patient_id"] = patient_id
        # Normalize organisation_id
        if organisation_id in (None, "None", "null", ""):
            # Fetch patient to get their organisation_id
            patient = await Patient.find_one({"_id": ObjectId(patient_id)})
            data["organisation_id"] = patient.organisation_id
        else:
            data["organisation_id"] = organisation_id
        report = await DischargeReportCRUDService.create_discharge_report(
            data, current_user
        )
        return report
    except Exception as e:
        raise e


@router.put(
    "/{patient_id}/discharge-report/data",
    response_model=BaseResponse[DischargeReportResponse],
    description="Update discharge report data for a patient",
)
@format_response(
    response_model=DischargeReportResponse,
    message="Discharge report updated successfully",
)
async def update_discharge_report_data(
    patient_id: str,
    report_data: DischargeReportUpdate,
    current_user=Depends(get_current_user),
) -> DischargeReportResponse:
    """Update discharge report data for a patient"""
    try:
        await validate_resource_access(
            field_name="_id",
            field_value=patient_id,
            model_class=Patient,
            current_user=current_user,
        )
        await _validate_patient_not_admitted(patient_id)
        report = await DischargeReportCRUDService.update_discharge_report(
            patient_id, report_data.model_dump(), current_user
        )
        return report
    except Exception as e:
        raise e


@router.delete(
    "/{patient_id}/discharge-report/data",
    response_model=BaseResponse[dict],
    description="Delete discharge report data for a patient",
)
@format_response(
    response_model=dict,
    message="Discharge report deleted successfully",
)
async def delete_discharge_report_data(
    patient_id: str,
    current_user=Depends(get_current_user),
) -> dict:
    """Delete discharge report data for a patient"""
    try:
        await validate_resource_access(
            field_name="_id",
            field_value=patient_id,
            model_class=Patient,
            current_user=current_user,
        )
        await _validate_patient_not_admitted(patient_id)
        await DischargeReportCRUDService.delete_discharge_report(
            patient_id, current_user
        )
        return {"message": "Discharge report deleted successfully"}
    except Exception as e:
        raise e

