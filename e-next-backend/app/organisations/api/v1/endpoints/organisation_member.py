from typing import List

from fastapi import APIRouter, Depends

from app.accounts.api.v1 import (get_current_user,
                                 validate_organisation_access,
                                 validate_resource_access)
from app.base.models import BaseResponse, PaginationResponse
from app.utils import format_response

from ....filters import OrganisationMemberFilterParams
from ....models import OrganisationMember
from ....schemas import (OrganisationMemberCreate, OrganisationMemberResponse,
                         OrganisationMemberUpdate, OrganisationResponse)
from ....services import organisation_member_service

router = APIRouter()


@router.get(
    "/",
    response_model=BaseResponse[OrganisationMemberResponse],
    description="Get organisation member by ID",
)
@format_response(
    response_model=OrganisationMemberResponse,
    message="Organisation member retrieved successfully",
)
async def get_organisation_member(
    organisation_member_id: str, current_user=Depends(get_current_user)
) -> OrganisationMemberResponse:
    """Get organisation member by ID"""
    try:
        await validate_resource_access(
            field_name="_id",
            field_value=organisation_member_id,
            model_class=OrganisationMember,
            current_user=current_user,
        )
        organisation_member = await organisation_member_service.get_organisation_member(
            organisation_member_id
        )
        return organisation_member
    except Exception as e:
        raise e


@router.post(
    "",
    response_model=BaseResponse[OrganisationMemberResponse],
    description="Create a new organisation member",
)
@format_response(
    response_model=OrganisationMemberResponse,
    message="Organisation member created successfully",
)
async def create_organisation_member(
    organisation_member: OrganisationMemberCreate,
    current_user=Depends(get_current_user),
) -> OrganisationMemberResponse:
    """Create a new organisation member"""
    try:
        organisation_member = (
            await organisation_member_service.create_organisation_member(
                organisation_member.model_dump(), current_user
            )
        )
        return organisation_member
    except Exception as e:
        raise e


@router.put(
    "",
    response_model=BaseResponse[OrganisationMemberResponse],
    description="Update an existing organisation member",
)
@format_response(
    response_model=OrganisationMemberResponse,
    message="Organisation member updated successfully",
)
async def update_organisation_member(
    organisation_member_id: str,
    organisation_member: OrganisationMemberUpdate,
    current_user=Depends(get_current_user),
) -> OrganisationMemberResponse:
    """Update an existing organisation member"""
    try:
        organisation_member = (
            await organisation_member_service.update_organisation_member(
                organisation_member_id, organisation_member.model_dump(), current_user
            )
        )
        return organisation_member
    except Exception as e:
        raise e


@router.delete(
    "",
    response_model=BaseResponse[OrganisationMemberResponse],
    description="Delete an existing organisation member",
)
@format_response(
    response_model=OrganisationMemberResponse,
    message="Organisation member deleted successfully",
)
async def delete_organisation_member(
    organisation_member_id: str, current_user=Depends(get_current_user)
) -> OrganisationMemberResponse:
    """Delete an existing organisation member"""
    try:
        organisation_member = (
            await organisation_member_service.delete_organisation_member(
                organisation_member_id, current_user
            )
        )
        return organisation_member
    except Exception as e:
        raise e


@router.get(
    "",
    response_model=BaseResponse[PaginationResponse[OrganisationMemberResponse]],
    description="Get all organisation members",
)
@format_response(
    response_model=PaginationResponse[OrganisationMemberResponse],
    message="Organisation members retrieved successfully",
)
async def get_organisation_members(
    params: OrganisationMemberFilterParams = Depends(),
    current_user=Depends(get_current_user),
) -> PaginationResponse[OrganisationMemberResponse]:
    """Get all organisation members"""
    try:
        result = await organisation_member_service.get_all_organisation_members(
            params, current_user
        )
        return PaginationResponse(
            items=result["items"],
            total=result["total"],
            page=result["page"],
            limit=result["limit"],
            pages=result["pages"],
            has_next=result["has_next"],
            has_prev=result["has_prev"],
        )
    except Exception as e:
        raise e


@router.get(
    "/user/{user_id}",
    response_model=BaseResponse[List[OrganisationResponse]],
    description="Get all organisations by user ID",
)
@format_response(
    response_model=List[OrganisationResponse],
    message="Organisations retrieved successfully",
)
async def get_organisations_by_user_id(
    user_id: str, current_user=Depends(get_current_user)
) -> List[OrganisationMemberResponse]:
    """Get all organisations by user ID"""
    try:
        organisations = await organisation_member_service.get_organisations_by_user_id(
            user_id
        )
        return organisations
    except Exception as e:
        raise e
