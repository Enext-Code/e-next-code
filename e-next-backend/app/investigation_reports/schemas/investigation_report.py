from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from ..enums import InvestigationType, MicrobiologyParameter, RadiologyType
from ..models import (ArterialAnalysisData, BloodAnalysisData,
                      MicrobiologyData, RadiologyData)


# Base Schemas
class InvestigationValueSchema(BaseModel):
    """Schema for investigation value"""

    parameter: str
    value: Optional[Any] = None
    recorded_at: Optional[datetime] = None
    recorded_by: Optional[str] = None


# Request Schemas
class CreateInvestigationReportRequest(BaseModel):
    """Request to create a new investigation report"""

    patient_id: str = Field(..., description="Patient ID")
    analysis_date: datetime = Field(..., description="Date and time of analysis")
    organisation_id: Optional[str] = None


class UpdateBloodAnalysisRequest(BaseModel):
    """Request to update blood analysis data"""

    values: Optional[Dict[str, InvestigationValueSchema]] = Field(
        None, description="Blood analysis values to add/update"
    )
    # Alternative: Allow adding single values
    single_value: Optional[Dict[str, Any]] = Field(
        None,
        description="Single parameter update: {'parameter': 'Haemoglobin', 'value': 12.5, 'recorded_by': 'LAB001'}",
    )


class UpdateRadiologyRequest(BaseModel):
    """Request to update radiology data"""

    radiology_type: Optional[RadiologyType] = None
    subtype: Optional[str] = None
    file_keys: Optional[List[str]] = None
    number_of_images: Optional[int] = None
    reported_by: Optional[str] = None

    # Allow partial updates
    add_file_keys: Optional[List[str]] = Field(
        None, description="Add new file keys without replacing existing ones"
    )


class UpdateArterialAnalysisRequest(BaseModel):
    """Request to update arterial analysis data"""

    values: Optional[Dict[str, InvestigationValueSchema]] = Field(
        None, description="Arterial analysis values to add/update"
    )
    single_value: Optional[Dict[str, Any]] = Field(
        None, description="Single parameter update"
    )


class UpdateMicrobiologyRequest(BaseModel):
    """Request to update microbiology data"""

    values: Optional[Dict[str, InvestigationValueSchema]] = Field(
        None, description="Microbiology values to add/update"
    )
    single_value: Optional[Dict[str, Any]] = Field(
        None, description="Single parameter update"
    )


class UpdateInvestigationReportRequest(BaseModel):
    """Request to update investigation report"""

    blood_analysis: Optional[UpdateBloodAnalysisRequest] = None
    radiology: Optional[UpdateRadiologyRequest] = None
    arterial_analysis: Optional[UpdateArterialAnalysisRequest] = None
    microbiology: Optional[UpdateMicrobiologyRequest] = None

    # Allow updating analysis date if needed
    analysis_date: Optional[datetime] = None


class BulkAddBloodParametersRequest(BaseModel):
    """Request to add multiple blood parameters at once"""

    parameters: List[Dict[str, Any]] = Field(
        ...,
        description="List of parameters: [{'parameter': 'Haemoglobin', 'value': 12.5}, ...]",
    )
    recorded_by: Optional[str] = Field(
        None, description="Recorded by for all parameters"
    )
    organisation_id: Optional[str] = None


class BulkAddArterialParametersRequest(BaseModel):
    """Request to add multiple arterial parameters at once"""

    parameters: List[Dict[str, Any]] = Field(..., description="List of parameters")
    recorded_by: Optional[str] = None


# Response Schemas
class InvestigationReportSummaryResponse(BaseModel):
    """Summary response for investigation report"""

    id: str
    report_id: str
    patient_id: str
    analysis_date: datetime
    has_blood_analysis: bool = False
    has_radiology: bool = False
    has_arterial_analysis: bool = False
    has_microbiology: bool = False
    blood_parameters_count: int = 0
    radiology_images_count: int = 0
    arterial_parameters_count: int = 0
    microbiology_parameters_count: int = 0
    created_at: datetime
    updated_at: datetime


class InvestigationReportDetailResponse(BaseModel):
    """Detailed response for investigation report"""

    id: str
    report_id: str
    patient_id: str
    analysis_date: datetime
    blood_analysis: Optional[BloodAnalysisData] = None
    radiology_list: Optional[List[RadiologyData]] = None
    arterial_analysis: Optional[ArterialAnalysisData] = None
    microbiology: Optional[MicrobiologyData] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    presigned_urls: Optional[Dict[str, str]] = Field(
        None, description="Presigned URLs for all radiology images"
    )


class CreateInvestigationReportResponse(BaseModel):
    """Response after creating investigation report"""

    id: str
    report_id: str
    patient_id: str
    analysis_date: datetime
    created_at: datetime
    message: str = "Investigation report created successfully"


class ParameterListResponse(BaseModel):
    """Response for listing available parameters"""

    blood_parameters: List[Dict[str, str]] = Field(
        description="List of blood parameters with display names"
    )
    arterial_parameters: List[Dict[str, str]] = Field(
        description="List of arterial parameters with display names"
    )
    radiology_types: List[Dict[str, Any]] = Field(
        description="List of radiology types with subtypes"
    )
    microbiology_parameters: List[Dict[str, str]] = Field(
        description="List of microbiology parameters with display names"
    )


class InvestigationValueResponse(BaseModel):
    """Response for a single investigation value"""

    parameter: str
    value: Any
    display_name: str
    reference_range: Optional[str] = None
    units: Optional[str] = None
    status: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    formatted_value: Optional[str] = None
    recorded_at: datetime
    recorded_by: Optional[str] = None


