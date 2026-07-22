from fastapi import APIRouter, Depends

from app.accounts.api.v1 import (get_current_user,
                                 validate_organisation_access,
                                 validate_resource_access)
from app.base.models import BaseResponse, PaginationResponse
from app.utils import format_response

from ....filters import OrganisationICUFilterParams
from ....models import OrganisationICU
from ....schemas import (OrganisationICUCreate, OrganisationICUResponse,
                         OrganisationICUUpdate, OrganisationICUWithBedsCreate)
from ....services import organisation_icu_service

router = APIRouter()


@router.get(
    "/",
    response_model=BaseResponse[OrganisationICUResponse],
    description="Get organisation ICU by ID",
)
@format_response(
    response_model=OrganisationICUResponse,
    message="Organisation ICU retrieved successfully",
)
async def get_organisation_icu(
    organisation_icu_id: str, current_user=Depends(get_current_user)
) -> OrganisationICUResponse:
    """Get organisation ICU by ID"""
    try:
        await validate_resource_access(
            field_name="_id",
            field_value=organisation_icu_id,
            model_class=OrganisationICU,
            current_user=current_user,
        )
        organisation_icu = await organisation_icu_service.get_organisation_icu(
            organisation_icu_id
        )
        return organisation_icu
    except Exception as e:
        raise e


@router.get(
    "",
    response_model=BaseResponse[PaginationResponse[OrganisationICUResponse]],
    description="Get all organisation ICUs",
)
@format_response(
    response_model=PaginationResponse[OrganisationICUResponse],
    message="Organisation ICUs retrieved successfully",
)
async def get_organisation_icus(
    params: OrganisationICUFilterParams = Depends(),
    current_user=Depends(get_current_user),
) -> PaginationResponse[OrganisationICUResponse]:
    """Get all organisation ICUs"""
    try:
        organisation_icus = await organisation_icu_service.get_organisation_icus(
            params, current_user
        )
        return organisation_icus
    except Exception as e:
        raise e


@router.post(
    "",
    response_model=BaseResponse[OrganisationICUResponse],
    description="Create a new organisation ICU",
)
@format_response(
    response_model=OrganisationICUResponse,
    message="Organisation ICU created successfully",
)
async def create_organisation_icu(
    organisation_icu: OrganisationICUCreate,
    current_user=Depends(get_current_user),
) -> OrganisationICUResponse:
    """Create a new organisation ICU"""
    try:
        organisation_icu = await organisation_icu_service.create_organisation_icu(
            organisation_icu.model_dump(), current_user
        )
        return organisation_icu
    except Exception as e:
        raise e


@router.put(
    "",
    response_model=BaseResponse[OrganisationICUResponse],
    description="Update an existing organisation ICU",
)
@format_response(
    response_model=OrganisationICUResponse,
    message="Organisation ICU updated successfully",
)
async def update_organisation_icu(
    organisation_icu_id: str,
    organisation_icu: OrganisationICUUpdate,
    current_user=Depends(get_current_user),
) -> OrganisationICUResponse:
    """Update an existing organisation ICU"""
    try:
        organisation_icu = await organisation_icu_service.update_organisation_icu(
            organisation_icu_id, organisation_icu.model_dump(), current_user
        )
        return organisation_icu
    except Exception as e:
        raise e


@router.delete(
    "",
    response_model=BaseResponse[OrganisationICUResponse],
    description="Delete an existing organisation ICU",
)
@format_response(
    response_model=OrganisationICUResponse,
    message="Organisation ICU deleted successfully",
)
async def delete_organisation_icu(
    organisation_icu_id: str, current_user=Depends(get_current_user)
) -> OrganisationICUResponse:
    """Delete an existing organisation ICU"""
    try:
        organisation_icu = await organisation_icu_service.delete_organisation_icu(
            organisation_icu_id, current_user
        )
        return organisation_icu
    except Exception as e:
        raise e


@router.post(
    "/with-beds",
    response_model=BaseResponse[OrganisationICUResponse],
    description="Create a new organisation ICU with beds",
)
@format_response(
    response_model=OrganisationICUResponse,
    message="Organisation ICU with beds created successfully",
)
async def create_organisation_icu_with_beds(
    organisation_icu: OrganisationICUWithBedsCreate,
    current_user=Depends(get_current_user),
) -> OrganisationICUResponse:
    """Create a new organisation ICU with beds"""
    try:
        organisation_icu = (
            await organisation_icu_service.create_organisation_icu_with_beds(
                organisation_icu.model_dump(), current_user
            )
        )
        return organisation_icu
    except Exception as e:
        raise e
