from fastapi import APIRouter, Depends

from app.accounts.api.v1 import (get_current_user,
                                 validate_organisation_access,
                                 validate_resource_access)
from app.base.models import BaseResponse
from app.utils import format_response

from ....models import PatientHeent
from ....schemas import (PatientHeentCreate, PatientHeentResponse,
                         PatientHeentUpdate)
from ....services import patient_heent_service

router = APIRouter()


@router.get(
    "/",
    response_model=BaseResponse[PatientHeentResponse],
    description="Get patient heent by patient ID",
)
@format_response(
    response_model=PatientHeentResponse,
    message="Patient heent retrieved successfully",
)
async def get_patient_heent_by_patient_id(
    patient_id: str, current_user=Depends(get_current_user)
) -> PatientHeentResponse:
    """
    Get patient heent by patient ID
    """
    try:
        await validate_resource_access(
            field_name="patient_id",
            field_value=patient_id,
            model_class=PatientHeent,
            current_user=current_user,
        )
        patient_heent = await patient_heent_service.get_patient_heent(patient_id)
        return patient_heent
    except Exception as e:
        raise e


@router.post(
    "",
    response_model=BaseResponse[PatientHeentResponse],
    description="Create patient heent",
)
@format_response(
    response_model=PatientHeentResponse,
    message="Patient heent created successfully",
)
async def create_patient_heent(
    patient_heent: PatientHeentCreate,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> PatientHeentResponse:
    """
    Create patient heent
    """
    try:
        patient_heent_data = patient_heent.model_dump()
        patient_heent_data["organisation_id"] = organisation_id
        patient_heent = await patient_heent_service.create_patient_heent(
            patient_heent_data, current_user
        )
        return patient_heent
    except Exception as e:
        raise e


@router.put(
    "",
    response_model=BaseResponse[PatientHeentResponse],
    description="Update patient heent",
)
@format_response(
    response_model=PatientHeentResponse,
    message="Patient heent updated successfully",
)
async def update_patient_heent(
    patient_id: str,
    patient_heent: PatientHeentUpdate,
    current_user=Depends(get_current_user),
) -> PatientHeentResponse:
    """
    Update patient heent
    """
    try:
        await validate_resource_access(
            field_name="patient_id",
            field_value=patient_id,
            model_class=PatientHeent,
            current_user=current_user,
        )
        patient_heent = await patient_heent_service.update_patient_heent(
            patient_id, patient_heent.model_dump(), current_user
        )
        return patient_heent
    except Exception as e:
        raise e
