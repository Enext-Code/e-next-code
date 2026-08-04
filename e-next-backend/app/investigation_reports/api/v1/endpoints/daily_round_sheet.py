from fastapi import APIRouter, Depends, Query

from app.accounts.api.v1 import (get_current_user,
                                 validate_organisation_access,
                                 validate_resource_access)
from app.base.models import BaseResponse, PaginationResponse
from app.utils import format_response

from ....filters import DailyRoundSheetFilterParams
from ....models import DailyRoundSheet
from ....schemas import (DailyRoundSheetCreateSchema,
                         DailyRoundSheetResponseSchema,
                         DailyRoundSheetUpdateSchema)
from ....services import daily_round_sheet_service

router = APIRouter()


async def _get_daily_round_sheet_by_id(
    sheet_id: str,
    current_user: dict,
) -> DailyRoundSheetResponseSchema:
    await validate_resource_access(
        field_name="sheet_id",
        field_value=sheet_id,
        model_class=DailyRoundSheet,
        current_user=current_user,
    )
    return await daily_round_sheet_service.get_daily_round_sheet(sheet_id)


@router.get(
    "",
    response_model=BaseResponse[DailyRoundSheetResponseSchema],
    description="Get daily round sheet by ID",
)
@router.get(
    "/",
    response_model=BaseResponse[DailyRoundSheetResponseSchema],
    description="Get daily round sheet by ID",
    include_in_schema=False,
)
@format_response(
    response_model=DailyRoundSheetResponseSchema,
    message="Daily round sheet retrieved successfully",
)
async def get_daily_round_sheet_by_id(
    sheet_id: str = Query(..., description="Daily round sheet ID"),
    current_user=Depends(get_current_user),
) -> DailyRoundSheetResponseSchema:
    """
    Get daily round sheet by ID
    """
    try:
        return await _get_daily_round_sheet_by_id(sheet_id, current_user)
    except Exception as e:
        raise e


@router.get(
    "/list",
    response_model=BaseResponse[PaginationResponse[DailyRoundSheetResponseSchema]],
    description="Get daily round sheets",
)
@format_response(
    response_model=PaginationResponse[DailyRoundSheetResponseSchema],
    message="Daily round sheets retrieved successfully",
)
async def get_daily_round_sheets(
    params: DailyRoundSheetFilterParams = Depends(),
    current_user=Depends(get_current_user),
) -> PaginationResponse[DailyRoundSheetResponseSchema]:
    """
    Get daily round sheets
    """
    try:
        daily_round_sheets = await daily_round_sheet_service.get_daily_round_sheets(
            params, current_user
        )
        return daily_round_sheets
    except Exception as e:
        raise e


@router.post(
    "",
    response_model=BaseResponse[DailyRoundSheetResponseSchema],
    description="Create daily round sheet",
)
@format_response(
    response_model=DailyRoundSheetResponseSchema,
    message="Daily round sheet created successfully",
)
async def create_daily_round_sheet(
    daily_round_sheet: DailyRoundSheetCreateSchema,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> DailyRoundSheetResponseSchema:
    """
    Create daily round sheet
    """
    try:
        daily_round_sheet_data = daily_round_sheet.model_dump()
        daily_round_sheet_data["organisation_id"] = organisation_id
        daily_round_sheet = await daily_round_sheet_service.create_daily_round_sheet(
            daily_round_sheet_data, current_user
        )
        return daily_round_sheet
    except Exception as e:
        raise e


@router.put(
    "",
    response_model=BaseResponse[DailyRoundSheetResponseSchema],
    description="Update daily round sheet",
)
@format_response(
    response_model=DailyRoundSheetResponseSchema,
    message="Daily round sheet updated successfully",
)
async def update_daily_round_sheet(
    sheet_id: str,
    daily_round_sheet: DailyRoundSheetUpdateSchema,
    current_user=Depends(get_current_user),
) -> DailyRoundSheetResponseSchema:
    """
    Update daily round sheet
    """
    try:
        await validate_resource_access(
            field_name="sheet_id",
            field_value=sheet_id,
            model_class=DailyRoundSheet,
            current_user=current_user,
        )
        daily_round_sheet = await daily_round_sheet_service.update_daily_round_sheet(
            sheet_id, daily_round_sheet.model_dump(), current_user
        )
        return daily_round_sheet
    except Exception as e:
        raise e
