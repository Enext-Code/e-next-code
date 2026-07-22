from fastapi import APIRouter, Depends

from app.accounts.api.v1 import (get_current_user,
                                 validate_organisation_access,
                                 validate_resource_access)
from app.base.models import BaseResponse, PaginationResponse
from app.utils import format_response

from ....filters import PatientCriticalityFilterParams
from ....models import PatientCriticality
from ....schemas import (PatientCriticalityCreateSchema,
                         PatientCriticalityResponseSchema,
                         PatientCriticalityUpdateSchema)
from ....services import patient_criticality_service

router = APIRouter()


@router.get(
    "/",
    response_model=BaseResponse[PatientCriticalityResponseSchema],
    description="Get patient criticality by ID",
)
@format_response(
    response_model=PatientCriticalityResponseSchema,
    message="Patient criticality record retrieved successfully",
)
async def get_patient_criticality_by_id(
    criticality_id: str,
    current_user=Depends(get_current_user),
) -> PatientCriticalityResponseSchema:
    """
    Get patient criticality by ID
    """
    try:
        await validate_resource_access(
            field_name="criticality_id",
            field_value=criticality_id,
            model_class=PatientCriticality,
            current_user=current_user,
        )
        criticality = await patient_criticality_service.get_patient_criticality(
            criticality_id
        )
        return criticality
    except Exception as e:
        raise e


@router.get(
    "/list",
    response_model=BaseResponse[PaginationResponse[PatientCriticalityResponseSchema]],
    description="Get patient criticality records",
)
@format_response(
    response_model=PaginationResponse[PatientCriticalityResponseSchema],
    message="Patient criticality records retrieved successfully",
)
async def get_patient_criticalities(
    params: PatientCriticalityFilterParams = Depends(),
    current_user=Depends(get_current_user),
) -> PaginationResponse[PatientCriticalityResponseSchema]:
    """
    Get patient criticality records
    """
    try:
        criticalities = await patient_criticality_service.get_patient_criticalities(
            params, current_user
        )
        return criticalities
    except Exception as e:
        raise e


@router.post(
    "",
    response_model=BaseResponse[PatientCriticalityResponseSchema],
    description="Create patient criticality record",
)
@format_response(
    response_model=PatientCriticalityResponseSchema,
    message="Patient criticality record created successfully",
)
async def create_patient_criticality(
    criticality: PatientCriticalityCreateSchema,
    current_user=Depends(get_current_user),
) -> PatientCriticalityResponseSchema:
    """
    Create patient criticality record
    """
    try:
        criticality_data = criticality.model_dump()
        # Get organisation_id from the request or current user
        organisation_id = criticality_data.get("organisation_id")
        if not organisation_id:
            organisation_id = current_user["oid"]
        criticality_data["organisation_id"] = organisation_id
        criticality = await patient_criticality_service.create_patient_criticality(
            criticality_data, current_user
        )
        return criticality
    except Exception as e:
        raise e


@router.put(
    "",
    response_model=BaseResponse[PatientCriticalityResponseSchema],
    description="Update patient criticality record",
)
@format_response(
    response_model=PatientCriticalityResponseSchema,
    message="Patient criticality record updated successfully",
)
async def update_patient_criticality(
    criticality_id: str,
    criticality: PatientCriticalityUpdateSchema,
    current_user=Depends(get_current_user),
) -> PatientCriticalityResponseSchema:
    """
    Update patient criticality record
    """
    try:
        await validate_resource_access(
            field_name="criticality_id",
            field_value=criticality_id,
            model_class=PatientCriticality,
            current_user=current_user,
        )
        criticality = await patient_criticality_service.update_patient_criticality(
            criticality_id, criticality.model_dump(), current_user
        )
        return criticality
    except Exception as e:
        raise e


@router.delete(
    "",
    response_model=BaseResponse[dict],
    description="Delete patient criticality record",
)
@format_response(
    response_model=dict,
    message="Patient criticality record deleted successfully",
)
async def delete_patient_criticality(
    criticality_id: str,
    current_user=Depends(get_current_user),
) -> dict:
    """
    Delete patient criticality record
    """
    try:
        await validate_resource_access(
            field_name="criticality_id",
            field_value=criticality_id,
            model_class=PatientCriticality,
            current_user=current_user,
        )
        await patient_criticality_service.delete_patient_criticality(
            criticality_id, current_user
        )
        return {"message": "Patient criticality record deleted successfully"}
    except Exception as e:
        raise e
