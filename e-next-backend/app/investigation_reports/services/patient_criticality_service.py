from datetime import timedelta

from dateutil.parser import isoparse

from app.accounts.enums import UserType
from app.base.models import DuplicateError, NotFoundError
from app.core import cache
from app.utils import decrypt_user_type

from ..filters import PatientCriticalityFilterParams
from ..models import PatientCriticality
from ..schemas import PatientCriticalityResponseSchema


class PatientCriticalityService:
    """Patient Criticality Service"""

    CACHE_KEY_PREFIX = "patient_criticality"
    LIST_CACHE_KEY_PREFIX = "patient_criticality_list"
    CACHE_TIMEOUT = timedelta(minutes=30)

    @staticmethod
    async def _invalidate_cache(patient_id: str = None) -> None:
        """Invalidate cache"""
        if patient_id:
            await cache.delete_pattern(
                f"{PatientCriticalityService.LIST_CACHE_KEY_PREFIX}:{patient_id}:*"
            )
        await cache.delete_pattern(f"{PatientCriticalityService.LIST_CACHE_KEY_PREFIX}:*")

    @staticmethod
    async def get_patient_criticality(criticality_id: str) -> PatientCriticality:
        """Get patient criticality by ID"""
        cache_key = f"{PatientCriticalityService.CACHE_KEY_PREFIX}:{criticality_id}"
        cached_criticality = await cache.get(cache_key)
        if cached_criticality:
            return PatientCriticality.model_validate(cached_criticality)

        criticality = await PatientCriticality.find_one(
            {
                "criticality_id": criticality_id,
                "is_active": True,
                "is_deleted": False,
            }
        )

        if not criticality:
            raise NotFoundError("Patient criticality record not found")

        await cache.set(
            cache_key,
            criticality.model_dump(mode="json"),
            PatientCriticalityService.CACHE_TIMEOUT,
        )

        return criticality

    @staticmethod
    async def create_patient_criticality(
        criticality_data: dict, current_user: dict
    ) -> PatientCriticality:
        """Create patient criticality record"""
        if "date" in criticality_data and criticality_data["date"]:
            date = criticality_data["date"]
            if isinstance(date, str):
                date = isoparse(date)
            date = date.replace(second=0, microsecond=0)
            criticality_data["date"] = date

        async with await PatientCriticality.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = criticality_data["organisation_id"]

                    # Check for existing criticality record for the same patient and date
                    existing = await PatientCriticality.find_one(
                        {
                            "patient_id": criticality_data["patient_id"],
                            "date": criticality_data["date"],
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing:
                        raise DuplicateError("Patient criticality record already exists for this date")

                    criticality_data["criticality_id"] = (
                        await PatientCriticality.generate_criticality_id()
                    )

                    criticality = await PatientCriticality.create(
                        **criticality_data,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        session=session,
                    )

                    await session.commit_transaction()
                    await PatientCriticalityService._invalidate_cache(
                        criticality_data["patient_id"]
                    )
                    return criticality
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def update_patient_criticality(
        criticality_id: str, criticality_data: dict, current_user: dict
    ) -> PatientCriticality:
        """Update patient criticality record"""
        async with await PatientCriticality.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    update_data = {
                        **criticality_data,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }
                    update_data = {
                        k: v for k, v in update_data.items() if v is not None
                    }

                    # Check for existing criticality record
                    existing = await PatientCriticality.find_one(
                        {
                            "criticality_id": criticality_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Patient criticality record not found")

                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await PatientCriticalityService._invalidate_cache(existing.patient_id)
                    return existing
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def delete_patient_criticality(criticality_id: str, current_user: dict) -> None:
        """Delete patient criticality record"""
        async with await PatientCriticality.get_collection().database.client.start_session() as session:
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

                    # Check for existing criticality record
                    existing = await PatientCriticality.find_one(
                        {
                            "criticality_id": criticality_id,
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Patient criticality record not found")

                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await PatientCriticalityService._invalidate_cache(existing.patient_id)
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def get_patient_criticalities(
        filter_params: PatientCriticalityFilterParams, current_user: dict
    ) -> dict:
        """Get patient criticality records"""
        encrypted_user_type = current_user["ut"]
        user_type = UserType(decrypt_user_type(encrypted_user_type))
        cache_key = f"{PatientCriticalityService.LIST_CACHE_KEY_PREFIX}:{filter_params.page}:{filter_params.limit}:{filter_params.sort_by or 'created_at'}:{filter_params.sort_order}:{filter_params.patient_id or ''}:{filter_params.from_date or ''}:{filter_params.to_date or ''}:{filter_params.organisation_id or ''}"
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
            await PatientCriticality.get_collection().aggregate(pipeline).to_list(length=1)
        )
        result = result[0] if result else {"metadata": {"total": 0}, "data": []}

        total = result["metadata"][0]["total"] if result["metadata"] else 0
        criticalities = [
            PatientCriticalityResponseSchema(
                id=str(criticality["_id"]),
                criticality_id=criticality["criticality_id"],
                patient_id=criticality["patient_id"],
                date=criticality["date"],
                blood_pressure=criticality["blood_pressure"],
                heart_rate=criticality["heart_rate"],
                rhythm=criticality["rhythm"],
                spo2=criticality["spo2"],
                temp=criticality["temp"],
                remarks=criticality["remarks"],
                created_at=criticality["created_at"],
                updated_at=criticality["updated_at"],
            ).model_dump(mode="json")
            for criticality in result["data"]
        ]

        pages = (total + filter_params.limit - 1) // filter_params.limit
        has_next = filter_params.page < pages
        has_prev = filter_params.page > 1

        response = {
            "items": criticalities,
            "total": total,
            "page": filter_params.page,
            "limit": filter_params.limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }

        await cache.set(cache_key, response, PatientCriticalityService.CACHE_TIMEOUT)
        return response


patient_criticality_service = PatientCriticalityService()