class BloodAnalysisResponse(BaseModel):
    """Response for blood analysis data"""

    values: Dict[str, InvestigationValueResponse]
    total_parameters: int
    last_updated: Optional[datetime] = None


class RadiologyResponse(BaseModel):
    """Response for radiology data"""

    radiology_type: str
    subtype: Optional[str] = None
    file_keys: List[str]
    presigned_urls: Optional[Dict[str, str]] = None
    number_of_images: int
    reported_at: datetime
    reported_by: Optional[str] = None


class ArterialAnalysisResponse(BaseModel):
    """Response for arterial analysis data"""

    values: Dict[str, InvestigationValueResponse]
    total_parameters: int
    last_updated: Optional[datetime] = None


# Filter Schemas
class InvestigationReportFilter(BaseModel):
    """Filter for investigation reports"""

    patient_id: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    has_blood_analysis: Optional[bool] = None
    has_radiology: Optional[bool] = None
    has_arterial_analysis: Optional[bool] = None
    has_microbiology: Optional[bool] = None
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, le=100)
    organisation_id: Optional[str] = None


# Validation Schemas
class ValidateParameterRequest(BaseModel):
    """Request to validate a parameter"""

    investigation_type: InvestigationType
    parameter_name: str
    value: Any


class ValidateParameterResponse(BaseModel):
    """Response for parameter validation"""

    is_valid: bool
    parameter_info: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


class BulkAddArterialParametersRequest(BaseModel):
    """Request to add multiple arterial parameters at once"""

    parameters: List[Dict[str, Any]] = Field(..., description="List of parameters")
    recorded_by: Optional[str] = None
    organisation_id: Optional[str] = None


class AddRadiologyRequest(BaseModel):
    """Request to add radiology data to investigation report"""

    radiology_type: RadiologyType = Field(
        ..., description="Type of radiology investigation"
    )
    subtype: Optional[str] = Field(
        None, description="Subtype of radiology investigation"
    )
    file_keys: List[str] = Field(
        ..., description="List of S3 file keys for radiology images"
    )
    reported_by: Optional[str] = Field(
        None, description="Name/ID of the person who reported"
    )


class RadiologyFileUpload(BaseModel):
    """Information about a radiology file to upload"""

    file_index: int
    radiology_type: RadiologyType
    subtype: Optional[str] = None


class RadiologyUploadRequest(BaseModel):
    """Request for uploading radiology files with type information"""

    file_metadata: List[RadiologyFileUpload] = Field(
        ..., description="Metadata for each file being uploaded"
    )


class FileUploadResponse(BaseModel):
    """Response for file upload"""

    key: str
    filename: str
    content_type: str
    size: Optional[int] = None
    radiology_type: Optional[RadiologyType] = None
    subtype: Optional[str] = None


class RadiologyUploadResponse(BaseModel):
    """Response for radiology files upload"""

    uploaded_files: List[FileUploadResponse]
    total_files: int
    folder_path: str
    files_by_type: Optional[Dict[str, List[FileUploadResponse]]] = None


class AddRadiologyWithFilesRequest(BaseModel):
    """Request to add radiology with file upload"""

    radiology_type: RadiologyType
    subtype: Optional[str] = None
    reported_by: Optional[str] = None


class SensitivityTestRequest(BaseModel):
    """Request schema for sensitivity test data"""

    antibiotic: str = Field(..., description="Antibiotic name")
    result: str = Field(..., description="Test result (Reactive/Non-Reactive)")
    sensitivity_power: Optional[float] = Field(
        None, description="Sensitivity power value"
    )


class OrganismDataRequest(BaseModel):
    """Request schema for organism data"""

    organism_name: str = Field(..., description="Name of the detected organism")
    sensitivity_tests: List[SensitivityTestRequest] = Field(
        default_factory=list, description="List of sensitivity tests for this organism"
    )


class MicrobiologyTestRequest(BaseModel):
    """Request schema for individual microbiology test"""

    test_type: MicrobiologyParameter = Field(
        ..., description="Type of microbiology test"
    )
    specimen_source: str = Field(..., description="Source of the specimen")
    remarks: Optional[str] = Field(None, description="Additional remarks")
    organisms: List[OrganismDataRequest] = Field(
        default_factory=list,
        description="List of detected organisms with sensitivity tests",
    )


# Replace the existing BulkAddMicrobiologyParametersRequest
class BulkAddMicrobiologyParametersRequest(BaseModel):
    """Request to add multiple microbiology tests at once"""

    tests: List[MicrobiologyTestRequest] = Field(
        ..., description="List of microbiology tests to add"
    )
    organisation_id: Optional[str] = None


# Add response schemas
class SensitivityTestResponse(BaseModel):
    """Response schema for sensitivity test data"""

    antibiotic: str
    result: str
    sensitivity_power: Optional[float] = None


class OrganismDataResponse(BaseModel):
    """Response schema for organism data"""

    organism_name: str
    sensitivity_tests: List[SensitivityTestResponse]


class MicrobiologyTestResponse(BaseModel):
    """Response schema for individual microbiology test"""

    test_type: str
    specimen_source: str
    remarks: Optional[str] = None
    organisms: List[OrganismDataResponse]
    recorded_at: datetime
    recorded_by: Optional[str] = None


class MicrobiologyDataResponse(BaseModel):
    """Response schema for microbiology data"""

    tests: List[MicrobiologyTestResponse]
    total_tests: int
    total_organisms: int
    last_updated: Optional[datetime] = None


class DeleteRadiologyImagesRequest(BaseModel):
    """Request to delete radiology images"""

    file_keys: List[str] = Field(
        ..., 
        min_length=1,
        description="List of S3 file keys to delete"
    )
