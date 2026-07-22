from datetime import UTC, datetime, timedelta

from bson import ObjectId

from app.accounts.enums import UserType
from app.base.models import DuplicateError, NotFoundError
from app.utils import decrypt_user_type

from ..filters import OrganisationICUFilterParams
from ..models import Organisation, OrganisationICU, OrganisationICUBed
from ..schemas import OrganisationICUResponse


class OrganisationICUService:
    """Organisation ICU service"""

    @staticmethod
    async def get_organisation_icu(organisation_icu_id: str) -> OrganisationICU:
        """Get organisation ICU by ID"""
        # Use aggregation pipeline to get ICU with bed count
        pipeline = [
            {
                "$match": {
                    "_id": ObjectId(organisation_icu_id),
                    "is_active": True,
                    "is_deleted": False,
                }
            },
            # Lookup beds and count them
            {
                "$lookup": {
                    "from": "organisation_icu_beds",
                    "let": {"icu_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$organisation_icu_id", "$$icu_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "beds",
                }
            },
            # Add total_beds field
            {
                "$addFields": {
                    "total_beds": {"$size": "$beds"},
                    "id": {"$toString": "$_id"},  # Convert _id to string
                }
            },
            # Remove beds array and _id to keep response clean
            {
                "$project": {
                    "beds": 0,
                }
            },
        ]

        result = (
            await OrganisationICU.get_collection().aggregate(pipeline).to_list(length=1)
        )
        if not result:
            raise NotFoundError("Organisation ICU not found")

        # Convert the result to the expected format
        organisation_icu_data = result[0]

        response = OrganisationICUResponse(
            id=str(organisation_icu_data["_id"]),
            organisation_id=organisation_icu_data["organisation_id"],
            name=organisation_icu_data["name"],
            total_beds=organisation_icu_data["total_beds"],
            created_at=organisation_icu_data["created_at"],
            updated_at=organisation_icu_data["updated_at"],
        )

        return response

    @staticmethod
    async def get_organisation_icus(
        params: OrganisationICUFilterParams,
        current_user: dict,
    ) -> list[OrganisationICU]:
        """Get all organisation ICUs"""
        encrypted_user_type = current_user["ut"]
        user_type = UserType(decrypt_user_type(encrypted_user_type))

        filter_query = {"is_active": True, "is_deleted": False}
        if UserType.requires_organisation_id(user_type):
            if hasattr(params, "organisation_id") and params.organisation_id:
                filter_query["organisation_id"] = params.organisation_id
        else:
            filter_query["organisation_id"] = current_user["oid"]

        if params.organisation_id:
            filter_query["organisation_id"] = params.organisation_id
        if params.name:
            filter_query["name"] = {"$regex": params.name, "$options": "i"}

        skip = (params.page - 1) * params.limit
        sort_field = params.sort_by or "created_at"
        sort_order = 1 if params.sort_order == "asc" else -1

        pipeline = [
            {"$match": filter_query},
            # Lookup beds and count them
            {
                "$lookup": {
                    "from": "organisation_icu_beds",
                    "let": {"icu_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$organisation_icu_id", "$$icu_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "beds",
                }
            },
            # Add total_beds field
            {"$addFields": {"total_beds": {"$size": "$beds"}}},
            # Remove beds array to keep response clean
            {"$project": {"beds": 0}},
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

        result = (
            await OrganisationICU.get_collection().aggregate(pipeline).to_list(length=1)
        )
        result = result[0] if result else {"metadata": {"total": 0}, "data": []}

        total = result["metadata"][0]["total"] if result["metadata"] else 0
        organisation_icus = [
            OrganisationICUResponse(
                id=str(organisation_icu["_id"]),
                organisation_id=organisation_icu["organisation_id"],
                name=organisation_icu["name"],
                total_beds=organisation_icu.get(
                    "total_beds", 0
                ),  # Add total_beds to response
                created_at=organisation_icu["created_at"],
                updated_at=organisation_icu["updated_at"],
            ).model_dump(mode="json")
            for organisation_icu in result["data"]
        ]

        pages = (total + params.limit - 1) // params.limit
        has_next = params.page < pages
        has_prev = params.page > 1

        response = {
            "items": organisation_icus,
            "total": total,
            "page": params.page,
            "limit": params.limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }

        return response

    @staticmethod
    async def create_organisation_icu(
        organisation_icu_data: dict, current_user: dict
    ) -> OrganisationICU:
        """Create a new organisation ICU"""
        async with await OrganisationICU.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    # Check for existing organisation
                    organisation = await Organisation.find_one(
                        {
                            "_id": ObjectId(organisation_icu_data["organisation_id"]),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not organisation:
                        raise NotFoundError("Organisation not found")

                    # Check for existing organisation ICU
                    existing = await OrganisationICU.find_one(
                        {
                            "organisation_id": organisation_icu_data["organisation_id"],
                            "name": organisation_icu_data["name"],
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing:
                        raise DuplicateError("Organisation ICU already exists")

                    # Create organisation ICU
                    organisation_icu = await OrganisationICU.create(
                        **organisation_icu_data,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        session=session,
                    )

                    # Commit transaction
                    await session.commit_transaction()
                    return organisation_icu
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def update_organisation_icu(
        organisation_icu_id: str, organisation_icu_data: dict, current_user: dict
    ) -> OrganisationICU:
        """Update an existing organisation ICU"""
        async with await OrganisationICU.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    update_data = {
                        **organisation_icu_data,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }
                    update_data = {
                        k: v for k, v in update_data.items() if v is not None
                    }

                    # Check for existing organisation ICU
                    existing = await OrganisationICU.find_one(
                        {
                            "_id": ObjectId(organisation_icu_id),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Organisation ICU not found")

                    if "organisation_id" in update_data:
                        # Check for existing organisation
                        organisation = await Organisation.find_one(
                            {
                                "_id": ObjectId(update_data["organisation_id"]),
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )

                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    return existing
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def delete_organisation_icu(
        organisation_icu_id: str, current_user: dict
    ) -> None:
        """Delete an existing organisation ICU"""
        async with await OrganisationICU.get_collection().database.client.start_session() as session:
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

                    # Check for existing organisation ICU
                    existing = await OrganisationICU.find_one(
                        {
                            "_id": ObjectId(organisation_icu_id),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Organisation ICU not found")

                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    return None
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def create_organisation_icu_with_beds(
        organisation_icu_data: dict, current_user: dict
    ) -> OrganisationICU:
        """Create a new organisation ICU with beds"""
        async with await OrganisationICU.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    current_time = datetime.now()

                    # Check for existing organisation
                    organisation = await Organisation.find_one(
                        {
                            "_id": ObjectId(organisation_icu_data["organisation_id"]),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not organisation:
                        raise NotFoundError("Organisation not found")

                    # Check for existing organisation ICU
                    existing = await OrganisationICU.find_one(
                        {
                            "organisation_id": organisation_icu_data["organisation_id"],
                            "name": organisation_icu_data["name"],
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing:
                        raise DuplicateError("Organisation ICU already exists")

                    # Create organisation ICU
                    organisation_icu = await OrganisationICU.create(
                        organisation_id=organisation_icu_data["organisation_id"],
                        name=organisation_icu_data["name"],
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        session=session,
                    )

                    # Create beds
                    beds_to_create = []
                    for bed_number in range(1, organisation_icu_data["total_beds"] + 1):
                        bed_data = {
                            "organisation_icu_id": str(organisation_icu.id),
                            "bed_number": bed_number,
                            "is_available": True,
                            "created_by": created_by,
                            "created_by_profile": created_by_profile,
                            "updated_by": updated_by,
                            "updated_by_profile": updated_by_profile,
                            "is_active": True,
                            "is_deleted": False,
                            "created_at": current_time,
                            "updated_at": current_time,
                        }
                        beds_to_create.append(bed_data)

                    # Bulk create beds
                    if beds_to_create:
                        await OrganisationICUBed.get_collection().insert_many(
                            beds_to_create
                        )

                    # Commit transaction
                    await session.commit_transaction()

                    # Return the created ICU with total beds
                    return await OrganisationICUService.get_organisation_icu(
                        str(organisation_icu.id)
                    )
                except Exception as e:
                    await session.abort_transaction()
                    raise e


organisation_icu_service = OrganisationICUService()
