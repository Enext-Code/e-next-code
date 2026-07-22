from fastapi import APIRouter, Depends

from app.accounts.api.v1 import (get_current_user,
                                 validate_organisation_access,
                                 validate_resource_access)
from app.base.models import BaseResponse
from app.utils import format_response

from ....models import PatientPastMedicalHistory
from ....schemas import (PatientPastMedicalHistoryCreate,
                         PatientPastMedicalHistoryResponse,
                         PatientPastMedicalHistoryUpdate)
from ....services import patient_past_medical_history_service

router = APIRouter()


@router.get(
    "/",
    response_model=BaseResponse[PatientPastMedicalHistoryResponse],
    description="Get patient past medical history by patient ID",
)
@format_response(
    response_model=PatientPastMedicalHistoryResponse,
    message="Patient past medical history retrieved successfully",
)
async def get_patient_past_medical_history_by_patient_id(
    patient_id: str, current_user=Depends(get_current_user)
) -> PatientPastMedicalHistoryResponse:
    """Get patient past medical history by patient ID"""
    try:
        await validate_resource_access(
            field_name="patient_id",
            field_value=patient_id,
            model_class=PatientPastMedicalHistory,
            current_user=current_user,
        )
        patient_past_medical_history = (
            await patient_past_medical_history_service.get_patient_past_medical_history(
                patient_id
            )
        )
        return patient_past_medical_history
    except Exception as e:
        raise e


@router.post(
    "",
    response_model=BaseResponse[PatientPastMedicalHistoryResponse],
    description="Create patient past medical history",
)
@format_response(
    response_model=PatientPastMedicalHistoryResponse,
    message="Patient past medical history created successfully",
)
async def create_patient_past_medical_history(
    patient_past_medical_history: PatientPastMedicalHistoryCreate,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> PatientPastMedicalHistoryResponse:
    """Create patient past medical history"""
    try:
        patient_past_medical_history_data = patient_past_medical_history.model_dump()
        patient_past_medical_history_data["organisation_id"] = organisation_id
        patient_past_medical_history = await patient_past_medical_history_service.create_patient_past_medical_history(
            patient_past_medical_history_data, current_user
        )
        return patient_past_medical_history
    except Exception as e:
        raise e


@router.put(
    "",
    response_model=BaseResponse[PatientPastMedicalHistoryResponse],
    description="Update patient past medical history",
)
@format_response(
    response_model=PatientPastMedicalHistoryResponse,
    message="Patient past medical history updated successfully",
)
async def update_patient_past_medical_history(
    patient_id: str,
    patient_past_medical_history: PatientPastMedicalHistoryUpdate,
    current_user=Depends(get_current_user),
) -> PatientPastMedicalHistoryResponse:
    """Update patient past medical history"""
    try:
        await validate_resource_access(
            field_name="patient_id",
            field_value=patient_id,
            model_class=PatientPastMedicalHistory,
            current_user=current_user,
        )
        # Use exclude_unset=True to only include fields that were explicitly provided
        # This ensures we only update fields the user sent, not fields with defaults
        update_data = patient_past_medical_history.model_dump(exclude_unset=True, exclude_none=True)
        patient_past_medical_history = await patient_past_medical_history_service.update_patient_past_medical_history(
            patient_id, update_data, current_user
        )
        return patient_past_medical_history
    except Exception as e:
        raise e
