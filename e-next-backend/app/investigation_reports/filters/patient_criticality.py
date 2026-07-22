from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PatientCriticalityFilterParams(BaseModel):
    """Patient Criticality Filter Parameters"""

    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(10, ge=1, le=100, description="Number of items per page")
    patient_id: Optional[str] = Field(None, description="Filter by patient ID")
    organisation_id: Optional[str] = None
    from_date: Optional[datetime] = Field(None, description="Filter from date")
    to_date: Optional[datetime] = Field(None, description="Filter to date")
    sort_by: Optional[str] = Field(None, description="Sort by field")
    sort_order: Optional[str] = Field("desc", description="Sort order (asc/desc)")
