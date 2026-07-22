from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class OrganisationICUBase(BaseModel):
    """Base organisation ICU schema with common fields"""

    organisation_id: str = Field(..., description="Organisation ID")
    name: str = Field(..., description="Name of the organisation ICU")

    class Config:
        from_attributes = True
        use_enum_values = True


class OrganisationICUWithBedsCreate(BaseModel):
    """Base organisation ICU schema with common fields"""

    organisation_id: str = Field(..., description="Organisation ID")
    name: str = Field(..., description="Name of the organisation ICU")
    total_beds: int = Field(..., description="Total number of beds to create", gt=0)

    class Config:
        from_attributes = True
        use_enum_values = True


class OrganisationICUCreate(OrganisationICUBase):
    """Schema for creating a new organisation ICU"""

    pass


class OrganisationICUResponse(OrganisationICUBase):
    """Schema for organisation ICU response"""

    id: str
    created_at: datetime
    updated_at: datetime
    total_beds: int = 0

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class OrganisationICUUpdate(BaseModel):
    """Schema for updating an existing organisation ICU"""

    organisation_id: Optional[str] = None
    name: Optional[str] = None
