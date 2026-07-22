from typing import List

from fastapi import APIRouter, Depends

from app.accounts.api.v1 import get_current_user
from app.base.models import BaseResponse, PaginationResponse
from app.utils import format_response

from ....filters import OrganisationICUBedFilterParams
from ....schemas import (OrganisationICUBedCreate, OrganisationICUBedResponse,
                         OrganisationICUBedUpdate)
from ....services import organisation_icu_bed_service

router = APIRouter()


@router.get(
    "/",
    response_model=BaseResponse[OrganisationICUBedResponse],
    description="Get organisation ICU bed by ID",
)
@format_response(
    response_model=OrganisationICUBedResponse,
    message="Organisation ICU bed retrieved successfully",
)
async def get_organisation_icu_bed(
    organisation_icu_bed_id: str, current_user=Depends(get_current_user)
) -> OrganisationICUBedResponse:
    """Get organisation ICU bed by ID"""
    try:
        organisation_icu_bed = (
            await organisation_icu_bed_service.get_organisation_icu_bed(
                organisation_icu_bed_id
            )
        )
        return organisation_icu_bed
    except Exception as e:
        raise e


@router.get(
    "",
    response_model=BaseResponse[PaginationResponse[OrganisationICUBedResponse]],
    description="Get all organisation ICU beds",
)
@format_response(
    response_model=PaginationResponse[OrganisationICUBedResponse],
    message="Organisation ICU beds retrieved successfully",
)
async def get_organisation_icu_beds(
    params: OrganisationICUBedFilterParams = Depends(),
    current_user=Depends(get_current_user),
) -> PaginationResponse[OrganisationICUBedResponse]:
    """Get all organisation ICU beds"""
    try:
        organisation_icu_beds = (
            await organisation_icu_bed_service.get_organisation_icu_beds(params)
        )
        return organisation_icu_beds
    except Exception as e:
        raise e


@router.post(
    "",
    response_model=BaseResponse[OrganisationICUBedResponse],
    description="Create a new organisation ICU bed",
)
@format_response(
    response_model=OrganisationICUBedResponse,
    message="Organisation ICU bed created successfully",
)
async def create_organisation_icu_bed(
    organisation_icu_bed: OrganisationICUBedCreate,
    current_user=Depends(get_current_user),
) -> OrganisationICUBedResponse:
    """Create a new organisation ICU bed"""
    try:
        organisation_icu_bed = (
            await organisation_icu_bed_service.create_organisation_icu_bed(
                organisation_icu_bed.model_dump(), current_user
            )
        )
        return organisation_icu_bed
    except Exception as e:
        raise e


@router.put(
    "",
    response_model=BaseResponse[OrganisationICUBedResponse],
    description="Update an existing organisation ICU bed",
)
@format_response(
    response_model=OrganisationICUBedResponse,
    message="Organisation ICU bed updated successfully",
)
async def update_organisation_icu_bed(
    organisation_icu_bed_id: str,
    organisation_icu_bed: OrganisationICUBedUpdate,
    current_user=Depends(get_current_user),
) -> OrganisationICUBedResponse:
    """Update an existing organisation ICU bed"""
    try:
        organisation_icu_bed = (
            await organisation_icu_bed_service.update_organisation_icu_bed(
                organisation_icu_bed_id, organisation_icu_bed.model_dump(), current_user
            )
        )
        return organisation_icu_bed
    except Exception as e:
        raise e


@router.delete(
    "",
    response_model=BaseResponse[OrganisationICUBedResponse],
    description="Delete an existing organisation ICU bed",
)
@format_response(
    response_model=OrganisationICUBedResponse,
    message="Organisation ICU bed deleted successfully",
)
async def delete_organisation_icu_bed(
    organisation_icu_bed_id: str, current_user=Depends(get_current_user)
) -> OrganisationICUBedResponse:
    """Delete an existing organisation ICU bed"""
    try:
        organisation_icu_bed = (
            await organisation_icu_bed_service.delete_organisation_icu_bed(
                organisation_icu_bed_id, current_user
            )
        )
        return organisation_icu_bed
    except Exception as e:
        raise e


@router.get(
    "/available-beds",
    response_model=BaseResponse[List[OrganisationICUBedResponse]],
    description="Get available beds",
)
@format_response(
    response_model=List[OrganisationICUBedResponse],
    message="Available beds retrieved successfully",
)
async def get_available_beds(
    organisation_icu_id: str,
    current_user=Depends(get_current_user),
) -> List[OrganisationICUBedResponse]:
    """Get available beds"""
    try:
        organisation_icu_bed = await organisation_icu_bed_service.get_available_beds(
            organisation_icu_id
        )
        return organisation_icu_bed
    except Exception as e:
        raise e
