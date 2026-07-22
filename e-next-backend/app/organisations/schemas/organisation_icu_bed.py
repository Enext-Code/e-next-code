from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class OrganisationICUBedBase(BaseModel):
    """Base organisation ICU bed schema with common fields"""

    organisation_icu_id: str = Field(..., description="Organisation ICU ID")
    bed_number: int = Field(..., description="Bed number")
    is_available: bool = Field(..., description="Is available")

    class Config:
        from_attributes = True
        use_enum_values = True


class OrganisationICUBedCreate(OrganisationICUBedBase):
    """Schema for creating a new organisation ICU bed"""

    pass


class OrganisationICUBedResponse(OrganisationICUBedBase):
    """Schema for organisation ICU bed response"""

    id: str
    created_at: datetime
    updated_at: datetime


class OrganisationICUBedUpdate(BaseModel):
    """Schema for updating an existing organisation ICU bed"""

    organisation_icu_id: Optional[str] = None
    bed_number: Optional[int] = None
    is_available: Optional[bool] = None
