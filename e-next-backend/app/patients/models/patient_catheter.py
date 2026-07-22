from datetime import datetime, timezone
from typing import Optional

from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin, OrganisationMixin,
                             StatusMixin, TimestampMixin)
from app.investigation_reports.enums import CatheterCategoryType, CatheterType


class PatientCatheter(
    BaseSchema, AuditMixin, IDMixin, OrganisationMixin, StatusMixin, TimestampMixin
):
    """Patient Catheter - Independent catheter management for patients"""

    patient_id: str = Field(..., description="The ID of the patient")
    type: CatheterType = Field(..., description="Type of catheter")
    catheter_type: CatheterCategoryType = Field(..., description="Category type of catheter (Type1 or Type2)")
    size: Optional[float] = Field(default=None, description="Size of the catheter")
    site: Optional[str] = Field(default=None, description="Insertion site of the catheter")
    date_of_insertion: Optional[datetime] = Field(
        default=None, description="Date when catheter was inserted"
    )
    date_of_removal: Optional[datetime] = Field(
        default=None, description="Date when catheter was removed"
    )
    days_in_use: Optional[int] = Field(
        default=None, description="Number of days catheter was in use"
    )
    notes: Optional[str] = Field(default=None, description="Additional notes about the catheter")
    inserted_by: Optional[str] = Field(
        default=None, description="ID of the person who inserted the catheter"
    )
    removed_by: Optional[str] = Field(
        default=None, description="ID of the person who removed the catheter"
    )

    class Settings:
        """Pydantic settings"""

        collection = "patient_catheters"
        indexes = [
            [("patient_id", 1), ("date_of_insertion", -1)],
            [("organisation_id", 1), ("created_at", -1)],
            [("type", 1), ("is_active", 1)],
            [("is_active", 1), ("is_deleted", 1)],
            [("date_of_insertion", -1)],
            [("date_of_removal", -1)],
        ]

    def calculate_days_in_use(self) -> Optional[int]:
        """Calculate days in use based on insertion and removal dates"""
        if not self.date_of_insertion:
            return None
        
        removal_date = self.date_of_removal or datetime.now(timezone.utc)
        
        # Ensure both datetimes are timezone-aware
        insertion_date = self.date_of_insertion
        if insertion_date.tzinfo is None:
            insertion_date = insertion_date.replace(tzinfo=timezone.utc)
        if removal_date.tzinfo is None:
            removal_date = removal_date.replace(tzinfo=timezone.utc)
        
        delta = removal_date - insertion_date
        return delta.days

    def is_active_catheter(self) -> bool:
        """Check if catheter is currently active (inserted but not removed)"""
        return (
            self.date_of_insertion is not None 
            and self.date_of_removal is None 
            and self.is_active 
            and not self.is_deleted
        )
