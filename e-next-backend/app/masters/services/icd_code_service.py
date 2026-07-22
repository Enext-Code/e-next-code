import time
from datetime import timedelta
from typing import Any, Dict, List

from bson import ObjectId

from app.base.models import DuplicateError, NotFoundError
from app.core import cache

from ..filters import ICDCodeFilterParams
from ..models import ICDCode
from ..schemas import ICDCodeResponse


class ICDCodeService:
    """ICD Code service"""

    CACHE_KEY_PREFIX = "icd_code"
    LIST_CACHE_KEY_PREFIX = "icd_code_list"
    CACHE_TIMEOUT = timedelta(minutes=1440)

    @staticmethod
    async def _invalidate_cache(icd_code_id: str = None) -> None:
        """Invalidate cache"""
        if icd_code_id:
            await cache.delete(f"{ICDCodeService.CACHE_KEY_PREFIX}:{icd_code_id}")
        await cache.delete_pattern(f"{ICDCodeService.LIST_CACHE_KEY_PREFIX}:*")

    @staticmethod
    async def get_icd_code(icd_code_id: str) -> ICDCode:
        """Get ICD code by ID"""
        cache_key = f"{ICDCodeService.CACHE_KEY_PREFIX}:{icd_code_id}"
        cached_icd_code = await cache.get(cache_key)
        if cached_icd_code:
            return ICDCode.model_validate(cached_icd_code)

        icd_code = await ICDCode.find_one(
            {"_id": ObjectId(icd_code_id), "is_active": True, "is_deleted": False}
        )
        if not icd_code:
            raise NotFoundError("ICD code not found")

        await cache.set(
            cache_key, icd_code.model_dump(mode="json"), ICDCodeService.CACHE_TIMEOUT
        )
        return icd_code

    @staticmethod
    async def create_icd_code(icd_code_data: dict, current_user: dict) -> ICDCode:
        """Create a new ICD code"""
        async with await ICDCode.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    # Check for existing ICD code
                    existing = await ICDCode.find_one(
                        {
                            "code": icd_code_data["code"],
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing:
                        raise DuplicateError("ICD code already exists")

                    # Create ICD code
                    icd_code = await ICDCode.create(
                        **icd_code_data,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        session=session,
                    )

                    # Commit transaction
                    await session.commit_transaction()
                    await ICDCodeService._invalidate_cache()
                    return icd_code
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def update_icd_code(
        icd_code_id: str, icd_code_data: dict, current_user: dict
    ) -> ICDCode:
        """Update an existing ICD code"""
        async with await ICDCode.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    update_data = {
                        k: v for k, v in icd_code_data.items() if v is not None
                    }

                    # Check for existing ICD code
                    existing = await ICDCode.find_one(
                        {
                            "_id": ObjectId(icd_code_id),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("ICD code not found")

                    # Update ICD code
                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await ICDCodeService._invalidate_cache(icd_code_id)
                    return existing
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def delete_icd_code(icd_code_id: str, current_user: dict) -> None:
        """Delete an existing ICD code"""
        async with await ICDCode.get_collection().database.client.start_session() as session:
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

                    # Check for existing ICD code
                    existing = await ICDCode.find_one(
                        {
                            "_id": ObjectId(icd_code_id),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("ICD code not found")

                    # Delete ICD code
                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    await ICDCodeService._invalidate_cache(icd_code_id)
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def get_all_icd_codes(params: ICDCodeFilterParams) -> dict:
        """Get all ICD codes"""
        cache_key = f"{ICDCodeService.LIST_CACHE_KEY_PREFIX}:{hash(frozenset(params.model_dump().items()))}"
        cached_result = await cache.get(cache_key)
        if cached_result:
            return cached_result

        filter_query = {"is_active": True, "is_deleted": False}
        if params.code:
            filter_query["code"] = {"$regex": params.code, "$options": "i"}
        if params.description:
            filter_query["description"] = {
                "$regex": params.description,
                "$options": "i",
            }

        skip = (params.page - 1) * params.limit
        sort_field = params.sort_by or "created_at"
        sort_order = 1 if params.sort_order == "asc" else -1

        pipeline = [
            {"$match": filter_query},
            {"$sort": {sort_field: sort_order}},
            {
                "$facet": {
                    "metadata": [
                        {"$count": "total"},
                    ],
                    "data": [
                        {"$skip": skip},
                        {"$limit": params.limit},
                    ],
                }
            },
        ]

        result = await ICDCode.get_collection().aggregate(pipeline).to_list(length=1)
        result = result[0] if result else {"metadata": {"total": 0}, "data": []}

        total = result["metadata"][0]["total"] if result["metadata"] else 0
        items = [
            ICDCodeResponse(
                id=str(icd_code["_id"]),
                code=icd_code["code"],
                description=icd_code["description"],
                created_at=icd_code["created_at"],
                updated_at=icd_code["updated_at"],
            ).model_dump()
            for icd_code in result["data"]
        ]

        pages = (total + params.limit - 1) // params.limit
        has_next = params.page < pages
        has_prev = params.page > 1

        response = {
            "items": items,
            "total": total,
            "page": params.page,
            "limit": params.limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }

        await cache.set(cache_key, response, ICDCodeService.CACHE_TIMEOUT)
        return response

    @staticmethod
    async def bulk_create_icd_codes(
        items: List[Dict[str, Any]],
        current_user: dict,
        stop_on_error: bool = False,
        validate_only: bool = False,
        batch_size: int = 500,
    ) -> Dict[str, Any]:
        """Bulk create ICD codes"""
        start_time = time.time()
        results = {
            "total": len(items),
            "successful": 0,
            "failed": 0,
            "errors": [],
            "created_ids": [],
            "processing_time_ms": 0,
        }

        if not items:
            return results

        created_by = str(current_user["sub"])
        created_by_profile = str(current_user["pid"])

        collection = ICDCode.get_collection()

        validated_items = []
        existing_codes = set()

        all_codes = [item.get("code", "") for item in items if item.get("code")]
        if all_codes:
            existing_codes = await collection.find(
                {"code": {"$in": all_codes}, "is_active": True, "is_deleted": False}
            ).to_list()
            existing_codes = {doc.code for doc in existing_codes}

        batch_codes = set()

        for index, item in enumerate(items):
            code = item.get("code", "").strip()
            description = item.get("description", "").strip()

            if not code:
                results["failed"] += 1
                results["errors"].append(
                    {
                        "index": index,
                        "code": code,
                        "error": "Code is required",
                        "error_type": "validation_error",
                    }
                )
                if stop_on_error:
                    break
                continue

            if not description:
                results["failed"] += 1
                results["errors"].append(
                    {
                        "index": index,
                        "code": code,
                        "error": "Description is required",
                        "error_type": "validation_error",
                    }
                )
                if stop_on_error:
                    break
                continue

            if code in existing_codes:
                results["failed"] += 1
                results["errors"].append(
                    {
                        "index": index,
                        "code": code,
                        "error": "ICD code already exists",
                        "error_type": "validation_error",
                    }
                )
                if stop_on_error:
                    break
                continue

            if code in batch_codes:
                results["failed"] += 1
                results["errors"].append(
                    {
                        "index": index,
                        "code": code,
                        "error": "Duplicate code within batch",
                        "error_type": "validation_error",
                    }
                )
                if stop_on_error:
                    break
                continue

            batch_codes.add(code)
            validated_items.append(
                {
                    "index": index,
                    "data": {
                        "code": code,
                        "description": description,
                        "created_by": created_by,
                        "created_by_profile": created_by_profile,
                        "updated_by": created_by,
                        "updated_by_profile": created_by_profile,
                        "is_active": True,
                        "is_deleted": False,
                    },
                }
            )

        if validate_only:
            results["successful"] = len(validated_items)
            results["processing_time_ms"] = round((time.time() - start_time) * 1000)
            return results

        if validated_items:
            async with await collection.database.client.start_session() as session:
                async with session.start_transaction():
                    try:
                        for i in range(0, len(validated_items), batch_size):
                            batch = validated_items[i : i + batch_size]
                            documents = []
                            for item in batch:
                                doc = ICDCode(**item["data"])
                                documents.append(doc.model_dump(by_alias=True))
                            result = await collection.insert_many(
                                documents, session=session
                            )
                            for inserted_id, item in zip(result.inserted_ids, batch):
                                results["created_ids"].append(str(inserted_id))
                                results["successful"] += 1

                        await session.commit_transaction()
                        await ICDCodeService._invalidate_cache()
                    except Exception as e:
                        await session.abort_transaction()
                        processed_count = results["successful"]
                        for item in validated_items[processed_count:]:
                            results["failed"] += 1
                            results["errors"].append(
                                {
                                    "index": item["index"],
                                    "code": item["data"]["code"],
                                    "error": str(e),
                                    "error_type": "transaction_error",
                                }
                            )

        results["processing_time_ms"] = round((time.time() - start_time) * 1000)
        return results


icd_code_service = ICDCodeService()
