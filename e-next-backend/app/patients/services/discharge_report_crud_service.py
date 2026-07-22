from datetime import timedelta

from app.base.models import DuplicateError, NotFoundError
from app.core import cache

from ..models import DischargeReport


class DischargeReportCRUDService:
    """Discharge Report CRUD service"""

    CACHE_KEY_PREFIX = "discharge_report"
    LIST_CACHE_KEY_PREFIX = "discharge_report_list"
    CACHE_TIMEOUT = timedelta(minutes=30)

    @staticmethod
    async def _invalidate_cache(patient_id: str = None) -> None:
        """Invalidate cache"""
        if patient_id:
            await cache.delete(
                f"{DischargeReportCRUDService.CACHE_KEY_PREFIX}:{patient_id}"
            )
        await cache.delete_pattern(
            f"{DischargeReportCRUDService.LIST_CACHE_KEY_PREFIX}:*"
        )

    @staticmethod
    async def get_discharge_report(
        patient_id: str,
    ) -> DischargeReport:
        """Get discharge report by patient ID"""
        cache_key = f"{DischargeReportCRUDService.CACHE_KEY_PREFIX}:{patient_id}"
        cached_discharge_report = await cache.get(cache_key)
        if cached_discharge_report:
            return DischargeReport.model_validate(cached_discharge_report)

        discharge_report = await DischargeReport.find_one(
            {
                "patient_id": patient_id,
                "is_active": True,
                "is_deleted": False,
            }
        )

        if not discharge_report:
            raise NotFoundError("Discharge report not found")

        await cache.set(
            cache_key,
            discharge_report.model_dump(mode="json"),
            DischargeReportCRUDService.CACHE_TIMEOUT,
        )
        return discharge_report

    @staticmethod
    async def create_discharge_report(
        discharge_report_data: dict, current_user: dict
    ) -> DischargeReport:
        """Create discharge report"""
        async with await DischargeReport.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = discharge_report_data["organisation_id"]

                    # Check for existing discharge report
                    existing = await DischargeReport.find_one(
                        {
                            "patient_id": discharge_report_data["patient_id"],
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing:
                        raise DuplicateError("Discharge report already exists")

                    discharge_report = await DischargeReport.create(
                        **discharge_report_data,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        session=session,
                    )

                    await session.commit_transaction()
                    await DischargeReportCRUDService._invalidate_cache(
                        discharge_report_data["patient_id"]
                    )
                    return discharge_report
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def update_discharge_report(
        patient_id: str, discharge_report_data: dict, current_user: dict
    ) -> DischargeReport:
        """Update discharge report"""
        async with await DischargeReport.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    update_data = {
                        k: v for k, v in discharge_report_data.items() if v is not None
                    }
                    update_data["updated_by"] = updated_by
                    update_data["updated_by_profile"] = updated_by_profile

                    # Check for existing discharge report
                    existing = await DischargeReport.find_one(
                        {
                            "patient_id": patient_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Discharge report not found")

                    # Update discharge report
                    await existing.update(update_data)

                    await session.commit_transaction()
                    await DischargeReportCRUDService._invalidate_cache(patient_id)
                    return existing
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def delete_discharge_report(patient_id: str, current_user: dict) -> None:
        """Delete discharge report"""
        async with await DischargeReport.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    update_data = {
                        "is_active": False,
                        "is_deleted": True,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }

                    # Check for existing discharge report
                    existing = await DischargeReport.find_one(
                        {
                            "patient_id": patient_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Discharge report not found")

                    # Delete discharge report
                    await existing.update(update_data)

                    await session.commit_transaction()
                    await DischargeReportCRUDService._invalidate_cache(patient_id)
                except Exception as e:
                    await session.abort_transaction()
                    raise e


discharge_report_crud_service = DischargeReportCRUDService()

