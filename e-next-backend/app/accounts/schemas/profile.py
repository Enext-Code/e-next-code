from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from ..enums import Gender, Language, UserType


class ProfileBase(BaseModel):
    """Base profile schema with common fields"""

    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    country_code: str = Field(..., description="Phone country code (e.g., +91)")
    mobile_number: str = Field(..., min_length=10, max_length=15)
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    designation: Optional[str] = Field(None, max_length=100, description="Job title or designation")
    role_type: Optional[str] = Field(None, max_length=100, description="Role or position type")
    language: Optional[Language] = None

    class Config:
        from_attributes = True
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "first_name": "John",
                "last_name": "Doe",
                "email": "john.doe@example.com",
                "country_code": "+91",
                "mobile_number": "9876543210",
                "gender": "male",
                "date_of_birth": "1990-01-01",
                "designation": "Senior Developer",
                "role_type": "Technical Lead",
                "language": "en",
            }
        }


class ProfileCreate(ProfileBase):
    """Schema for creating a new profile"""

    user_type: UserType = Field(..., description="Type of user")


class ProfileUpdate(BaseModel):
    """Schema for updating an existing profile"""

    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    email: Optional[EmailStr] = None
    country_code: Optional[str] = Field(
        None, description="Phone country code (e.g., +91)"
    )
    mobile_number: Optional[str] = Field(None, min_length=10, max_length=15)
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    designation: Optional[str] = Field(None, max_length=100, description="Job title or designation")
    role_type: Optional[str] = Field(None, max_length=100, description="Role or position type")
    language: Optional[Language] = None

    class Config:
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "first_name": "John",
                "last_name": "Doe",
                "email": "john.doe@example.com",
                "country_code": "+91",
                "mobile_number": "9876543210",
                "gender": "male",
                "date_of_birth": "1990-01-01",
                "designation": "Senior Developer",
                "role_type": "Technical Lead",
                "language": "en",
            }
        }


class ProfileResponse(BaseModel):
    """Schema for profile response"""

    id: str
    username: Optional[str] = None
    user_type: UserType
    first_name: str
    last_name: str
    full_name: str
    email: EmailStr
    country_code: str
    mobile_number: str
    full_mobile_number: str
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    designation: Optional[str] = None
    role_type: Optional[str] = None
    language: Optional[Language] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "username": "KLH7694332",
                "user_type": "user",
                "first_name": "John",
                "full_name": "John Doe",
                "last_name": "Doe",
                "email": "john.doe@example.com",
                "country_code": "+91",
                "mobile_number": "9876543210",
                "full_mobile_number": "+919876543210",
                "gender": "male",
                "date_of_birth": "1990-01-01",
                "designation": "Senior Developer",
                "role_type": "Technical Lead",
                "language": "en",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            }
        }


class ProfileList(BaseModel):
    """Schema for list of profiles"""

    total: int
    items: List[ProfileResponse]

    class Config:
        json_schema_extra = {
            "example": {
                "total": 1,
                "items": [
                    {
                        "id": "507f1f77bcf86cd799439011",
                        "user_id": "507f1f77bcf86cd799439012",
                        "user_type": "user",
                        "first_name": "John",
                        "last_name": "Doe",
                        "email": "john.doe@example.com",
                        "country_code": "+91",
                        "mobile_number": "9876543210",
                        "gender": "male",
                        "date_of_birth": "1990-01-01",
                        "designation": "Senior Developer",
                        "role_type": "Technical Lead",
                        "language": "en",
                        "is_active": True,
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z",
                    }
                ],
            }
        }


# Validators
def validate_mobile_number(v: str) -> str:
    """Validate mobile number format"""
    if not v.isdigit():
        raise ValueError("Mobile number must contain only digits")
    return v


def validate_country_code(v: str) -> str:
    """Validate country code format"""
    if not v.startswith("+"):
        raise ValueError("Country code must start with +")
    if not v[1:].isdigit():
        raise ValueError("Country code must contain only digits after +")
    return v


# Add validators to the schemas
for schema in [ProfileBase, ProfileUpdate]:
    schema.model_validators = {
        "mobile_number": validate_mobile_number,
        "country_code": validate_country_code,
    }
