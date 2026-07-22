from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class OrganisationMemberBase(BaseModel):
    """Base organisation member schema with common fields"""

    organisation_id: str = Field(..., description="Organisation ID")
    user_id: str = Field(..., description="User ID")

    class Config:
        from_attributes = True
        use_enum_values = True


class OrganisationMemberCreate(OrganisationMemberBase):
    """Schema for creating a new organisation member"""

    pass


class OrganisationMemberResponse(OrganisationMemberBase):
    """Schema for organisation member response"""

    id: str
    created_at: datetime
    updated_at: datetime


class OrganisationMemberUpdate(BaseModel):
    """Schema for updating an existing organisation member"""

    organisation_id: Optional[str] = None
    user_id: Optional[str] = None
