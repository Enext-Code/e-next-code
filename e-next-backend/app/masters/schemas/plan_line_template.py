from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.base.models import PaginationParams


class PlanLineTemplateResponse(BaseModel):
    """Schema for plan line template response"""

    id: str
    field_type: str
    text: str
    usage_count: int
    created_at: datetime
    updated_at: datetime


class PlanLineTemplateFilterParams(PaginationParams):
    """Search params for plan line templates"""

    field_type: str = Field(..., description="Field to search, e.g. current_treatment")
    search: Optional[str] = Field(default=None, description="Current line text")
    limit: int = Field(default=8, ge=1, le=50)
