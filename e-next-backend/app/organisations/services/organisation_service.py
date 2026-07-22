from datetime import timedelta

from bson import ObjectId

from app.base.models import DuplicateError, NotFoundError
import logging

logger = logging.getLogger(__name__)

from ..filters import OrganisationFilterParams
from ..models import Organisation
from ..schemas import OrganisationResponse


class OrganisationService:
    """Organisation service"""

    @staticmethod
    async def get_organisation(organisation_id: str) -> Organisation:
        """Get organisation by ID"""
        organisation = await Organisation.find_one(
            {"_id": ObjectId(organisation_id), "is_active": True, "is_deleted": False}
        )
        if not organisation:
            raise NotFoundError("Organisation not found")
        
        return organisation

    @staticmethod
    async def create_organisation(
        organisation_data: dict, current_user: dict
    ) -> Organisation:
        """Create a new organisation"""
        async with await Organisation.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    # Check for existing organisation
                    existing = await Organisation.find_one(
                        {
                            "unique_id": organisation_data["unique_id"],
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing:
                        raise DuplicateError("Organisation already exists")

                    # Create organisation
                    organisation = await Organisation.create(
                        **organisation_data,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        session=session,
                    )

                    # Commit transaction
                    await session.commit_transaction()
                    return organisation
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def update_organisation(
        organisation_id: str, organisation_data: dict, current_user: dict
    ) -> Organisation:
        """Update an existing organisation"""
        async with await Organisation.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    update_data = {
                        **organisation_data,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }
                    update_data = {
                        k: v for k, v in update_data.items() if v is not None
                    }
                    # Check for existing organisation
                    existing = await Organisation.find_one(
                        {
                            "_id": ObjectId(organisation_id),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Organisation not found")

                    # Update organisation
                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    return existing
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def delete_organisation(organisation_id: str, current_user: dict) -> None:
        """Delete an existing organisation"""
        async with await Organisation.get_collection().database.client.start_session() as session:
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
                    # Check for existing organisation
                    existing = await Organisation.find_one(
                        {
                            "_id": ObjectId(organisation_id),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Organisation not found")

                    # Delete organisation
                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def get_all_organisations(params: OrganisationFilterParams) -> dict:
        """Get all organisations"""
        from app.patients.models import Patient
        from app.patients.enums import PatientStatus
        from app.organisations.models import OrganisationICUBed, OrganisationICU
        
        filter_query = {"is_active": True, "is_deleted": False}
        if params.name:
            filter_query["name"] = {"$regex": params.name, "$options": "i"}
        if params.unique_id:
            filter_query["unique_id"] = {"$regex": params.unique_id, "$options": "i"}

        skip = (params.page - 1) * params.limit
        sort_field = params.sort_by or "created_at"
        sort_order = 1 if params.sort_order == "asc" else -1

        # Optimized aggregation pipeline with $lookup to avoid N+1 queries
        pipeline = [
            {"$match": filter_query},
            # Lookup ICUs for this organisation
            {
                "$lookup": {
                    "from": "organisation_icus",
                    "let": {"org_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$organisation_id", "$$org_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]}
                                    ]
                                }
                            }
                        },
                        {"$project": {"_id": 1}}
                    ],
                    "as": "icus"
                }
            },
            # Extract ICU IDs for bed lookup
            {
                "$addFields": {
                    "icu_ids": {
                        "$map": {
                            "input": "$icus",
                            "as": "icu",
                            "in": {"$toString": "$$icu._id"}
                        }
                    }
                }
            },
            # Lookup beds for all ICUs of this organisation
            {
                "$lookup": {
                    "from": "organisation_icu_beds",
                    "let": {"icu_ids": "$icu_ids"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$in": ["$organisation_icu_id", "$$icu_ids"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]}
                                    ]
                                }
                            }
                        },
                        {"$count": "total"}
                    ],
                    "as": "bed_count_result"
                }
            },
            # Lookup active patients for this organisation
            {
                "$lookup": {
                    "from": "patients",
                    "let": {"org_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$organisation_id", "$$org_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                        {"$eq": ["$status", PatientStatus.ADMISSION]}
                                    ]
                                }
                            }
                        },
                        {"$count": "total"}
                    ],
                    "as": "patient_count_result"
                }
            },
            # Calculate counts
            {
                "$addFields": {
                    "total_beds_count": {
                        "$ifNull": [
                            {"$arrayElemAt": ["$bed_count_result.total", 0]},
                            0
                        ]
                    },
                    "active_patients_count": {
                        "$ifNull": [
                            {"$arrayElemAt": ["$patient_count_result.total", 0]},
                            0
                        ]
                    }
                }
            },
            # Sort before projection (to use original field names)
            {"$sort": {sort_field: sort_order}},
            # Project final fields
            {
                "$project": {
                    "_id": 0,
                    "id": {"$toString": "$_id"},
                    "unique_id": 1,
                    "name": 1,
                    "location": 1,
                    "created_at": 1,
                    "updated_at": 1,
                    "active_patients_count": 1,
                    "total_beds_count": 1
                }
            },
        ]

        # Get total count
        count_pipeline = [
            {"$match": filter_query},
            {"$count": "total"}
        ]
        count_result = await Organisation.get_collection().aggregate(count_pipeline).to_list(length=1)
        total = count_result[0]["total"] if count_result else 0

        # Get paginated results
        paginated_pipeline = pipeline + [
            {"$skip": skip},
            {"$limit": params.limit}
        ]
        
        organisations = await Organisation.get_collection().aggregate(paginated_pipeline).to_list(length=None)

        pages = (total + params.limit - 1) // params.limit if total > 0 else 1
        has_next = params.page < pages
        has_prev = params.page > 1

        response = {
            "items": organisations,
            "total": total,
            "page": params.page,
            "limit": params.limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }
        
        return response


organisation_service = OrganisationService()
