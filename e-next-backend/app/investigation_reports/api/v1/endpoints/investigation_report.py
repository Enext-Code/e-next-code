from typing import List

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.accounts.api.v1 import (get_current_user,
                                 validate_organisation_access,
                                 validate_resource_access)
from app.accounts.enums import UserType
from app.base.models import BaseResponse, PaginationResponse, ValidationError
from app.utils import decrypt_user_type, format_response

from ....enums import RadiologyType
from ....filters import InvestigationReportFilterParams
from ....models import InvestigationReport
from ....schemas.investigation_report import (
    BulkAddArterialParametersRequest, BulkAddBloodParametersRequest,
    BulkAddMicrobiologyParametersRequest, CreateInvestigationReportRequest,
    CreateInvestigationReportResponse, DeleteRadiologyImagesRequest,
    InvestigationReportDetailResponse, InvestigationReportFilter,
    InvestigationReportSummaryResponse, ParameterListResponse,
    UpdateInvestigationReportRequest, ValidateParameterRequest,
    ValidateParameterResponse)
from ....services.investigation_report_service import \
    investigation_report_service

router = APIRouter()


@router.post(
    "/",
    response_model=BaseResponse[CreateInvestigationReportResponse],
    description="Create a new investigation report",
)
@format_response(
    response_model=CreateInvestigationReportResponse,
    message="Investigation report created successfully",
)
async def create_investigation_report(
    request: CreateInvestigationReportRequest,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> CreateInvestigationReportResponse:
    """
    Create a new investigation report for a patient.
    This generates a unique report ID and returns it immediately.
    """
    try:
        request.organisation_id = organisation_id
        report = await investigation_report_service.create_report(request, current_user)
        return report
    except Exception as e:
        raise e


@router.get(
    "/{report_id}",
    response_model=BaseResponse[InvestigationReportDetailResponse],
    description="Get investigation report by ID",
)
@format_response(
    response_model=InvestigationReportDetailResponse,
    message="Investigation report retrieved successfully",
)
async def get_investigation_report(
    report_id: str, current_user=Depends(get_current_user)
) -> InvestigationReportDetailResponse:
    """
    Get detailed investigation report by report ID.
    Includes presigned URLs for radiology images if available.
    """
    try:
        await validate_resource_access(
            field_name="report_id",
            field_value=report_id,
            model_class=InvestigationReport,
            current_user=current_user,
        )
        report = await investigation_report_service.get_report(report_id, current_user)
        return report
    except Exception as e:
        raise e


@router.put(
    "/{report_id}",
    response_model=BaseResponse[InvestigationReportDetailResponse],
    description="Update investigation report",
)
@format_response(
    response_model=InvestigationReportDetailResponse,
    message="Investigation report updated successfully",
)
async def update_investigation_report(
    report_id: str,
    request: UpdateInvestigationReportRequest,
    current_user=Depends(get_current_user),
) -> InvestigationReportDetailResponse:
    """
    Update investigation report with blood analysis, radiology, or arterial analysis data.
    Supports partial updates - only provided fields will be updated.
    """
    try:
        await validate_resource_access(
            field_name="report_id",
            field_value=report_id,
            model_class=InvestigationReport,
            current_user=current_user,
        )
        report = await investigation_report_service.update_report(
            report_id, request, current_user
        )
        return report
    except Exception as e:
        raise e


@router.delete(
    "/{report_id}",
    response_model=BaseResponse[dict],
    description="Delete investigation report",
)
@format_response(
    response_model=dict, message="Investigation report deleted successfully"
)
async def delete_investigation_report(
    report_id: str, current_user=Depends(get_current_user)
) -> dict:
    """
    Soft delete an investigation report.
    The report will be marked as deleted but not removed from the database.
    """
    try:
        await validate_resource_access(
            field_name="report_id",
            field_value=report_id,
            model_class=InvestigationReport,
            current_user=current_user,
        )
        result = await investigation_report_service.delete_report(
            report_id, current_user
        )
        return result
    except Exception as e:
        raise e


@router.get(
    "",
    response_model=BaseResponse[PaginationResponse[InvestigationReportSummaryResponse]],
    description="Get all investigation reports",
)
@format_response(
    response_model=PaginationResponse[InvestigationReportSummaryResponse],
    message="Investigation reports retrieved successfully",
)
async def get_investigation_reports(
    params: InvestigationReportFilterParams = Depends(),
    current_user=Depends(get_current_user),
) -> PaginationResponse[InvestigationReportSummaryResponse]:
    """
    Get all investigation reports with optional filters.
    Supports pagination and filtering by date range and investigation types.
    """
    try:
        # Convert InvestigationReportFilterParams to InvestigationReportFilter
        filter_params = InvestigationReportFilter(
            patient_id=params.patient_id,
            from_date=params.from_date,
            to_date=params.to_date,
            has_blood_analysis=params.has_blood_analysis,
            has_radiology=params.has_radiology,
            has_arterial_analysis=params.has_arterial_analysis,
            has_microbiology=params.has_microbiology,
            organisation_id=params.organisation_id,
            skip=(params.page - 1) * params.limit,  # Convert page to skip
            limit=params.limit,
        )
        reports = await investigation_report_service.get_all_reports(
            filter_params, current_user
        )
        # Update the response to include page information
        reports["page"] = params.page
        return reports
    except Exception as e:
        raise e


@router.get(
    "/patient/{patient_id}",
    response_model=BaseResponse[PaginationResponse[InvestigationReportSummaryResponse]],
    description="Get all investigation reports for a patient",
)
@format_response(
    response_model=PaginationResponse[InvestigationReportSummaryResponse],
    message="Patient investigation reports retrieved successfully",
)
async def get_patient_investigation_reports(
    patient_id: str,
    params: InvestigationReportFilterParams = Depends(),
    current_user=Depends(get_current_user),
) -> PaginationResponse[InvestigationReportSummaryResponse]:
    """
    Get all investigation reports for a specific patient.
    Reports are sorted by analysis date in descending order.
    """
    try:
        filter_params = InvestigationReportFilter(
            patient_id=patient_id,
            organisation_id=params.organisation_id,
            from_date=params.from_date,
            to_date=params.to_date,
            skip=(params.page - 1) * params.limit,
            limit=params.limit,
        )
        reports = await investigation_report_service.get_patient_reports(
            patient_id, filter_params, current_user
        )
        # Update the response to include page information
        reports["page"] = params.page
        return reports
    except Exception as e:
        raise e


@router.post(
    "/{report_id}/blood-analysis/bulk",
    response_model=BaseResponse[InvestigationReportDetailResponse],
    description="Bulk add blood analysis parameters",
)
@format_response(
    response_model=InvestigationReportDetailResponse,
    message="Blood analysis parameters added successfully",
)
async def bulk_add_blood_parameters(
    report_id: str,
    request: BulkAddBloodParametersRequest,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> InvestigationReportDetailResponse:
    """
    Bulk add multiple blood analysis parameters to a report.
    Useful for adding multiple test results at once.

    Example request body:
    {
        "parameters": [
            {"parameter": "Haemoglobin", "value": 12.5},
            {"parameter": "WBC Count", "value": 8500},
            {"parameter": "Platelet Count", "value": 250000}
        ],
        "recorded_by": "LAB001"
    }
    """
    try:
        await validate_resource_access(
            field_name="report_id",
            field_value=report_id,
            model_class=InvestigationReport,
            current_user=current_user,
        )
        request.organisation_id = organisation_id
        report = await investigation_report_service.bulk_add_blood_parameters(
            report_id, request, current_user
        )
        return report
    except Exception as e:
        raise e


@router.post(
    "/{report_id}/arterial-analysis/bulk",
    response_model=BaseResponse[InvestigationReportDetailResponse],
    description="Bulk add arterial analysis parameters",
)
@format_response(
    response_model=InvestigationReportDetailResponse,
    message="Arterial analysis parameters added successfully",
)
async def bulk_add_arterial_parameters(
    report_id: str,
    request: BulkAddArterialParametersRequest,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> InvestigationReportDetailResponse:
    """
    Bulk add multiple arterial blood gas analysis parameters to a report.

    Example request body:
    {
        "parameters": [
            {"parameter": "pH", "value": 7.38},
            {"parameter": "pCO2", "value": 42},
            {"parameter": "pO2", "value": 85}
        ],
        "recorded_by": "ICU001"
    }
    """
    try:
        await validate_resource_access(
            field_name="report_id",
            field_value=report_id,
            model_class=InvestigationReport,
            current_user=current_user,
        )
        request.organisation_id = organisation_id
        report = await investigation_report_service.bulk_add_arterial_parameters(
            report_id, request, current_user
        )
        return report
    except Exception as e:
        raise e


@router.post(
    "/{report_id}/microbiology/bulk",
    response_model=BaseResponse[InvestigationReportDetailResponse],
    description="Bulk add microbiology parameters",
)
@format_response(
    response_model=InvestigationReportDetailResponse,
    message="Microbiology parameters added successfully",
)
async def bulk_add_microbiology_parameters(
    report_id: str,
    request: BulkAddMicrobiologyParametersRequest,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> InvestigationReportDetailResponse:
    """
    Bulk add multiple arterial blood gas analysis parameters to a report.

    Example request body:
    {
        "parameters": [
            {"parameter": "Blood C/S", "value": 12.5},
            {"parameter": "ET C/S", "value": 12.5},
            {"parameter": "ET-Gram Stain", "value": 12.5},
            {"parameter": "Urine R/M", "value": 12.5},
            {"parameter": "Urine C/S", "value": 12.5},
            {"parameter": "CSF-Gram Stain", "value": 12.5}
        ],
        "recorded_by": "ICU001"
    }
    """
    try:
        await validate_resource_access(
            field_name="report_id",
            field_value=report_id,
            model_class=InvestigationReport,
            current_user=current_user,
        )
        request.organisation_id = organisation_id
        report = await investigation_report_service.bulk_add_microbiology_parameters(
            report_id, request, current_user
        )
        return report
    except Exception as e:
        raise e


@router.get(
    "/parameters/available",
    response_model=BaseResponse[ParameterListResponse],
    description="Get all available parameters",
)
@format_response(
    response_model=ParameterListResponse,
    message="Available parameters retrieved successfully",
)
async def get_available_parameters(
    current_user=Depends(get_current_user),
) -> ParameterListResponse:
    """
    Get list of all available parameters for blood analysis, arterial analysis, and radiology types.
    This endpoint is useful for populating dropdowns in the UI.
    """
    try:
        parameters = await investigation_report_service.get_available_parameters()
        return parameters
    except Exception as e:
        raise e


@router.post(
    "/parameters/validate",
    response_model=BaseResponse[ValidateParameterResponse],
    description="Validate a parameter",
)
@format_response(
    response_model=ValidateParameterResponse, message="Parameter validated successfully"
)
async def validate_parameter(
    request: ValidateParameterRequest, current_user=Depends(get_current_user)
) -> ValidateParameterResponse:
    """
    Validate if a parameter name is valid for a specific investigation type.
    Returns parameter information if valid.
    """
    try:
        result = await investigation_report_service.validate_parameter(request)
        return result
    except Exception as e:
        raise e


@router.post(
    "/{report_id}/radiology/bulk-upload",
    response_model=BaseResponse[InvestigationReportDetailResponse],
    description="Upload multiple radiology types with their files in one request",
)
@format_response(
    response_model=InvestigationReportDetailResponse,
    message="Radiology data uploaded successfully",
)
async def bulk_upload_radiology(
    report_id: str,
    radiology_data: str = Form(..., description="JSON array of radiology data"),
    files: List[UploadFile] = File(..., description="All radiology files"),
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> InvestigationReportDetailResponse:
    """
    Upload multiple radiology types with their files in a single request.
    
    The radiology_data should be a JSON array with the following structure:
    [
        {
            "radiology_type": "X-Ray",
            "subtype": "Chest PA",
            "reported_by": "DR001",
            "file_indices": [0, 1]  // Indices of files in the files array
        },
        {
            "radiology_type": "CT Scan",
            "subtype": "Chest - HRCT",
            "reported_by": "DR002",
            "file_indices": [2, 3, 4]
        }
    ]
    
    Example usage:
    ```bash
    curl -X 'POST' \
      'http://localhost:8000/api/v1/investigation-reports/investigation-reports/{report_id}/radiology/bulk-upload' \
      -H 'Authorization: Bearer {token}' \
      -F 'radiology_data=[{"radiology_type":"X-Ray","subtype":"Chest PA","reported_by":"DR001","file_indices":[0,1]},{"radiology_type":"CT Scan","subtype":"Chest - HRCT","reported_by":"DR002","file_indices":[2,3,4]}]' \
      -F 'files=@xray1.jpg' \
      -F 'files=@xray2.jpg' \
      -F 'files=@ct1.dicom' \
      -F 'files=@ct2.dicom' \
      -F 'files=@ct3.dicom'
    ```
    """
    try:
        await validate_resource_access(
            field_name="report_id",
            field_value=report_id,
            model_class=InvestigationReport,
            current_user=current_user,
        )
        import json

        radiology_entries = json.loads(radiology_data)

        # Process each radiology type
        for entry in radiology_entries:
            radiology_type = RadiologyType(entry["radiology_type"])
            subtype = entry.get("subtype")
            reported_by = entry.get("reported_by")
            file_indices = entry.get("file_indices", [])

            # Get the files for this radiology type
            type_files = [files[i] for i in file_indices if i < len(files)]

            encrypted_user_type = current_user["ut"]
            user_type = UserType(decrypt_user_type(encrypted_user_type))
            organisation_id = (
                current_user["oid"]
                if not UserType.requires_organisation_id(user_type)
                else organisation_id
            )

            if type_files:
                await investigation_report_service.add_radiology_type_with_files(
                    report_id,
                    type_files,
                    radiology_type,
                    subtype,
                    reported_by,
                    current_user,
                    organisation_id,
                )

        # Return the complete report with all radiology data
        report = await investigation_report_service.get_report(report_id, current_user)
        return report

    except json.JSONDecodeError:
        raise ValidationError(
            message="Invalid JSON format for radiology_data", error_code="INVALID_JSON"
        )
    except Exception as e:
        raise e


@router.delete(
    "/{report_id}/radiology/images",
    response_model=BaseResponse[InvestigationReportDetailResponse],
    description="Delete radiology images from a report",
)
@format_response(
    response_model=InvestigationReportDetailResponse,
    message="Radiology images deleted successfully",
)
async def delete_radiology_images(
    report_id: str,
    request: DeleteRadiologyImagesRequest,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> InvestigationReportDetailResponse:
    """
    Delete radiology images from a report.
    
    This endpoint allows you to delete specific radiology images by their S3 file keys.
    The file keys can be found in the report's radiology_list[].file_keys[] array.
    
    Example request body:
    ```json
    {
        "file_keys": [
            "investigation-reports/org123/patient456/IR-123/radiology/X-Ray/Chest_PA/image1.jpg",
            "investigation-reports/org123/patient456/IR-123/radiology/X-Ray/Chest_PA/image2.jpg"
        ]
    }
    ```
    
    Notes:
    - Files will be permanently deleted from S3
    - If a radiology type has no remaining images after deletion, it will be removed from the list
    - The endpoint returns the updated report with remaining radiology images
    """
    try:
        await validate_resource_access(
            field_name="report_id",
            field_value=report_id,
            model_class=InvestigationReport,
            current_user=current_user,
        )
        
        encrypted_user_type = current_user["ut"]
        user_type = UserType(decrypt_user_type(encrypted_user_type))
        org_id = (
            current_user["oid"]
            if not UserType.requires_organisation_id(user_type)
            else organisation_id
        )
        
        report = await investigation_report_service.delete_radiology_images(
            report_id=report_id,
            file_keys=request.file_keys,
            current_user=current_user,
            organisation_id=org_id,
        )
        return report
    except Exception as e:
        raise e
