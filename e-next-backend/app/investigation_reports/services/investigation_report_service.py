import logging
import mimetypes
from datetime import UTC, datetime, timedelta
from typing import List, Optional

from bson import ObjectId
from fastapi import UploadFile

from app.accounts.enums import UserType
from app.base.models import NotFoundError, ValidationError
from app.core import cache
from app.core.s3 import s3
from app.patients.models import Patient
from app.utils import decrypt_user_type

from ..enums import (ARTERIAL_PARAMETER_INFO, BLOOD_PARAMETER_INFO,
                     MICROBIOLOGY_PARAMETER_INFO, RADIOLOGY_SUBTYPES,
                     ArterialAnalysisParameter, BloodAnalysisParameter,
                     InvestigationType, MicrobiologyParameter, RadiologyType)
from ..models.investigation_report import (ArterialAnalysisData,
                                           BloodAnalysisData,
                                           InvestigationReport,
                                           InvestigationValue,
                                           MicrobiologyData,
                                           MicrobiologyTestData, OrganismData,
                                           RadiologyData, SensitivityTest)
from ..schemas.investigation_report import (
    BulkAddArterialParametersRequest, BulkAddBloodParametersRequest,
    BulkAddMicrobiologyParametersRequest, CreateInvestigationReportRequest,
    CreateInvestigationReportResponse, InvestigationReportDetailResponse,
    InvestigationReportFilter, InvestigationReportSummaryResponse,
    InvestigationValueResponse, ParameterListResponse,
    UpdateArterialAnalysisRequest, UpdateBloodAnalysisRequest,
    UpdateInvestigationReportRequest, UpdateMicrobiologyRequest,
    UpdateRadiologyRequest, ValidateParameterRequest,
    ValidateParameterResponse)
from ..utils import calculate_status, get_formatted_value_with_status

logger = logging.getLogger(__name__)


