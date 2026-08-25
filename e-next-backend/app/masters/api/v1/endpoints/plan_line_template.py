from fastapi import APIRouter, Depends

from app.accounts.api.v1 import get_current_user
from app.base.models import BaseResponse, PaginationResponse
from app.utils import format_response

from ....schemas import PlanLineTemplateFilterParams, PlanLineTemplateResponse
from ....services import plan_line_template_service

router = APIRouter()


@router.get(
    "",
    response_model=BaseResponse[PaginationResponse[PlanLineTemplateResponse]],
    description="Search shared plan line templates",
)
@router.get(
    "/",
    response_model=BaseResponse[PaginationResponse[PlanLineTemplateResponse]],
    description="Search shared plan line templates",
    include_in_schema=False,
)
@format_response(
    response_model=PaginationResponse[PlanLineTemplateResponse],
    message="Plan line templates retrieved successfully",
)
async def search_plan_line_templates(
    params: PlanLineTemplateFilterParams = Depends(),
    current_user=Depends(get_current_user),
) -> PaginationResponse[PlanLineTemplateResponse]:
    """Search shared daily-round line templates."""
    try:
        return await plan_line_template_service.search_templates(params)
    except Exception as e:
        raise e
