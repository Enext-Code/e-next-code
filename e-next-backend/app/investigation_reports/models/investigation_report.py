import logging
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, field_validator

from app.base.models import (AuditMixin, BaseSchema, DuplicateError, IDMixin,
                             OrganisationMixin, StatusMixin, TimestampMixin)
from app.utils import generate_random_string

from ..enums import (RADIOLOGY_SUBTYPES, ArterialAnalysisParameter,
                     BloodAnalysisParameter, MicrobiologyParameter,
                     ParameterInfo, RadiologyType, get_parameter_info)
from ..utils import calculate_status, get_formatted_value_with_status

logger = logging.getLogger(__name__)


class InvestigationValue(BaseModel):
    """Single investigation value with metadata"""

    parameter: str = Field(..., description="Parameter name")
    value: Optional[Any] = Field(None, description="Value of the parameter")
    display_name: Optional[str] = Field(
        None, description="Display name of the parameter"
    )
    reference_range: Optional[str] = Field(
        None, description="Reference range of the parameter"
    )
    units: Optional[str] = Field(None, description="Units of the parameter")
    status: Optional[str] = Field(None, description="Status of the parameter")
    formatted_value: Optional[str] = Field(
        None, description="Formatted value of the parameter"
    )
    min_value: Optional[float] = Field(
        None, description="Minimum value of the parameter"
    )
    max_value: Optional[float] = Field(
        None, description="Maximum value of the parameter"
    )
    status: Optional[str] = Field(None, description="Status of the parameter")
    formatted_value: Optional[str] = Field(
        None, description="Formatted value of the parameter"
    )
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    recorded_by: Optional[str] = Field(
        None, description="Name of the person who recorded the value"
    )

    def calculate_status(
        self, param_info: Optional[ParameterInfo] = None
    ) -> Optional[str]:
        """Calculate status based on value and parameter info"""
        return calculate_status(self.value, param_info)

    def get_formatted_value(self, param_info: Optional[ParameterInfo] = None) -> str:
        """Get formatted value with status for display"""
        status = self.calculate_status(param_info)
        return get_formatted_value_with_status(self.value, status)


class BloodAnalysisData(BaseModel):
    """Blood analysis investigation data"""

    values: Dict[str, InvestigationValue] = Field(
        default_factory=dict, description="Blood analysis parameters and values"
    )

    def add_parameter(
        self,
        parameter: BloodAnalysisParameter,
        value: Union[float, str],
        recorded_by: Optional[str] = None,
    ):
        """Add a parameter and value to the blood analysis data"""
        param_info = get_parameter_info(parameter)
        if param_info:
            inv_value = InvestigationValue(
                parameter=parameter.value,
                value=value,
                display_name=param_info.display_name,
                reference_range=param_info.reference_range,
                units=param_info.units,
                min_value=param_info.min_value,
                max_value=param_info.max_value,
                recorded_at=datetime.now(UTC),
                recorded_by=recorded_by,
            )
            self.values[parameter.value] = inv_value


class RadiologyData(BaseModel):
    """Radiology investigation data"""

    radiology_type: RadiologyType = Field(..., description="Type of radiology")
    subtype: Optional[str] = Field(None, description="Sub type of radiology")
    file_keys: List[str] = Field(default_factory=list, description="S3 keys for images")
    number_of_images: int = Field(default=0, description="Number of images")
    reported_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), description="Date and time of report"
    )
    reported_by: Optional[str] = Field(
        None, description="Name of the person who reported the radiology"
    )

    @field_validator("subtype")
    def validate_subtype(cls, v, info):
        """Validate subtype against radiology type"""

        if v and "radiology_type" in info.data:
            valid_subtypes = RADIOLOGY_SUBTYPES.get(info.data["radiology_type"], [])
            if valid_subtypes and v not in valid_subtypes:
                logger.warning(
                    f"Non-standard subtype {v} for {info.data['radiology_type']}"
                )
        return v


class ArterialAnalysisData(BaseModel):
    """Arterial analysis investigation data"""

    values: Dict[str, InvestigationValue] = Field(
        default_factory=dict, description="Arterial analysis parameters and values"
    )

    def add_parameter(
        self,
        parameter: ArterialAnalysisParameter,
        value: float,
        recorded_by: Optional[str] = None,
    ):
        """Add a parameter and value to the arterial analysis data"""
        param_info = get_parameter_info(parameter)
        if param_info:
            inv_value = InvestigationValue(
                parameter=parameter.value,
                value=value,
                display_name=param_info.display_name,
                reference_range=param_info.reference_range,
                units=param_info.units,
                min_value=param_info.min_value,
                max_value=param_info.max_value,
                recorded_at=datetime.now(UTC),
                recorded_by=recorded_by,
            )
            self.values[parameter.value] = inv_value