class InvestigationReportService:
    """Investigation Report service"""

    CACHE_KEY_PREFIX = "investigation_report"
    LIST_CACHE_KEY_PREFIX = "investigation_report_list"
    PATIENT_REPORTS_CACHE_KEY_PREFIX = "patient_investigation_reports"
    CACHE_TIMEOUT = timedelta(minutes=30)

    @staticmethod
    async def _invalidate_cache(report_id: str = None, patient_id: str = None) -> None:
        """Invalidate cache"""
        if report_id:
            await cache.delete(
                f"{InvestigationReportService.CACHE_KEY_PREFIX}:{report_id}"
            )
        if patient_id:
            await cache.delete_pattern(
                f"{InvestigationReportService.PATIENT_REPORTS_CACHE_KEY_PREFIX}:{patient_id}:*"
            )
        await cache.delete_pattern(
            f"{InvestigationReportService.LIST_CACHE_KEY_PREFIX}:*"
        )

    @staticmethod
    def _enhance_investigation_value(
        values_dict: dict, parameter_enum_class, parameter_info_dict
    ) -> dict:
        """Helper function to enhance investigation value"""
        enhanced_values = {}
        for param_name, value_data in values_dict.items():
            try:
                param_enum = parameter_enum_class(param_name)
                param_info = parameter_info_dict.get(param_enum)

                # Calculate status
                status = calculate_status(value_data.get("value"), param_info)
                formatted_value = get_formatted_value_with_status(
                    value_data.get("value"), status
                )

                enhanced_values[param_name] = InvestigationValueResponse(
                    parameter=param_name,
                    value=value_data.get("value"),
                    display_name=param_info.display_name if param_info else param_name,
                    reference_range=param_info.reference_range if param_info else None,
                    units=param_info.units if param_info else None,
                    min_value=param_info.min_value if param_info else None,
                    max_value=param_info.max_value if param_info else None,
                    status=status,
                    formatted_value=formatted_value,
                    recorded_by=value_data.get("recorded_by"),
                    recorded_at=value_data.get("recorded_at"),
                ).model_dump()
            except ValueError:
                enhanced_values[param_name] = value_data
        return enhanced_values

    @staticmethod
    async def create_report(
        request: CreateInvestigationReportRequest, current_user: dict
    ) -> CreateInvestigationReportResponse:
        """Create a new investigation report"""
        async with await InvestigationReport.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = request.organisation_id

                    # Verify patient exists and belongs to the organisation
                    patient = await Patient.find_one(
                        {
                            "_id": ObjectId(request.patient_id),
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not patient:
                        raise NotFoundError("Patient not found")

                    # Validate that analysis_date is not before admission date
                    if patient.admission_date and request.analysis_date:
                        # Extract date only from analysis_date (ignore time and timezone)
                        analysis_date_only = request.analysis_date.date()
                        
                        # Compare dates only
                        if analysis_date_only < patient.admission_date:
                            raise ValidationError(
                                message=f"Analysis date ({analysis_date_only}) cannot be before patient admission date ({patient.admission_date})",
                                error_code="INVALID_ANALYSIS_DATE",
                            )

                    # Generate unique report ID
                    report_id = await InvestigationReport.generate_report_id()

                    # Create report
                    report = await InvestigationReport.create(
                        report_id=report_id,
                        patient_id=request.patient_id,
                        analysis_date=request.analysis_date,
                        organisation_id=organisation_id,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        session=session,
                    )

                    # Commit transaction
                    await session.commit_transaction()
                    await InvestigationReportService._invalidate_cache(
                        patient_id=request.patient_id
                    )

                    logger.info(
                        f"Created investigation report {report_id} for patient {request.patient_id}"
                    )

                    return CreateInvestigationReportResponse(
                        id=report.id,
                        report_id=report.report_id,
                        patient_id=report.patient_id,
                        analysis_date=report.analysis_date,
                        created_at=report.created_at,
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error creating investigation report: {e}")
                    raise e

    @staticmethod
    async def get_report(
        report_id: str, current_user: dict
    ) -> InvestigationReportDetailResponse:
        """Get investigation report by ID"""
        cache_key = f"{InvestigationReportService.CACHE_KEY_PREFIX}:{report_id}"
        cached_report = await cache.get(cache_key)
        if cached_report:
            return InvestigationReportDetailResponse(**cached_report)

        pipeline = [
            {
                "$match": {
                    "report_id": report_id,
                    "is_active": True,
                    "is_deleted": False,
                }
            },
            # Lookup patient details
            {"$addFields": {"patient_id_obj": {"$toObjectId": "$patient_id"}}},
            {
                "$lookup": {
                    "from": "patients",
                    "localField": "patient_id_obj",
                    "foreignField": "_id",
                    "as": "patient_data",
                }
            },
            {"$unwind": {"path": "$patient_data", "preserveNullAndEmptyArrays": True}},
            # Add computed fields
            {
                "$addFields": {
                    "blood_parameters_count": {
                        "$cond": {
                            "if": {"$ne": ["$blood_analysis", None]},
                            "then": {
                                "$size": {"$objectToArray": "$blood_analysis.values"}
                            },
                            "else": 0,
                        }
                    },
                    "radiology_images_count": {
                        "$sum": {
                            "$map": {
                                "input": {"$ifNull": ["$radiology_list", []]},
                                "as": "rad",
                                "in": "$$rad.number_of_images",
                            }
                        }
                    },
                    "arterial_parameters_count": {
                        "$cond": {
                            "if": {"$ne": ["$arterial_analysis", None]},
                            "then": {
                                "$size": {"$objectToArray": "$arterial_analysis.values"}
                            },
                            "else": 0,
                        }
                    },
                    "microbiology_parameters_count": {
                        "$cond": {
                            "if": {"$ne": ["$microbiology", None]},
                            "then": {
                                "$size": {"$objectToArray": "$microbiology.values"}
                            },
                            "else": 0,
                        }
                    },
                }
            },
        ]

        result = (
            await InvestigationReport.get_collection()
            .aggregate(pipeline)
            .to_list(length=1)
        )
        if not result:
            raise NotFoundError("Investigation report not found")

        report = result[0]

        # Convert blood analysis values with display names
        if report.get("blood_analysis") and report["blood_analysis"].get("values"):
            report["blood_analysis"]["values"] = (
                InvestigationReportService._enhance_investigation_value(
                    report["blood_analysis"]["values"],
                    BloodAnalysisParameter,
                    BLOOD_PARAMETER_INFO,
                )
            )

        # Convert arterial analysis values with display names
        if report.get("arterial_analysis") and report["arterial_analysis"].get(
            "values"
        ):
            report["arterial_analysis"]["values"] = (
                InvestigationReportService._enhance_investigation_value(
                    report["arterial_analysis"]["values"],
                    ArterialAnalysisParameter,
                    ARTERIAL_PARAMETER_INFO,
                )
            )

        # Get presigned URLs for all radiology images
        presigned_urls = {}
        if report.get("radiology_list"):
            all_file_keys = []
            for rad_entry in report["radiology_list"]:
                if rad_entry.get("file_keys"):
                    all_file_keys.extend(rad_entry["file_keys"])

            if all_file_keys:
                presigned_urls = await s3.get_presigned_urls_batch(all_file_keys)

        report_response = InvestigationReportDetailResponse(
            id=str(report["_id"]),
            report_id=report["report_id"],
            patient_id=report["patient_id"],
            analysis_date=report["analysis_date"],
            blood_analysis=report.get("blood_analysis"),
            radiology_list=report.get("radiology_list"),
            arterial_analysis=report.get("arterial_analysis"),
            microbiology=report.get("microbiology"),
            created_at=report["created_at"],
            updated_at=report["updated_at"],
            created_by=report.get("created_by"),
            updated_by=report.get("updated_by"),
            presigned_urls=presigned_urls,
        ).model_dump(mode="json")

        await cache.set(
            cache_key, report_response, InvestigationReportService.CACHE_TIMEOUT
        )
        return InvestigationReportDetailResponse(**report_response)

    @staticmethod
    async def update_report(
        report_id: str, request: UpdateInvestigationReportRequest, current_user: dict
    ) -> InvestigationReportDetailResponse:
        """Update investigation report"""
        async with await InvestigationReport.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    # Find report
                    report = await InvestigationReport.find_one(
                        {
                            "report_id": report_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not report:
                        raise NotFoundError("Investigation report not found")

                    # Prepare update data
                    update_data = {
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }

                    # Update analysis date if provided
                    if request.analysis_date:
                        update_data["analysis_date"] = request.analysis_date

                    # Update blood analysis
                    if request.blood_analysis:
                        await InvestigationReportService._update_blood_analysis(
                            report, request.blood_analysis, update_data
                        )

                    # Update radiology
                    if request.radiology:
                        await InvestigationReportService._update_radiology(
                            report, request.radiology, update_data
                        )

                    # Update arterial analysis
                    if request.arterial_analysis:
                        await InvestigationReportService._update_arterial_analysis(
                            report, request.arterial_analysis, update_data
                        )

                    # Update microbiology
                    if request.microbiology:
                        await InvestigationReportService._update_microbiology(
                            report, request.microbiology, update_data
                        )

                    # Save updates
                    if len(update_data) > 2:  # More than just updated_by fields
                        await report.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await InvestigationReportService._invalidate_cache(
                        report_id=report_id, patient_id=report.patient_id
                    )

                    # Return updated report
                    return await InvestigationReportService.get_report(
                        report_id, current_user
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error updating investigation report: {e}")
                    raise e

    @staticmethod
    async def _update_blood_analysis(
        report: InvestigationReport,
        request: UpdateBloodAnalysisRequest,
        update_data: dict,
    ):
        """Update blood analysis data"""
        # Initialize blood analysis if not exists
        if not report.blood_analysis:
            report.blood_analysis = BloodAnalysisData()

        # Handle bulk values update
        if request.values:
            for param_name, value_data in request.values.items():
                inv_value = InvestigationValue(
                    parameter=param_name,
                    value=value_data.value,
                    recorded_at=value_data.recorded_at or datetime.now(UTC),
                    recorded_by=value_data.recorded_by,
                )
                report.blood_analysis.values[param_name] = inv_value

        # Handle single value update
        if request.single_value:
            param_name = request.single_value.get("parameter")
            if param_name:
                # Validate parameter
                try:
                    param_enum = BloodAnalysisParameter(param_name)
                    report.blood_analysis.add_parameter(
                        param_enum,
                        request.single_value.get("value"),
                        request.single_value.get("recorded_by"),
                    )
                except ValueError:
                    raise ValidationError(
                        message=f"Invalid blood analysis parameter: {param_name}",
                        error_code="INVALID_PARAMETER",
                    )

        update_data["blood_analysis"] = report.blood_analysis.model_dump()

    @staticmethod
    async def _update_radiology(
        report: InvestigationReport, request: UpdateRadiologyRequest, update_data: dict
    ):
        """Update radiology data"""
        # Initialize radiology if not exists
        if not report.radiology:
            if not request.radiology_type:
                raise ValidationError(
                    message="Radiology type is required for first radiology update",
                    error_code="RADIOLOGY_TYPE_REQUIRED",
                )
            report.radiology = RadiologyData(
                radiology_type=request.radiology_type, reported_at=datetime.now(UTC)
            )

        # Update fields
        if request.radiology_type:
            report.radiology.radiology_type = request.radiology_type

        if request.subtype is not None:
            # Validate subtype
            valid_subtypes = RADIOLOGY_SUBTYPES.get(report.radiology.radiology_type, [])
            if valid_subtypes and request.subtype not in valid_subtypes:
                logger.warning(
                    f"Non-standard subtype {request.subtype} for {report.radiology.radiology_type}"
                )
            report.radiology.subtype = request.subtype

        if request.file_keys is not None:
            report.radiology.file_keys = request.file_keys
            report.radiology.number_of_images = len(request.file_keys)

        if request.add_file_keys:
            # Add new files without replacing
            report.radiology.file_keys.extend(request.add_file_keys)
            report.radiology.number_of_images = len(report.radiology.file_keys)

        if request.reported_by:
            report.radiology.reported_by = request.reported_by
            report.radiology.reported_at = datetime.now(UTC)

        update_data["radiology"] = report.radiology.model_dump()

    @staticmethod
    async def _update_arterial_analysis(
        report: InvestigationReport,
        request: UpdateArterialAnalysisRequest,
        update_data: dict,
    ):
        """Update arterial analysis data"""
        # Initialize arterial analysis if not exists
        if not report.arterial_analysis:
            report.arterial_analysis = ArterialAnalysisData()

        # Handle bulk values update
        if request.values:
            for param_name, value_data in request.values.items():
                inv_value = InvestigationValue(
                    parameter=param_name,
                    value=value_data.value,
                    recorded_at=value_data.recorded_at or datetime.now(UTC),
                    recorded_by=value_data.recorded_by,
                )
                report.arterial_analysis.values[param_name] = inv_value

        # Handle single value update
        if request.single_value:
            param_name = request.single_value.get("parameter")
            if param_name:
                try:
                    param_enum = ArterialAnalysisParameter(param_name)
                    report.arterial_analysis.add_parameter(
                        param_enum,
                        request.single_value.get("value"),
                        request.single_value.get("recorded_by"),
                    )
                except ValueError:
                    raise ValidationError(
                        message=f"Invalid arterial analysis parameter: {param_name}",
                        error_code="INVALID_PARAMETER",
                    )

        update_data["arterial_analysis"] = report.arterial_analysis.model_dump()

    @staticmethod
    async def _update_microbiology(
        report: InvestigationReport,
        request: UpdateMicrobiologyRequest,
        update_data: dict,
    ):
        """Update microbiology data"""
        # Initialize microbiology if not exists
        if not report.microbiology:
            report.microbiology = MicrobiologyData()

        # Handle bulk values update
        if request.values:
            for param_name, value_data in request.values.items():
                inv_value = InvestigationValue(
                    parameter=param_name,
                    value=value_data.value,
                    recorded_at=value_data.recorded_at or datetime.now(UTC),
                    recorded_by=value_data.recorded_by,
                )
                report.microbiology.values[param_name] = inv_value

        # Handle single value update
        if request.single_value:
            param_name = request.single_value.get("parameter")
            if param_name:
                try:
                    param_enum = MicrobiologyParameter(param_name)
                    report.microbiology.add_parameter(
                        param_enum,
                        request.single_value.get("value"),
                        request.single_value.get("recorded_by"),
                    )
                except ValueError:
                    raise ValidationError(
                        message=f"Invalid microbiology parameter: {param_name}",
                        error_code="INVALID_PARAMETER",
                    )

        update_data["microbiology"] = report.microbiology.model_dump()

    @staticmethod
    async def bulk_add_blood_parameters(
        report_id: str, request: BulkAddBloodParametersRequest, current_user: dict
    ) -> InvestigationReportDetailResponse:
        """Bulk add blood parameters"""
        async with await InvestigationReport.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = request.organisation_id

                    # Find report
                    report = await InvestigationReport.find_one(
                        {
                            "report_id": report_id,
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not report:
                        raise NotFoundError("Investigation report not found")

                    # Initialize blood analysis if not exists
                    if not report.blood_analysis:
                        report.blood_analysis = BloodAnalysisData()

                    # Add all parameters
                    for param_data in request.parameters:
                        param_name = param_data.get("parameter")
                        value = param_data.get("value")

                        if param_name and value is not None:
                            try:
                                param_enum = BloodAnalysisParameter(param_name)
                                report.blood_analysis.add_parameter(
                                    param_enum,
                                    value,
                                    request.recorded_by
                                    or param_data.get("recorded_by"),
                                )
                            except ValueError:
                                logger.warning(
                                    f"Skipping invalid parameter: {param_name}"
                                )

                    # Update report
                    update_data = {
                        "blood_analysis": report.blood_analysis.model_dump(),
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }

                    await report.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await InvestigationReportService._invalidate_cache(
                        report_id=report_id, patient_id=report.patient_id
                    )

                    return await InvestigationReportService.get_report(
                        report_id, current_user
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error bulk adding blood parameters: {e}")
                    raise e

    @staticmethod
    async def bulk_add_arterial_parameters(
        report_id: str, request: BulkAddArterialParametersRequest, current_user: dict
    ) -> InvestigationReportDetailResponse:
        """Bulk add arterial parameters"""
        async with await InvestigationReport.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = request.organisation_id

                    # Find report
                    report = await InvestigationReport.find_one(
                        {
                            "report_id": report_id,
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not report:
                        raise NotFoundError("Investigation report not found")

                    # Initialize arterial analysis if not exists
                    if not report.arterial_analysis:
                        report.arterial_analysis = ArterialAnalysisData()

                    # Add all parameters
                    for param_data in request.parameters:
                        param_name = param_data.get("parameter")
                        value = param_data.get("value")

                        if param_name and value is not None:
                            try:
                                param_enum = ArterialAnalysisParameter(param_name)
                                report.arterial_analysis.add_parameter(
                                    param_enum,
                                    value,
                                    request.recorded_by
                                    or param_data.get("recorded_by"),
                                )
                            except ValueError:
                                logger.warning(
                                    f"Skipping invalid parameter: {param_name}"
                                )

                    # Update report
                    update_data = {
                        "arterial_analysis": report.arterial_analysis.model_dump(),
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }

                    await report.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await InvestigationReportService._invalidate_cache(
                        report_id=report_id, patient_id=report.patient_id
                    )

                    return await InvestigationReportService.get_report(
                        report_id, current_user
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error bulk adding arterial parameters: {e}")
                    raise e

    @staticmethod
    async def bulk_add_microbiology_parameters(
        report_id: str,
        request: BulkAddMicrobiologyParametersRequest,
        current_user: dict,
    ) -> InvestigationReportDetailResponse:
        """Bulk add microbiology parameters"""
        async with await InvestigationReport.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = request.organisation_id

                    # Find report
                    report = await InvestigationReport.find_one(
                        {
                            "report_id": report_id,
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not report:
                        raise NotFoundError("Investigation report not found")

                    # Initialize microbiology if not exists
                    if not report.microbiology:
                        report.microbiology = MicrobiologyData()

                    # Add all parameters
                    for test_request in request.tests:
                        # Convert request to model
                        test_data = MicrobiologyTestData(
                            test_type=test_request.test_type,
                            specimen_source=test_request.specimen_source,
                            remarks=test_request.remarks,
                            organisms=[
                                OrganismData(
                                    organism_name=org.organism_name,
                                    sensitivity_tests=[
                                        SensitivityTest(
                                            antibiotic=test.antibiotic,
                                            result=test.result,
                                            sensitivity_power=test.sensitivity_power,
                                        )
                                        for test in org.sensitivity_tests
                                    ],
                                )
                                for org in test_request.organisms
                            ],
                            recorded_at=datetime.now(UTC),
                            recorded_by=updated_by,
                        )

                        report.microbiology.add_test(test_data)

                    # Update report
                    update_data = {
                        "microbiology": report.microbiology.model_dump(),
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }

                    await report.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await InvestigationReportService._invalidate_cache(
                        report_id=report_id, patient_id=report.patient_id
                    )

                    return await InvestigationReportService.get_report(
                        report_id, current_user
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error bulk adding microbiology parameters: {e}")
                    raise e

    @staticmethod
    async def get_patient_reports(
        patient_id: str, filter_params: InvestigationReportFilter, current_user: dict
    ) -> dict:
        """Get all investigation reports for a patient"""
        cache_key = f"{InvestigationReportService.PATIENT_REPORTS_CACHE_KEY_PREFIX}:{patient_id}:{filter_params.skip}:{filter_params.limit}:{filter_params.organisation_id or ''}"
        cached_result = await cache.get(cache_key)
        if cached_result:
            return cached_result

        encrypted_user_type = current_user["ut"]
        user_type = UserType(decrypt_user_type(encrypted_user_type))

        # Build filter query
        filter_query = {
            "patient_id": patient_id,
            "is_active": True,
            "is_deleted": False,
        }

        if UserType.requires_organisation_id(user_type):
            if (
                hasattr(filter_params, "organisation_id")
                and filter_params.organisation_id
            ):
                filter_query["organisation_id"] = filter_params.organisation_id
        else:
            filter_query["organisation_id"] = current_user["oid"]

        # Verify patient belongs to organisation
        patient = await Patient.find_one(
            {
                "_id": ObjectId(patient_id),
                "is_active": True,
                "is_deleted": False,
            }
        )
        if not patient:
            raise NotFoundError("Patient not found")

        if filter_params.from_date or filter_params.to_date:
            date_filter = {}
            if filter_params.from_date:
                # Ensure from_date includes the entire day (start of day: 00:00:00)
                from_dt = filter_params.from_date
                # Check if it's date-only (all time components are 0)
                is_date_only = (
                    from_dt.hour == 0
                    and from_dt.minute == 0
                    and from_dt.second == 0
                    and from_dt.microsecond == 0
                )
                # Ensure UTC timezone before modifying time components
                if from_dt.tzinfo is None:
                    from_dt = from_dt.replace(tzinfo=UTC)
                else:
                    # Convert to UTC if timezone-aware
                    from_dt = from_dt.astimezone(UTC)
                # If date-only, set to start of day to include entire day
                if is_date_only:
                    from_dt = from_dt.replace(hour=0, minute=0, second=0, microsecond=0)
                # Format without timezone suffix to match stored format
                date_filter["$gte"] = from_dt.isoformat().replace("+00:00", "").replace("Z", "")
            if filter_params.to_date:
                # Ensure to_date includes the entire day (end of day: 23:59:59.999)
                to_dt = filter_params.to_date
                # Check if it's date-only (all time components are 0)
                is_date_only = (
                    to_dt.hour == 0
                    and to_dt.minute == 0
                    and to_dt.second == 0
                    and to_dt.microsecond == 0
                )
                # Ensure UTC timezone before modifying time components
                if to_dt.tzinfo is None:
                    to_dt = to_dt.replace(tzinfo=UTC)
                else:
                    to_dt = to_dt.astimezone(UTC)
                # If date-only, set to end of day to include entire day
                if is_date_only:
                    to_dt = to_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
                # Format without timezone suffix to match stored format
                date_filter["$lte"] = to_dt.isoformat().replace("+00:00", "").replace("Z", "")
            filter_query["analysis_date"] = date_filter

        pipeline = [
            {"$match": filter_query},
            {
                "$addFields": {
                    "has_blood_analysis": {"$ne": ["$blood_analysis", None]},
                    "has_radiology": {"$ne": ["$radiology", None]},
                    "has_arterial_analysis": {"$ne": ["$arterial_analysis", None]},
                    "blood_parameters_count": {
                        "$cond": {
                            "if": {"$ne": ["$blood_analysis", None]},
                            "then": {
                                "$size": {"$objectToArray": "$blood_analysis.values"}
                            },
                            "else": 0,
                        }
                    },
                    "radiology_images_count": {
                        "$cond": {
                            "if": {"$ne": ["$radiology", None]},
                            "then": "$radiology.number_of_images",
                            "else": 0,
                        }
                    },
                    "arterial_parameters_count": {
                        "$cond": {
                            "if": {"$ne": ["$arterial_analysis", None]},
                            "then": {
                                "$size": {"$objectToArray": "$arterial_analysis.values"}
                            },
                            "else": 0,
                        }
                    },
                }
            },
            {"$sort": {"analysis_date": -1, "created_at": -1}},
            {
                "$facet": {
                    "metadata": [{"$count": "total"}],
                    "data": [
                        {"$skip": filter_params.skip},
                        {"$limit": filter_params.limit},
                    ],
                }
            },
        ]

        result = (
            await InvestigationReport.get_collection()
            .aggregate(pipeline)
            .to_list(length=1)
        )
        result = result[0] if result else {"metadata": [{"total": 0}], "data": []}

        total = result["metadata"][0]["total"] if result["metadata"] else 0
        reports = [
            InvestigationReportSummaryResponse(
                id=str(report["_id"]),
                report_id=report["report_id"],
                patient_id=report["patient_id"],
                analysis_date=report["analysis_date"],
                has_blood_analysis=report.get("has_blood_analysis", False),
                has_radiology=report.get("has_radiology", False),
                has_arterial_analysis=report.get("has_arterial_analysis", False),
                blood_parameters_count=report.get("blood_parameters_count", 0),
                radiology_images_count=report.get("radiology_images_count", 0),
                arterial_parameters_count=report.get("arterial_parameters_count", 0),
                created_at=report["created_at"],
                updated_at=report["updated_at"],
            ).model_dump(mode="json")
            for report in result["data"]
        ]

        pages = (total + filter_params.limit - 1) // filter_params.limit
        has_next = (filter_params.skip // filter_params.limit + 1) < pages
        has_prev = filter_params.skip > 0

        response = {
            "items": reports,
            "total": total,
            "skip": filter_params.skip,
            "limit": filter_params.limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }

        await cache.set(cache_key, response, InvestigationReportService.CACHE_TIMEOUT)
        return response

    @staticmethod
    async def get_all_reports(
        filter_params: InvestigationReportFilter, current_user: dict
    ) -> dict:
        """Get all investigation reports with filters"""
        encrypted_user_type = current_user["ut"]
        user_type = UserType(decrypt_user_type(encrypted_user_type))
        cache_key_parts = [
            InvestigationReportService.LIST_CACHE_KEY_PREFIX,
            str(filter_params.skip),
            str(filter_params.limit),
            filter_params.patient_id or "all",
            str(filter_params.from_date) if filter_params.from_date else "none",
            str(filter_params.to_date) if filter_params.to_date else "none",
            (
                str(filter_params.has_microbiology)
                if filter_params.has_microbiology
                else "none"
            ),
            filter_params.organisation_id or "all",
        ]
        cache_key = ":".join(cache_key_parts)

        cached_result = await cache.get(cache_key)
        if cached_result:
            return cached_result

        # Build filter query
        filter_query = {
            "is_active": True,
            "is_deleted": False,
        }

        if UserType.requires_organisation_id(user_type):
            if (
                hasattr(filter_params, "organisation_id")
                and filter_params.organisation_id
            ):
                filter_query["organisation_id"] = filter_params.organisation_id
        else:
            filter_query["organisation_id"] = current_user["oid"]

        if filter_params.patient_id:
            filter_query["patient_id"] = filter_params.patient_id

        if filter_params.from_date or filter_params.to_date:
            date_filter = {}
            if filter_params.from_date:
                # Ensure from_date includes the entire day (start of day: 00:00:00)
                from_dt = filter_params.from_date
                # Check if it's date-only (all time components are 0)
                is_date_only = (
                    from_dt.hour == 0
                    and from_dt.minute == 0
                    and from_dt.second == 0
                    and from_dt.microsecond == 0
                )
                # Ensure UTC timezone before modifying time components
                if from_dt.tzinfo is None:
                    from_dt = from_dt.replace(tzinfo=UTC)
                else:
                    # Convert to UTC if timezone-aware
                    from_dt = from_dt.astimezone(UTC)
                # If date-only, set to start of day to include entire day
                if is_date_only:
                    from_dt = from_dt.replace(hour=0, minute=0, second=0, microsecond=0)
                # Format without timezone suffix to match stored format
                date_filter["$gte"] = from_dt.isoformat().replace("+00:00", "").replace("Z", "")
            if filter_params.to_date:
                # Ensure to_date includes the entire day (end of day: 23:59:59.999)
                to_dt = filter_params.to_date
                # Check if it's date-only (all time components are 0)
                is_date_only = (
                    to_dt.hour == 0
                    and to_dt.minute == 0
                    and to_dt.second == 0
                    and to_dt.microsecond == 0
                )
                # Ensure UTC timezone before modifying time components
                if to_dt.tzinfo is None:
                    to_dt = to_dt.replace(tzinfo=UTC)
                else:
                    to_dt = to_dt.astimezone(UTC)
                # If date-only, set to end of day to include entire day
                if is_date_only:
                    to_dt = to_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
                # Format without timezone suffix to match stored format
                date_filter["$lte"] = to_dt.isoformat().replace("+00:00", "").replace("Z", "")
            filter_query["analysis_date"] = date_filter

        if filter_params.has_blood_analysis is not None:
            if filter_params.has_blood_analysis:
                filter_query["blood_analysis"] = {"$ne": None}
            else:
                filter_query["blood_analysis"] = None

        if filter_params.has_radiology is not None:
            if filter_params.has_radiology:
                filter_query["radiology"] = {"$ne": None}
            else:
                filter_query["radiology"] = None

        if filter_params.has_arterial_analysis is not None:
            if filter_params.has_arterial_analysis:
                filter_query["arterial_analysis"] = {"$ne": None}
            else:
                filter_query["arterial_analysis"] = None

        if filter_params.has_microbiology is not None:
            if filter_params.has_microbiology:
                filter_query["microbiology"] = {"$ne": None}
            else:
                filter_query["microbiology"] = None

        pipeline = [
            {"$match": filter_query},
            # Lookup patient details
            {"$addFields": {"patient_id_obj": {"$toObjectId": "$patient_id"}}},
            {
                "$lookup": {
                    "from": "patients",
                    "localField": "patient_id_obj",
                    "foreignField": "_id",
                    "as": "patient_data",
                }
            },
            {"$unwind": {"path": "$patient_data", "preserveNullAndEmptyArrays": True}},
            # Add computed fields
            {
                "$addFields": {
                    "patient_name": {
                        "$concat": [
                            {"$ifNull": ["$patient_data.first_name", ""]},
                            " ",
                            {"$ifNull": ["$patient_data.last_name", ""]},
                        ]
                    },
                    "patient_unique_id": "$patient_data.unique_id",
                    "has_blood_analysis": {"$ne": ["$blood_analysis", None]},
                    "has_radiology": {"$ne": ["$radiology", None]},
                    "has_arterial_analysis": {"$ne": ["$arterial_analysis", None]},
                    "blood_parameters_count": {
                        "$cond": {
                            "if": {"$ne": ["$blood_analysis", None]},
                            "then": {
                                "$size": {"$objectToArray": "$blood_analysis.values"}
                            },
                            "else": 0,
                        }
                    },
                    "radiology_images_count": {
                        "$cond": {
                            "if": {"$ne": ["$radiology", None]},
                            "then": "$radiology.number_of_images",
                            "else": 0,
                        }
                    },
                    "arterial_parameters_count": {
                        "$cond": {
                            "if": {"$ne": ["$arterial_analysis", None]},
                            "then": {
                                "$size": {"$objectToArray": "$arterial_analysis.values"}
                            },
                            "else": 0,
                        }
                    },
                }
            },
            {"$sort": {"analysis_date": -1, "created_at": -1}},
            {
                "$facet": {
                    "metadata": [{"$count": "total"}],
                    "data": [
                        {"$skip": filter_params.skip},
                        {"$limit": filter_params.limit},
                    ],
                }
            },
        ]

        result = (
            await InvestigationReport.get_collection()
            .aggregate(pipeline)
            .to_list(length=1)
        )
        result = result[0] if result else {"metadata": [{"total": 0}], "data": []}

        total = result["metadata"][0]["total"] if result["metadata"] else 0
        reports = []

        for report in result["data"]:
            summary = InvestigationReportSummaryResponse(
                id=str(report["_id"]),
                report_id=report["report_id"],
                patient_id=report["patient_id"],
                analysis_date=report["analysis_date"],
                has_blood_analysis=report.get("has_blood_analysis", False),
                has_radiology=report.get("has_radiology", False),
                has_arterial_analysis=report.get("has_arterial_analysis", False),
                blood_parameters_count=report.get("blood_parameters_count", 0),
                radiology_images_count=report.get("radiology_images_count", 0),
                arterial_parameters_count=report.get("arterial_parameters_count", 0),
                created_at=report["created_at"],
                updated_at=report["updated_at"],
            ).model_dump(mode="json")

            # Add patient info if available
            summary["patient_name"] = report.get("patient_name", "").strip()
            summary["patient_unique_id"] = report.get("patient_unique_id", "")

            reports.append(summary)

        pages = (total + filter_params.limit - 1) // filter_params.limit
        current_page = (filter_params.skip // filter_params.limit) + 1
        has_next = current_page < pages
        has_prev = filter_params.skip > 0

        response = {
            "items": reports,
            "total": total,
            "skip": filter_params.skip,
            "limit": filter_params.limit,
            "pages": pages,
            "current_page": current_page,
            "has_next": has_next,
            "has_prev": has_prev,
        }

        await cache.set(cache_key, response, InvestigationReportService.CACHE_TIMEOUT)
        return response

    @staticmethod
    async def delete_report(report_id: str, current_user: dict) -> dict:
        """Soft delete an investigation report"""
        async with await InvestigationReport.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    # Find report
                    report = await InvestigationReport.find_one(
                        {
                            "report_id": report_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not report:
                        raise NotFoundError("Investigation report not found")

                    # Soft delete
                    update_data = {
                        "is_deleted": True,
                        "is_active": False,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }

                    await report.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await InvestigationReportService._invalidate_cache(
                        report_id=report_id, patient_id=report.patient_id
                    )

                    logger.info(f"Soft deleted investigation report {report_id}")

                    return {
                        "success": True,
                        "message": "Investigation report deleted successfully",
                        "report_id": report_id,
                    }

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error deleting investigation report: {e}")
                    raise e

    @staticmethod
    async def get_available_parameters() -> ParameterListResponse:
        """Get list of all available parameters"""
        # Get blood parameters
        blood_params = []
        for param in BloodAnalysisParameter:
            param_info = BLOOD_PARAMETER_INFO.get(param)
            blood_params.append(
                {
                    "value": param.value,
                    "display_name": (
                        param_info.display_name if param_info else param.value
                    ),
                }
            )

        # Get arterial parameters
        arterial_params = []
        for param in ArterialAnalysisParameter:
            param_info = ARTERIAL_PARAMETER_INFO.get(param)
            arterial_params.append(
                {
                    "value": param.value,
                    "display_name": (
                        param_info.display_name if param_info else param.value
                    ),
                }
            )

        # Get radiology types with subtypes
        radiology_types = []
        for rad_type in RadiologyType:
            radiology_types.append(
                {
                    "value": rad_type.value,
                    "display_name": rad_type.value,
                    "subtypes": RADIOLOGY_SUBTYPES.get(rad_type, []),
                }
            )

        # Get microbiology parameters
        microbiology_params = []
        for param in MicrobiologyParameter:
            param_info = MICROBIOLOGY_PARAMETER_INFO.get(param)
            microbiology_params.append(
                {
                    "value": param.value,
                    "display_name": (
                        param_info.display_name if param_info else param.value
                    ),
                }
            )

        return ParameterListResponse(
            blood_parameters=blood_params,
            arterial_parameters=arterial_params,
            radiology_types=radiology_types,
            microbiology_parameters=microbiology_params,
        )

    @staticmethod
    async def validate_parameter(
        request: ValidateParameterRequest,
    ) -> ValidateParameterResponse:
        """Validate a parameter name and value"""
        try:
            if request.investigation_type == InvestigationType.BLOOD_ANALYSIS:
                param_enum = BloodAnalysisParameter(request.parameter_name)
                param_info = BLOOD_PARAMETER_INFO.get(param_enum)

            elif request.investigation_type == InvestigationType.ARTERIAL_ANALYSIS:
                param_enum = ArterialAnalysisParameter(request.parameter_name)
                param_info = ARTERIAL_PARAMETER_INFO.get(param_enum)

            elif request.investigation_type == InvestigationType.MICROBIOLOGY:
                param_enum = MicrobiologyParameter(request.parameter_name)
                param_info = MICROBIOLOGY_PARAMETER_INFO.get(param_enum)

            else:
                return ValidateParameterResponse(
                    is_valid=False,
                    error_message="Invalid investigation type for parameter validation",
                )

            # Basic validation passed
            return ValidateParameterResponse(
                is_valid=True,
                parameter_info={
                    "display_name": (
                        param_info.display_name
                        if param_info
                        else request.parameter_name
                    ),
                    "enum_value": param_enum.value,
                },
            )

        except ValueError:
            return ValidateParameterResponse(
                is_valid=False,
                error_message=f"Invalid parameter: {request.parameter_name}",
            )

    @staticmethod
    async def add_radiology_type_with_files(
        report_id: str,
        files: List[UploadFile],
        radiology_type: RadiologyType,
        subtype: Optional[str],
        reported_by: Optional[str],
        current_user: dict,
        organisation_id: str,
    ) -> InvestigationReportDetailResponse:
        """Add a new radiology type with files without replacing existing ones"""
        async with await InvestigationReport.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    # Find report
                    report = await InvestigationReport.find_one(
                        {
                            "report_id": report_id,
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not report:
                        raise NotFoundError("Investigation report not found")

                    # Initialize radiology_list if not exists
                    if (
                        not hasattr(report, "radiology_list")
                        or report.radiology_list is None
                    ):
                        report.radiology_list = []

                    # Check if this radiology type already exists
                    existing_index = None
                    for idx, rad in enumerate(report.radiology_list):
                        if (
                            rad.radiology_type == radiology_type
                            and rad.subtype == subtype
                        ):
                            existing_index = idx
                            break

                    # Upload files
                    uploaded_keys = []
                    folder_path = f"investigation-reports/{organisation_id}/{report.patient_id}/{report_id}/radiology/{radiology_type.value}"

                    if subtype:
                        folder_path += f"/{subtype.replace(' ', '_')}"

                    # Validate and upload files
                    allowed_types = [
                        "image/jpeg",
                        "image/jpg",
                        "image/png",
                        "image/dicom",
                        "application/dicom",
                        "image/x-dicom",
                        "image/tiff",
                        "image/bmp",
                        "application/pdf",
                    ]

                    for file in files:
                        content_type = (
                            file.content_type or mimetypes.guess_type(file.filename)[0]
                        )

                        if content_type not in allowed_types:
                            raise ValidationError(
                                message=f"Invalid file type: {file.filename}",
                                error_code="INVALID_FILE_TYPE",
                            )

                        # Check file size
                        file_content = await file.read()
                        file_size = len(file_content)
                        await file.seek(0)

                        if file_size > 50 * 1024 * 1024:  # 50MB
                            raise ValidationError(
                                message=f"File {file.filename} is too large",
                                error_code="FILE_TOO_LARGE",
                            )

                        # Upload file
                        metadata = {
                            "report_id": report_id,
                            "patient_id": report.patient_id,
                            "organisation_id": organisation_id,
                            "uploaded_by": updated_by,
                            "radiology_type": radiology_type.value,
                            "subtype": subtype or "",
                        }

                        result = await s3.upload_file(
                            file=file, folder=folder_path, metadata=metadata
                        )

                        uploaded_keys.append(result["key"])

                    # Create radiology data
                    new_radiology_data = RadiologyData(
                        radiology_type=radiology_type,
                        subtype=subtype,
                        file_keys=uploaded_keys,
                        number_of_images=len(uploaded_keys),
                        reported_by=reported_by,
                        reported_at=datetime.now(UTC),
                    )

                    # Update or append
                    if existing_index is not None:
                        # Append files to existing radiology type
                        report.radiology_list[existing_index].file_keys.extend(
                            uploaded_keys
                        )
                        report.radiology_list[existing_index].number_of_images = len(
                            report.radiology_list[existing_index].file_keys
                        )
                        report.radiology_list[existing_index].reported_at = (
                            datetime.now(UTC)
                        )
                        if reported_by:
                            report.radiology_list[existing_index].reported_by = (
                                reported_by
                            )
                    else:
                        # Add new radiology type
                        report.radiology_list.append(new_radiology_data)

                    # Update report
                    update_data = {
                        "radiology_list": [
                            rad.model_dump() for rad in report.radiology_list
                        ],
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }

                    await report.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await InvestigationReportService._invalidate_cache(
                        report_id=report_id, patient_id=report.patient_id
                    )

                    logger.info(
                        f"Added radiology type {radiology_type.value} with {len(uploaded_keys)} images to report {report_id}"
                    )

                    return await InvestigationReportService.get_report(
                        report_id, current_user
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error adding radiology type with files: {e}")
                    raise e


    @staticmethod
    async def delete_radiology_images(
        report_id: str,
        file_keys: List[str],
        current_user: dict,
        organisation_id: str,
    ) -> InvestigationReportDetailResponse:
        """Delete radiology images from a report"""
        async with await InvestigationReport.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    # Find report
                    report = await InvestigationReport.find_one(
                        {
                            "report_id": report_id,
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not report:
                        raise NotFoundError("Investigation report not found")

                    if not report.radiology_list:
                        raise ValidationError(
                            message="No radiology images found in this report",
                            error_code="NO_RADIOLOGY_IMAGES",
                        )

                    # Track deleted files
                    deleted_files = []
                    failed_deletes = []

                    # Delete files from S3
                    for file_key in file_keys:
                        try:
                            await s3.delete_file(file_key)
                            deleted_files.append(file_key)
                        except Exception as e:
                            logger.warning(f"Failed to delete file {file_key} from S3: {e}")
                            failed_deletes.append(file_key)

                    # Update radiology_list to remove deleted file keys
                    updated_radiology_list = []
                    for rad_entry in report.radiology_list:
                        # Remove deleted keys from file_keys
                        remaining_keys = [
                            key for key in rad_entry.file_keys 
                            if key not in deleted_files
                        ]
                        
                        # Only keep the radiology entry if it still has files
                        if remaining_keys:
                            rad_entry.file_keys = remaining_keys
                            rad_entry.number_of_images = len(remaining_keys)
                            updated_radiology_list.append(rad_entry)

                    # Update report
                    update_data = {
                        "radiology_list": [
                            rad.model_dump() for rad in updated_radiology_list
                        ] if updated_radiology_list else [],
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }

                    await report.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await InvestigationReportService._invalidate_cache(
                        report_id=report_id, patient_id=report.patient_id
                    )

                    logger.info(
                        f"Deleted {len(deleted_files)} radiology images from report {report_id}"
                    )

                    return await InvestigationReportService.get_report(
                        report_id, current_user
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error deleting radiology images: {e}")
                    raise e


investigation_report_service = InvestigationReportService()
