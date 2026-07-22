from fastapi import APIRouter, Depends

from app.base.models import AuthenticationError, BaseResponse
from app.core import settings
from app.utils import format_response

from ....models import User
from ....schemas import (LoginRequest, LogoutResponse, RefreshTokenRequest,
                         TokenResponse)
from ....services import AuthService
from ..dependencies import get_current_token, get_current_user

router = APIRouter()


@router.post("/login", response_model=BaseResponse[TokenResponse])
@format_response(response_model=TokenResponse, message="User logged in successfully")
async def login(request: LoginRequest):
    """Login with username/email and password
    
    The username field accepts both username and email address.
    """
    try:
        # Authenticate user
        user = await AuthService.authenticate_user(
            username=request.username, password=request.password
        )

        # Generate tokens
        tokens = await AuthService.create_tokens(
            user_id=str(user.id),
            user_type=user.profile.user_type,
            profile_id=str(user.current_profile_id),
            organisation_id=str(user.current_organisation_id),
        )

        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_type=user.profile.user_type,
            profile_id=str(user.profile.id),
            current_organisation_id=str(user.current_organisation_id),
        )
    except Exception as e:
        raise AuthenticationError(
            message="Invalid credentials", error_code="INVALID_CREDENTIALS"
        )


@router.post("/refresh-token", response_model=BaseResponse[TokenResponse])
@format_response(response_model=TokenResponse, message="Token refreshed successfully")
async def refresh_token(request: RefreshTokenRequest) -> TokenResponse:
    """Generate new access token using refresh token"""
    try:
        # Verify and decode refresh token
        token_data = await AuthService.verify_refresh_token(request.refresh_token)

        # Generate new tokens
        tokens = await AuthService.create_tokens(
            user_id=token_data.user_id,
            user_type=token_data.user_type,
            profile_id=token_data.profile_id,
            organisation_id=token_data.current_organisation_id,
        )

        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_type=token_data.user_type,
            profile_id=token_data.profile_id,
            current_organisation_id=token_data.current_organisation_id,
        )
    except Exception as e:
        raise AuthenticationError(
            message="Invalid refresh token", error_code="INVALID_REFRESH_TOKEN"
        )


@router.post("/logout", response_model=BaseResponse[LogoutResponse])
@format_response(response_model=LogoutResponse, message="Logged out successfully")
async def logout(
    access_token: str = Depends(get_current_token),
    current_user: User = Depends(get_current_user),
):
    """Logout user by invalidating their token"""
    try:
        await AuthService.logout(access_token)
        return LogoutResponse(success=True, message="Logged out successfully")
    except Exception as e:
        raise AuthenticationError(message="Logout failed", error_code="LOGOUT_FAILED")