class SensitivityTest(BaseModel):
    """Sensitivity test data for an organism"""

    antibiotic: str = Field(..., description="Antibiotic name")
    result: str = Field(..., description="Test result (Reactive/Non-Reactive)")
    sensitivity_power: Optional[float] = Field(
        None, description="Sensitivity power value"
    )


class OrganismData(BaseModel):
    """Organism data with sensitivity tests"""

    organism_name: str = Field(..., description="Name of the detected organism")
    sensitivity_tests: List[SensitivityTest] = Field(
        default_factory=list, description="List of sensitivity tests for this organism"
    )


class MicrobiologyTestData(BaseModel):
    """Individual microbiology test data"""

    test_type: MicrobiologyParameter = Field(
        ..., description="Type of microbiology test"
    )
    specimen_source: str = Field(..., description="Source of the specimen")
    remarks: Optional[str] = Field(None, description="Additional remarks")
    organisms: List[OrganismData] = Field(
        default_factory=list,
        description="List of detected organisms with sensitivity tests",
    )
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    recorded_by: Optional[str] = Field(None, description="Recorded by user")


# Update the existing MicrobiologyData class
class MicrobiologyData(BaseModel):
    """Microbiology investigation data - now supports multiple tests"""

    tests: List[MicrobiologyTestData] = Field(
        default_factory=list, description="List of microbiology tests"
    )

    # Keep the old values field for backward compatibility
    values: Dict[str, InvestigationValue] = Field(
        default_factory=dict, description="Legacy microbiology parameters and values"
    )

    def add_test(self, test_data: MicrobiologyTestData):
        """Add a new microbiology test or update existing one if test_type matches"""
        # Check if a test with the same test_type already exists
        existing_test_index = None
        for i, existing_test in enumerate(self.tests):
            if existing_test.test_type == test_data.test_type:
                existing_test_index = i
                break
        
        if existing_test_index is not None:
            # Update existing test
            self._merge_tests(self.tests[existing_test_index], test_data)
        else:
            # Add new test
            self.tests.append(test_data)
    
    def _merge_tests(self, existing_test: MicrobiologyTestData, new_test: MicrobiologyTestData):
        """Merge new test data into existing test"""
        # Update basic fields if they have new values
        if new_test.specimen_source:
            existing_test.specimen_source = new_test.specimen_source
        if new_test.remarks:
            existing_test.remarks = new_test.remarks
        if new_test.recorded_by:
            existing_test.recorded_by = new_test.recorded_by
        
        # Update recorded_at to latest
        existing_test.recorded_at = new_test.recorded_at
        
        # Merge organisms
        for new_organism in new_test.organisms:
            self._merge_organism(existing_test, new_organism)
    
    def _merge_organism(self, existing_test: MicrobiologyTestData, new_organism: OrganismData):
        """Merge organism data into existing test"""
        # Find if organism with same name already exists
        existing_organism_index = None
        for i, existing_organism in enumerate(existing_test.organisms):
            if existing_organism.organism_name.lower() == new_organism.organism_name.lower():
                existing_organism_index = i
                break
        
        if existing_organism_index is not None:
        # Merge sensitivity tests into existing organism
            existing_organism = existing_test.organisms[existing_organism_index]
            for new_sensitivity_test in new_organism.sensitivity_tests:
                self._merge_sensitivity_test(existing_organism, new_sensitivity_test)
        else:
            # Add new organism
            existing_test.organisms.append(new_organism)
    
    def _merge_sensitivity_test(self, existing_organism: OrganismData, new_sensitivity_test: SensitivityTest):
        """Merge sensitivity test into existing organism"""
        # Find if sensitivity test with same antibiotic already exists
        existing_test_index = None
        for i, existing_sensitivity_test in enumerate(existing_organism.sensitivity_tests):
            if (existing_sensitivity_test.antibiotic.lower() == new_sensitivity_test.antibiotic.lower() 
                and existing_sensitivity_test.antibiotic.strip() != ""):  # Don't merge empty antibiotic entries
                existing_test_index = i
                break
        
        if existing_test_index is not None:
            # Update existing sensitivity test
            existing_organism.sensitivity_tests[existing_test_index] = new_sensitivity_test
        else:
            # Add new sensitivity test
            existing_organism.sensitivity_tests.append(new_sensitivity_test)
    
    def add_test_force_new(self, test_data: MicrobiologyTestData):
        """Force add a new microbiology test without merging (for cases where duplicate test_type is intended)"""
        self.tests.append(test_data)

    def add_parameter(
        self,
        parameter: MicrobiologyParameter,
        value: float,
        recorded_by: Optional[str] = None,
    ):
        """Legacy method for backward compatibility"""
        param_info = get_parameter_info(parameter)
        if param_info:
            inv_value = InvestigationValue(
                parameter=parameter.value,
                value=value,
                display_name=param_info.display_name,
                reference_range=param_info.reference_range,
                units=param_info.units,
                min_value=param_info.min_value,
                max_value=param_info.max_value,
                recorded_at=datetime.now(UTC),
                recorded_by=recorded_by,
            )
            self.values[parameter.value] = inv_value


