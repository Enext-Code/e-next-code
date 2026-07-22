from app.base.models import (AuthenticationError, BaseResponse, ErrorResponse,
                             NotFoundError)
from app.utils import format_response
from fastapi import APIRouter, Depends
from ....schemas import ProfileResponse
from ....services import ProfileService
from ..dependencies import get_current_user
from fastapi.security import HTTPBearer

router = APIRouter()

# Create security scheme
security = HTTPBearer(
    scheme_name="Bearer Auth", description="Enter your Bearer token", auto_error=True
)


@router.get(
    "/",
    response_model=BaseResponse[ProfileResponse],
    responses={
        200: {
            "model": BaseResponse[ProfileResponse],
            "description": "Successfully retrieved profile",
        },
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "Profile not found"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(
    response_model=ProfileResponse, message="Profile retrieved successfully"
)
async def get_profile(
    profile_id: str, current_user=Depends(get_current_user)
) -> ProfileResponse:
    """
    Get profile by ID

    Requires authentication using Bearer token
    """
    try:
        profile, user_data = await ProfileService.get_profile_with_user(profile_id)
        return ProfileResponse(
            id=profile.id,
            username=user_data["username"],
            user_type=profile.user_type,
            first_name=profile.first_name,
            last_name=profile.last_name,
            full_name=profile.full_name,
            email=user_data["email"],
            country_code=user_data["country_code"],
            mobile_number=user_data["mobile_number"],
            full_mobile_number=user_data["full_mobile_number"],
            gender=profile.gender,
            date_of_birth=profile.date_of_birth,
            language=profile.language,
            is_active=profile.is_active,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )
    except NotFoundError as e:
        raise e
    except AuthenticationError as e:
        raise e
