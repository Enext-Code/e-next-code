from pydantic import BaseModel

from ..enums import UserType


class LoginRequest(BaseModel):
    """Login request"""

    username: str
    password: str


class TokenResponse(BaseModel):
    """Token response"""

    access_token: str
    refresh_token: str
    expires_in: int
    user_type: UserType
    profile_id: str
    current_organisation_id: str

    class Config:
        """Config"""

        from_attributes = True


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""

    refresh_token: str


class TokenData(BaseModel):
    """Token data"""

    user_id: str
    user_type: UserType
    profile_id: str
    current_organisation_id: str


class LogoutResponse(BaseModel):
    """Logout response"""

    success: bool
    message: str