class InvestigationReport(
    BaseSchema, AuditMixin, IDMixin, OrganisationMixin, StatusMixin, TimestampMixin
):
    """Investigation report model"""

    # Report identification
    report_id: str = Field(..., description="Unique identifier for the report")
    patient_id: str = Field(..., description="Patient ID Reference")

    # Report metadata
    analysis_date: datetime = Field(..., description="Date and time of analysis")

    # Investigation data
    blood_analysis: Optional[BloodAnalysisData] = None
    radiology_list: List[RadiologyData] = Field(
        default_factory=list, description="List of radiology investigations"
    )
    arterial_analysis: Optional[ArterialAnalysisData] = None
    microbiology: Optional[MicrobiologyData] = None

    class Settings:
        """Pydantic settings"""

        collection = "investigation_reports"
        indexes = [
            [("patient_id", 1), ("analysis_date", -1)],
            [("report_id", 1)],
            [("organisation_id", 1), ("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1)],
        ]

    @field_validator("analysis_date", mode="before")
    @classmethod
    def parse_analysis_date(cls, v: Union[str, datetime]) -> datetime:
        """Parse analysis_date from string or datetime"""
        if isinstance(v, str):
            # Handle ISO format strings
            try:
                # Remove 'Z' and replace with +00:00 for fromisoformat
                if v.endswith("Z"):
                    v = v[:-1] + "+00:00"
                return datetime.fromisoformat(v)
            except ValueError:
                # Try parsing as ISO format with timezone
                return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    def model_dump(self, *args, **kwargs):
        """Override model_dump to convert analysis_date to ISO string format"""
        data = super().model_dump(*args, **kwargs)
        # Convert analysis_date to ISO string format for MongoDB storage
        if "analysis_date" in data and isinstance(data["analysis_date"], datetime):
            # Ensure UTC timezone
            if data["analysis_date"].tzinfo is None:
                data["analysis_date"] = data["analysis_date"].replace(tzinfo=UTC)
            else:
                data["analysis_date"] = data["analysis_date"].astimezone(UTC)
            # Convert to ISO format string without timezone suffix (e.g., "2025-12-01T11:56:00")
            data["analysis_date"] = data["analysis_date"].isoformat().replace("+00:00", "").replace("Z", "")
        return data

    @classmethod
    async def generate_report_id(cls) -> str:
        """Generate a unique ID for the report"""

        max_attempts = 5
        attempt = 0

        while attempt < max_attempts:
            try:
                cursor = (
                    cls.get_collection()
                    .find({}, {"report_id": 1, "_id": 0})
                    .limit(1000)
                )

                existing_report_ids = set()
                async for doc in cursor:
                    existing_report_ids.add(doc["report_id"])

                # Generate new report ID
                report_id = generate_random_string("IR", 10)

                # Verify report ID uniqueness with index
                existing = await cls.find_one({"report_id": report_id}, {"_id": 1})
                if not existing:
                    return report_id
            except Exception as e:
                logger.error(f"Error generating report ID: {e}")

            attempt += 1

        raise DuplicateError(
            message="Failed to generate unique report ID",
            error_code="REPORT_ID_GENERATION_FAILED",
        )
