from bson import ObjectId

from app.base.models import DuplicateError, NotFoundError

from ..filters import OrganisationICUBedFilterParams
from ..models import OrganisationICU, OrganisationICUBed
from ..schemas import OrganisationICUBedResponse


class OrganisationICUBedService:
    """Organisation ICU bed service"""

    @staticmethod
    async def get_organisation_icu_bed(
        organisation_icu_bed_id: str,
    ) -> OrganisationICUBed:
        """Get organisation ICU bed by ID"""
        organisation_icu_bed = await OrganisationICUBed.find_one(
            {
                "_id": ObjectId(organisation_icu_bed_id),
                "is_active": True,
                "is_deleted": False,
            }
        )
        if not organisation_icu_bed:
            raise NotFoundError("Organisation ICU bed not found")

        return organisation_icu_bed

    @staticmethod
    async def get_organisation_icu_beds(
        params: OrganisationICUBedFilterParams,
    ) -> list[OrganisationICUBed]:
        """Get all organisation ICU beds"""
        filter_query = {"is_active": True, "is_deleted": False}
        if params.organisation_icu_id:
            filter_query["organisation_icu_id"] = params.organisation_icu_id
        if params.bed_number:
            filter_query["bed_number"] = params.bed_number
        if params.is_available:
            filter_query["is_available"] = params.is_available

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

        result = (
            await OrganisationICUBed.get_collection()
            .aggregate(pipeline)
            .to_list(length=1)
        )
        result = result[0] if result else {"metadata": {"total": 0}, "data": []}

        total = result["metadata"][0]["total"] if result["metadata"] else 0
        organisation_icu_beds = [
            OrganisationICUBedResponse(
                id=str(organisation_icu_bed["_id"]),
                organisation_icu_id=organisation_icu_bed["organisation_icu_id"],
                bed_number=organisation_icu_bed["bed_number"],
                is_available=organisation_icu_bed["is_available"],
                created_at=organisation_icu_bed["created_at"],
                updated_at=organisation_icu_bed["updated_at"],
            ).model_dump(mode="json")
            for organisation_icu_bed in result["data"]
        ]

        pages = (total + params.limit - 1) // params.limit
        has_next = params.page < pages
        has_prev = params.page > 1

        response = {
            "items": organisation_icu_beds,
            "total": total,
            "page": params.page,
            "limit": params.limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }

        return response

    @staticmethod
    async def create_organisation_icu_bed(
        organisation_icu_bed_data: dict, current_user: dict
    ) -> OrganisationICUBed:
        """Create a new organisation ICU bed"""
        async with await OrganisationICUBed.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    # Check for existing organisation ICU
                    organisation_icu = await OrganisationICU.find_one(
                        {
                            "_id": ObjectId(
                                organisation_icu_bed_data["organisation_icu_id"]
                            ),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not organisation_icu:
                        raise NotFoundError("Organisation ICU not found")

                    # Check for existing organisation ICU bed
                    existing = await OrganisationICUBed.find_one(
                        {
                            "organisation_icu_id": organisation_icu_bed_data[
                                "organisation_icu_id"
                            ],
                            "bed_number": organisation_icu_bed_data["bed_number"],
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing:
                        raise DuplicateError("Organisation ICU bed already exists")

                    # Create organisation ICU bed
                    organisation_icu_bed = await OrganisationICUBed.create(
                        **organisation_icu_bed_data,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        session=session,
                    )

                    # Commit transaction
                    await session.commit_transaction()
                    return organisation_icu_bed
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def update_organisation_icu_bed(
        organisation_icu_bed_id: str,
        organisation_icu_bed_data: dict,
        current_user: dict,
    ) -> OrganisationICUBed:
        """Update an existing organisation ICU bed"""
        async with await OrganisationICUBed.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    update_data = {
                        **organisation_icu_bed_data,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }
                    update_data = {
                        k: v for k, v in update_data.items() if v is not None
                    }

                    # Check for existing organisation ICU bed
                    existing = await OrganisationICUBed.find_one(
                        {
                            "_id": ObjectId(organisation_icu_bed_id),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Organisation ICU bed not found")

                    if "organisation_icu_id" in update_data:
                        # Check for existing organisation ICU
                        organisation_icu = await OrganisationICU.find_one(
                            {
                                "_id": ObjectId(update_data["organisation_icu_id"]),
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )
                        if not organisation_icu:
                            raise NotFoundError("Organisation ICU not found")

                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    return existing
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def delete_organisation_icu_bed(
        organisation_icu_bed_id: str, current_user: dict
    ) -> None:
        """Delete an existing organisation ICU bed"""
        async with await OrganisationICUBed.get_collection().database.client.start_session() as session:
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

                    # Check for existing organisation ICU bed
                    existing = await OrganisationICUBed.find_one(
                        {
                            "_id": ObjectId(organisation_icu_bed_id),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Organisation ICU bed not found")

                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    return None
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def get_available_beds(organisation_icu_id: str) -> list[OrganisationICUBed]:
        """Get available beds for an organisation ICU"""
        pipeline = [
            {
                "$match": {
                    "organisation_icu_id": organisation_icu_id,
                    "is_available": True,
                    "is_active": True,
                    "is_deleted": False,
                }
            },
            {"$sort": {"bed_number": 1}},  # Sort by bed number for consistent ordering
            {
                "$project": {
                    "_id": 1,
                    "organisation_icu_id": 1,
                    "bed_number": 1,
                    "is_available": 1,
                    "created_at": 1,
                    "updated_at": 1,
                }
            },
        ]

        beds = (
            await OrganisationICUBed.get_collection()
            .aggregate(pipeline)
            .to_list(length=None)
        )

        available_beds = [
            OrganisationICUBedResponse(
                id=str(bed["_id"]),
                organisation_icu_id=bed["organisation_icu_id"],
                bed_number=bed["bed_number"],
                is_available=bed["is_available"],
                created_at=bed["created_at"],
                updated_at=bed["updated_at"],
            )
            for bed in beds
        ]

        return available_beds


organisation_icu_bed_service = OrganisationICUBedService()
