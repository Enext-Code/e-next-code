from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class OrganisationBase(BaseModel):
    """Base organisation schema with common fields"""

    unique_id: str = Field(..., description="Unique ID of the organisation")
    name: str = Field(..., description="Name of the organisation")
    location: str = Field(..., description="Location of the organisation")

    class Config:
        from_attributes = True
        use_enum_values = True


class OrganisationCreate(OrganisationBase):
    """Schema for creating a new organisation"""

    pass


class OrganisationResponse(OrganisationBase):
    """Schema for organisation response"""

    id: str
    created_at: datetime
    updated_at: datetime


class OrganisationListResponse(OrganisationResponse):
    """Schema for organisation list response with additional counts"""

    active_patients_count: int = Field(default=0, description="Number of active patients in this organisation")
    total_beds_count: int = Field(default=0, description="Total number of beds in this organisation")


class OrganisationUpdate(BaseModel):
    """Schema for updating an existing organisation"""

    unique_id: Optional[str] = None
    name: Optional[str] = None
    location: Optional[str] = None
