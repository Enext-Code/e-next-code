from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from ..enums import CountryCode, Gender, Language, UserType


class ProfileCreate(BaseModel):
    """Profile create schema"""

    first_name: str
    last_name: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    designation: Optional[str] = None
    role_type: Optional[str] = None
    user_type: UserType
    avatar: Optional[str] = None
    signature: Optional[str] = None
    language: Optional[Language] = None
    theme: Optional[str] = "light"


class UserCreate(BaseModel):
    """User create schema"""

    email: EmailStr
    country_code: Optional[CountryCode] = None
    mobile_number: Optional[str] = None
    password: Optional[str] = None
    profile: ProfileCreate

    @field_validator("mobile_number", mode="before")
    @classmethod
    def empty_string_to_none_mobile(cls, v):
        """Convert empty string to None for mobile_number"""
        if v == "":
            return None
        return v

    @field_validator("country_code", mode="before")
    @classmethod
    def empty_string_to_none_country_code(cls, v):
        """Convert empty string to None for country_code"""
        if v == "":
            return None
        return v

    def model_dump(self, *args, **kwargs):
        """Dump the model"""
        data = super().model_dump(*args, **kwargs)
        if isinstance(data["profile"], dict):
            profile_data = data["profile"]
        else:
            profile_data = data["profile"].model_dump()
        data["profile"] = profile_data
        return data


class ProfileResponse(BaseModel):
    """Profile response schema"""

    id: str
    first_name: str
    last_name: Optional[str]
    full_name: Optional[str] = None
    user_type: UserType
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    designation: Optional[str] = None
    role_type: Optional[str] = None
    is_primary: bool
    avatar: Optional[str]
    signature: Optional[str] = None
    language: Optional[Language]
    theme: Optional[str]

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """User response schema"""

    id: str
    username: str
    email: EmailStr
    country_code: Optional[CountryCode] = None
    mobile_number: Optional[str] = None
    full_mobile_number: Optional[str] = None
    is_active: bool = True
    primary_profile: Optional[ProfileResponse] = None
    current_profile: Optional[ProfileResponse] = None
    profiles_count: Optional[int] = None
    current_organisation_id: Optional[str] = None

    class Config:
        from_attributes = True


class CreateProfileRequest(BaseModel):
    """Create additional profile request"""

    first_name: str
    last_name: Optional[str] = None
    user_type: UserType
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    designation: Optional[str] = None
    role_type: Optional[str] = None
    avatar: Optional[str] = None
    signature: Optional[str] = None
    language: Optional[Language] = None
    theme: Optional[str] = "light"


class SwitchProfileRequest(BaseModel):
    """Switch profile request"""

    profile_id: str


class ProfileUpdateData(BaseModel):
    """Profile update data within user update"""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    user_type: Optional[UserType] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    designation: Optional[str] = None
    role_type: Optional[str] = None
    avatar: Optional[str] = None
    signature: Optional[str] = None
    language: Optional[Language] = None
    theme: Optional[str] = None


class UserUpdate(BaseModel):
    """User update schema"""

    email: Optional[EmailStr] = None
    country_code: Optional[CountryCode] = None
    mobile_number: Optional[str] = None
    password: Optional[str] = None
    profile: Optional[ProfileUpdateData] = None

    class Config:
        from_attributes = True
