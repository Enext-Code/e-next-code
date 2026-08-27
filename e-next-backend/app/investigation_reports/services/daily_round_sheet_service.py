from datetime import timedelta
import asyncio
import logging

from dateutil.parser import isoparse

from app.accounts.enums import UserType
from app.base.models import DuplicateError, NotFoundError
from app.core import cache
from app.masters.services import plan_line_template_service
from app.utils import decrypt_user_type

from ..filters import DailyRoundSheetFilterParams
from ..models import DailyRoundSheet
from ..schemas import DailyRoundSheetResponseSchema

logger = logging.getLogger(__name__)
_template_save_tasks = set()


class DailyRoundSheetService:
    """Daily Round Sheet Service"""

    CACHE_KEY_PREFIX = "daily_round_sheet"
    LIST_CACHE_KEY_PREFIX = "daily_round_sheet_list"
    CACHE_TIMEOUT = timedelta(minutes=30)

    @staticmethod
    async def _invalidate_cache(patient_id: str = None) -> None:
        """Invalidate cache"""
        if patient_id:
            await cache.delete_pattern(
                f"{DailyRoundSheetService.LIST_CACHE_KEY_PREFIX}:{patient_id}:*"
            )
        await cache.delete_pattern(f"{DailyRoundSheetService.LIST_CACHE_KEY_PREFIX}:*")

    @staticmethod
    def _save_plan_line_templates(sheet_data: dict, current_user: dict) -> None:
        """Save hint lines in the background so daily-round save is not blocked."""
        task = asyncio.create_task(
            DailyRoundSheetService._save_plan_line_templates_async(
                dict(sheet_data or {}), current_user
            )
        )
        _template_save_tasks.add(task)
        task.add_done_callback(_template_save_tasks.discard)

    @staticmethod
    async def _save_plan_line_templates_async(sheet_data: dict, current_user: dict) -> None:
        """Persist Plan of the Day, Current Issue and Current Treatment lines."""
        for field_type in ("prescription", "current_issue", "current_treatment"):
            field_value = sheet_data.get(field_type)
            if not field_value:
                continue
            try:
                await plan_line_template_service.upsert_lines(
                    field_type, field_value, current_user
                )
            except Exception as exc:
                logger.error("Failed to save %s templates: %s", field_type, exc)

    @staticmethod
    async def get_daily_round_sheet(sheet_id: str) -> DailyRoundSheet:
        """Get daily round sheet by ID"""
        cache_key = f"{DailyRoundSheetService.CACHE_KEY_PREFIX}:{sheet_id}"
        cached_daily_round_sheet = await cache.get(cache_key)
        if cached_daily_round_sheet:
            return DailyRoundSheet.model_validate(cached_daily_round_sheet)

        daily_round_sheet = await DailyRoundSheet.find_one(
            {
                "sheet_id": sheet_id,
                "is_active": True,
                "is_deleted": False,
            }
        )

        if not daily_round_sheet:
            raise NotFoundError("Daily round sheet not found")

        await cache.set(
            cache_key,
            daily_round_sheet.model_dump(mode="json"),
            DailyRoundSheetService.CACHE_TIMEOUT,
        )

        return daily_round_sheet

    @staticmethod
    async def create_daily_round_sheet(
        daily_round_sheet_data: dict, current_user: dict
    ) -> DailyRoundSheet:
        """Create daily round sheet"""
        if "date" in daily_round_sheet_data and daily_round_sheet_data["date"]:
            date = daily_round_sheet_data["date"]
            if isinstance(date, str):
                date = isoparse(date)
            date = date.replace(second=0, microsecond=0)
            daily_round_sheet_data["date"] = date

        async with await DailyRoundSheet.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = daily_round_sheet_data["organisation_id"]

                    # Check for existing daily round sheet
                    existing = await DailyRoundSheet.find_one(
                        {
                            "patient_id": daily_round_sheet_data["patient_id"],
                            "date": daily_round_sheet_data["date"],
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing:
                        raise DuplicateError("Daily round sheet already exists")

                    daily_round_sheet_data["sheet_id"] = (
                        await DailyRoundSheet.generate_sheet_id()
                    )

                    daily_round_sheet = await DailyRoundSheet.create(
                        **daily_round_sheet_data,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        session=session,
                    )

                    await session.commit_transaction()
                    await DailyRoundSheetService._invalidate_cache(
                        daily_round_sheet_data["patient_id"]
                    )
                    DailyRoundSheetService._save_plan_line_templates(
                        daily_round_sheet_data,
                        current_user,
                    )
                    return daily_round_sheet
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def update_daily_round_sheet(
        sheet_id: str, daily_round_sheet_data: dict, current_user: dict
    ) -> DailyRoundSheet:
        """Update daily round sheet"""
        async with await DailyRoundSheet.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    update_data = {
                        **daily_round_sheet_data,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }
                    update_data = {
                        k: v for k, v in update_data.items() if v is not None
                    }

                    # Check for existing daily round sheet
                    existing = await DailyRoundSheet.find_one(
                        {
                            "sheet_id": sheet_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Daily round sheet not found")

                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await DailyRoundSheetService._invalidate_cache(existing.patient_id)
                    DailyRoundSheetService._save_plan_line_templates(
                        update_data,
                        current_user,
                    )
                    return existing
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def delete_daily_round_sheet(sheet_id: str, current_user: dict) -> None:
        """Delete daily round sheet"""
        async with await DailyRoundSheet.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = str(current_user["oid"])

                    update_data = {
                        "is_active": False,
                        "is_deleted": True,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }

                    # Check for existing daily round sheet
                    existing = await DailyRoundSheet.find_one(
                        {
                            "sheet_id": sheet_id,
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Daily round sheet not found")

                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await DailyRoundSheetService._invalidate_cache(existing.patient_id)
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def get_daily_round_sheets(
        filter_params: DailyRoundSheetFilterParams, current_user: dict
    ) -> dict:
        """Get daily round sheets"""
        encrypted_user_type = current_user["ut"]
        user_type = UserType(decrypt_user_type(encrypted_user_type))
        cache_key = f"{DailyRoundSheetService.LIST_CACHE_KEY_PREFIX}:{filter_params.page}:{filter_params.limit}:{filter_params.sort_by or 'created_at'}:{filter_params.sort_order}:{filter_params.patient_id or ''}:{filter_params.from_date or ''}:{filter_params.to_date or ''}:{filter_params.organisation_id or ''}"
        cached_result = await cache.get(cache_key)
        if cached_result:
            return cached_result

        filter_query = {"is_active": True, "is_deleted": False}

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
        if filter_params.from_date:
            filter_query["date"] = {"$gte": filter_params.from_date}
        if filter_params.to_date:
            filter_query["date"] = {"$lte": filter_params.to_date}

        skip = (filter_params.page - 1) * filter_params.limit
        sort_by = filter_params.sort_by or "created_at"
        sort_order = 1 if filter_params.sort_order == "asc" else -1

        pipeline = [
            {"$match": filter_query},
            {"$sort": {sort_by: sort_order}},
            {
                "$facet": {
                    "metadata": [
                        {"$count": "total"},
                    ],
                    "data": [
                        {"$skip": skip},
                        {"$limit": filter_params.limit},
                    ],
                }
            },
        ]

        result = (
            await DailyRoundSheet.get_collection().aggregate(pipeline).to_list(length=1)
        )
        result = result[0] if result else {"metadata": {"total": 0}, "data": []}

        total = result["metadata"][0]["total"] if result["metadata"] else 0
        daily_round_sheets = [
            DailyRoundSheetResponseSchema(
                id=str(daily_round_sheet["_id"]),
                sheet_id=daily_round_sheet["sheet_id"],
                patient_id=daily_round_sheet["patient_id"],
                date=daily_round_sheet["date"],
                prescription=daily_round_sheet["prescription"],
                progress_sheet_id=daily_round_sheet["progress_sheet_id"],
                progress_sheet_datetime=daily_round_sheet["progress_sheet_datetime"],
                investigation_report_id=daily_round_sheet["investigation_report_id"],
                current_issue=daily_round_sheet["current_issue"],
                current_treatment=daily_round_sheet["current_treatment"],
                created_at=daily_round_sheet["created_at"],
                updated_at=daily_round_sheet["updated_at"],
            ).model_dump(mode="json")
            for daily_round_sheet in result["data"]
        ]

        pages = (total + filter_params.limit - 1) // filter_params.limit
        has_next = filter_params.page < pages
        has_prev = filter_params.page > 1

        response = {
            "items": daily_round_sheets,
            "total": total,
            "page": filter_params.page,
            "limit": filter_params.limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }

        await cache.set(cache_key, response, DailyRoundSheetService.CACHE_TIMEOUT)
        return response


daily_round_sheet_service = DailyRoundSheetService()
