from fastapi import APIRouter, Depends

from app.accounts.api.v1 import (get_current_user,
                                 validate_organisation_access,
                                 validate_resource_access)
from app.base.models import BaseResponse
from app.utils import format_response

from ....models import PatientInvestigation
from ....schemas import (PatientInvestigationCreate,
                         PatientInvestigationResponse,
                         PatientInvestigationUpdate)
from ....services import patient_investigation_service

router = APIRouter()


@router.get(
    "/",
    response_model=BaseResponse[dict],
    description="Get patient investigation by patient ID",
)
@format_response(
    response_model=dict,
    message="Patient investigation retrieved successfully",
)
async def get_patient_investigation_by_patient_id(
    patient_id: str, current_user=Depends(get_current_user)
) -> dict:
    """Get patient investigation by patient ID"""
    try:
        await validate_resource_access(
            field_name="patient_id",
            field_value=patient_id,
            model_class=PatientInvestigation,
            current_user=current_user,
        )
        patient_investigation = (
            await patient_investigation_service.get_patient_investigation(patient_id)
        )
        return patient_investigation_service.build_investigation_response(
            patient_investigation
        )
    except Exception as e:
        raise e


@router.post(
    "",
    response_model=BaseResponse[PatientInvestigationResponse],
    description="Create patient investigation",
)
@format_response(
    response_model=PatientInvestigationResponse,
    message="Patient investigation created successfully",
)
async def create_patient_investigation(
    patient_investigation: PatientInvestigationCreate,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> PatientInvestigationResponse:
    """Create patient investigation"""
    try:
        patient_investigation_data = patient_investigation.model_dump()
        patient_investigation_data["organisation_id"] = organisation_id
        patient_investigation = (
            await patient_investigation_service.create_patient_investigation(
                patient_investigation_data, current_user
            )
        )
        return patient_investigation
    except Exception as e:
        raise e


@router.put(
    "",
    response_model=BaseResponse[PatientInvestigationResponse],
    description="Update patient investigation",
)
@format_response(
    response_model=PatientInvestigationResponse,
    message="Patient investigation updated successfully",
)
async def update_patient_investigation(
    patient_id: str,
    patient_investigation: PatientInvestigationUpdate,
    current_user=Depends(get_current_user),
) -> PatientInvestigationResponse:
    """Update patient investigation"""
    try:
        await validate_resource_access(
            field_name="patient_id",
            field_value=patient_id,
            model_class=PatientInvestigation,
            current_user=current_user,
        )
        patient_investigation = (
            await patient_investigation_service.update_patient_investigation(
                patient_id, patient_investigation.model_dump(), current_user
            )
        )
        return patient_investigation
    except Exception as e:
        raise e
