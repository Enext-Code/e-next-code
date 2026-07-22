from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.base.models import BaseResponse


class StaffCount(BaseModel):
    """Staff count by type"""
    total_doctors: int = Field(..., description="Total number of doctors")
    total_nurses: int = Field(..., description="Total number of nurses")
    total_staff: int = Field(..., description="Total number of staff")


class PatientCount(BaseModel):
    """Patient count by status"""
    total_patients: int = Field(..., description="Total number of patients")
    active_patients: int = Field(..., description="Number of active patients")
    new_admissions_today: int = Field(..., description="Number of new admissions today")
    discharged_today: int = Field(..., description="Number of patients discharged today")
    discharged_patients: int = Field(..., description="Total number of discharged patients")
    inactive_patients: int = Field(..., description="Number of inactive patients")
    orphan_patients: int = Field(..., description="Number of orphan patients")


class RemoteCenterStats(BaseModel):
    """Statistics for a remote center"""
    center_id: str = Field(..., description="Remote center ID")
    center_name: str = Field(..., description="Remote center name")
    total_patients: int = Field(..., description="Total patients in this center")
    active_patients: int = Field(..., description="Active patients in this center")
    total_staff: int = Field(..., description="Total staff in this center")
    doctors: int = Field(..., description="Number of doctors in this center")
    nurses: int = Field(..., description="Number of nurses in this center")
    occupied_beds: int = Field(..., description="Number of occupied beds")
    total_beds: int = Field(..., description="Total number of beds")


class DashboardStats(BaseModel):
    """Main dashboard statistics"""
    staff_count: StaffCount = Field(..., description="Staff count statistics")
    patient_count: PatientCount = Field(..., description="Patient count statistics")
    remote_centers: List[RemoteCenterStats] = Field(..., description="Remote center statistics")
    last_updated: datetime = Field(..., description="Last updated timestamp")


class DashboardResponse(BaseModel):
    """Dashboard API response"""
    stats: DashboardStats = Field(..., description="Dashboard statistics")
    generated_at: datetime = Field(..., description="Response generation timestamp")


class RemoteCenterDropdown(BaseModel):
    """Remote center dropdown item"""
    center_id: str = Field(..., description="Remote center ID")
    center_name: str = Field(..., description="Remote center name")
    organisation_id: str = Field(..., description="Organisation ID")
    patient_count: int = Field(..., description="Number of patients in this center")
    staff_count: int = Field(..., description="Number of staff in this center")


class StaffDropdown(BaseModel):
    """Staff dropdown item"""
    user_id: str = Field(..., description="User ID")
    profile_id: str = Field(..., description="Profile ID")
    name: str = Field(..., description="Staff member name")
    user_type: str = Field(..., description="User type (doctor/nurse)")
    organisation_id: str = Field(..., description="Organisation ID")


class PatientDropdown(BaseModel):
    """Patient dropdown item"""
    patient_id: str = Field(..., description="Patient ID")
    unique_id: str = Field(..., description="Patient unique ID")
    name: str = Field(..., description="Patient name")
    age: int = Field(..., description="Patient age")
    gender: str = Field(..., description="Patient gender")
    status: str = Field(..., description="Patient status")
    admission_date: date = Field(..., description="Admission date")
    centre_name: str = Field(..., description="Remote center name")


class DropdownData(BaseModel):
    """Dropdown data for dashboard"""
    remote_centers: List[RemoteCenterDropdown] = Field(..., description="Remote centers dropdown")
    staff: List[StaffDropdown] = Field(..., description="Staff dropdown")
    patients: List[PatientDropdown] = Field(..., description="Patients dropdown")


class DropdownResponse(BaseModel):
    """Dropdown API response"""
    data: DropdownData = Field(..., description="Dropdown data")
    generated_at: datetime = Field(..., description="Response generation timestamp")


class DateFilterParams(BaseModel):
    """Date filter parameters"""
    start_date: Optional[date] = Field(default=None, description="Start date for filtering")
    end_date: Optional[date] = Field(default=None, description="End date for filtering")


class DetailedCounts(BaseModel):
    """Detailed counts with date filtering"""
    total_patients: int = Field(..., description="Total patients (current active + discharged in range + inactive in range + orphan in range)")
    active_patients: int = Field(..., description="Patients who were active during the date range (if filter applied, else currently active)")
    discharged_patients: int = Field(..., description="Patients discharged within date range based on status_change_datetime (if filter applied, else total)")
    inactive_patients: int = Field(..., description="Patients who became inactive within date range based on status_change_datetime (if filter applied, else total)")
    orphan_patients: int = Field(..., description="Patients who became orphan within date range based on status_change_datetime (if filter applied, else total)")
    new_admissions: int = Field(..., description="Patients admitted within date range (if filter applied, else today's admissions)")
    total_doctors: int = Field(..., description="Total number of doctors")
    total_nurses: int = Field(..., description="Total number of nurses")
    total_staff: int = Field(..., description="Total number of staff")
    remote_centers_count: int = Field(..., description="Number of remote centers")
    occupied_beds: int = Field(..., description="Total occupied beds")
    total_beds: int = Field(..., description="Total available beds")
    bed_occupancy_rate: float = Field(..., description="Bed occupancy rate percentage")
    date_range: Optional[str] = Field(default=None, description="Date range applied")


class DetailedCountsResponse(BaseModel):
    """Detailed counts API response"""
    counts: DetailedCounts = Field(..., description="Detailed counts")
    generated_at: datetime = Field(..., description="Response generation timestamp")
