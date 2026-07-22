from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.base.models import DateRangeFilter, StatusFilter
from app.investigation_reports.enums import CatheterCategoryType, CatheterType


class PatientCatheterFilterParams(StatusFilter, DateRangeFilter):
    """Filter parameters for patient catheters"""

    patient_id: Optional[str] = Field(default=None, description="Filter by patient ID")
    type: Optional[CatheterType] = Field(default=None, description="Filter by catheter type")
    catheter_type: Optional[CatheterCategoryType] = Field(default=None, description="Filter by catheter category type (Type1 or Type2)")
    site: Optional[str] = Field(default=None, description="Filter by insertion site")
    inserted_by: Optional[str] = Field(
        default=None, description="Filter by person who inserted the catheter"
    )
    removed_by: Optional[str] = Field(
        default=None, description="Filter by person who removed the catheter"
    )
    is_active_catheter: Optional[bool] = Field(
        default=None, description="Filter by active catheters (inserted but not removed)"
    )
    insertion_date_from: Optional[datetime] = Field(
        default=None, description="Filter by insertion date from"
    )
    insertion_date_to: Optional[datetime] = Field(
        default=None, description="Filter by insertion date to"
    )
    removal_date_from: Optional[datetime] = Field(
        default=None, description="Filter by removal date from"
    )
    removal_date_to: Optional[datetime] = Field(
        default=None, description="Filter by removal date to"
    )
    days_in_use_min: Optional[int] = Field(
        default=None, description="Minimum days in use"
    )
    days_in_use_max: Optional[int] = Field(
        default=None, description="Maximum days in use"
    )
