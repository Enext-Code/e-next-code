from fastapi import APIRouter, Depends

from app.accounts.api.v1 import get_current_user
from app.base.models import BaseResponse, PaginationResponse
from app.utils import format_response

from ....filters import OrganisationFilterParams
from ....schemas import (OrganisationCreate, OrganisationResponse,
                         OrganisationUpdate, OrganisationListResponse)
from ....services import organisation_service

router = APIRouter()


@router.get(
    "/",
    response_model=BaseResponse[OrganisationResponse],
    description="Get organisation by ID",
)
@router.get(
    "/detail",
    response_model=BaseResponse[OrganisationResponse],
    description="Get organisation by ID (slash-safe)",
)
@format_response(
    response_model=OrganisationResponse, message="Organisation retrieved successfully"
)
async def get_organisation(
    organisation_id: str, current_user=Depends(get_current_user)
) -> OrganisationResponse:
    """
    Get organisation by ID
    """
    try:
        organisation = await organisation_service.get_organisation(organisation_id)
        return organisation
    except Exception as e:
        raise e


@router.post(
    "",
    response_model=BaseResponse[OrganisationResponse],
    description="Create a new organisation",
)
@format_response(
    response_model=OrganisationResponse, message="Organisation created successfully"
)
async def create_organisation(
    organisation: OrganisationCreate, current_user=Depends(get_current_user)
) -> OrganisationResponse:
    """
    Create a new organisation
    """
    try:
        organisation = await organisation_service.create_organisation(
            organisation.model_dump(), current_user
        )
        return organisation
    except Exception as e:
        raise e


@router.put(
    "/",
    response_model=BaseResponse[OrganisationResponse],
    description="Update an existing organisation",
)
@format_response(
    response_model=OrganisationResponse, message="Organisation updated successfully"
)
async def update_organisation(
    organisation_id: str,
    organisation: OrganisationUpdate,
    current_user=Depends(get_current_user),
) -> OrganisationResponse:
    """
    Update an existing organisation
    """
    try:
        organisation = await organisation_service.update_organisation(
            organisation_id, organisation.model_dump(), current_user
        )
        return organisation
    except Exception as e:
        raise e


@router.delete(
    "/",
    response_model=BaseResponse[OrganisationResponse],
    description="Delete an existing organisation",
)
@format_response(
    response_model=OrganisationResponse, message="Organisation deleted successfully"
)
async def delete_organisation(
    organisation_id: str, current_user=Depends(get_current_user)
) -> OrganisationResponse:
    """
    Delete an existing organisation
    """
    try:
        organisation = await organisation_service.delete_organisation(
            organisation_id, current_user
        )
        return organisation
    except Exception as e:
        raise e


@router.get(
    "",
    response_model=BaseResponse[PaginationResponse[OrganisationListResponse]],
    description="Get all organisations",
)
@format_response(
    response_model=PaginationResponse[OrganisationListResponse],
    message="Organisations retrieved successfully",
)
async def get_organisations(
    params: OrganisationFilterParams = Depends(),
    current_user=Depends(get_current_user),
) -> PaginationResponse[OrganisationListResponse]:
    """
    Get all organisations
    """
    try:
        result = await organisation_service.get_all_organisations(params)
        return PaginationResponse(
            items=[OrganisationListResponse(**item) for item in result["items"]],
            total=result["total"],
            page=result["page"],
            limit=result["limit"],
            pages=result["pages"],
            has_next=result["has_next"],
            has_prev=result["has_prev"],
        )
    except Exception as e:
        raise e
