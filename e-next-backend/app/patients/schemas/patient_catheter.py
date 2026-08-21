from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.investigation_reports.enums import CatheterCategoryType, CatheterType
from app.patients.enums import CatheterSource


class PatientCatheterBase(BaseModel):
    """Base patient catheter schema with common fields"""

    patient_id: str = Field(..., description="The ID of the patient")
    type: CatheterType = Field(..., description="Type of catheter")
    catheter_type: CatheterCategoryType = Field(..., description="Category type of catheter (Type1 or Type2)")
    size: Optional[float] = Field(default=None, description="Size of the catheter")
    site: Optional[str] = Field(default=None, description="Insertion site of the catheter")
    date_of_insertion: Optional[datetime] = Field(
        default=None, description="Date when catheter was inserted"
    )
    source: CatheterSource = Field(
        default=CatheterSource.INSIDE_ICU,
        description="Whether the catheter was inserted inside ICU or brought from outside",
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


class PatientCatheterCreate(PatientCatheterBase):
    """Schema for creating a new patient catheter"""

    pass


class PatientCatheterUpdate(BaseModel):
    """Schema for updating a patient catheter"""

    type: Optional[CatheterType] = Field(default=None, description="Type of catheter")
    catheter_type: Optional[CatheterCategoryType] = Field(default=None, description="Category type of catheter (Type1 or Type2)")
    size: Optional[float] = Field(default=None, description="Size of the catheter")
    site: Optional[str] = Field(default=None, description="Insertion site of the catheter")
    date_of_insertion: Optional[datetime] = Field(
        default=None, description="Date when catheter was inserted"
    )
    source: Optional[CatheterSource] = Field(
        default=None,
        description="Whether the catheter was inserted inside ICU or brought from outside",
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


class PatientCatheterResponse(PatientCatheterBase):
    """Schema for patient catheter response"""

    id: str
    organisation_id: str
    is_active: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: str
    created_by_profile: str
    updated_by_profile: str

    class Config:
        from_attributes = True


class PatientCatheterListResponse(BaseModel):
    """Schema for patient catheter list response"""

    catheters: List[PatientCatheterResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int


class PatientCatheterBulkCreateRequest(BaseModel):
    """Schema for bulk creating patient catheters"""

    catheters: List[PatientCatheterCreate] = Field(
        ..., description="List of catheters to create"
    )


class PatientCatheterBulkCreateResponse(BaseModel):
    """Schema for bulk create response"""

    created_count: int
    failed_count: int
    created_catheters: List[PatientCatheterResponse]
    errors: List[str] = Field(default_factory=list)
