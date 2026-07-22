from bson import ObjectId

from app.accounts.enums import UserType
from app.accounts.models import User
from app.base.models import DuplicateError, NotFoundError
from app.utils import decrypt_user_type

from ..filters import OrganisationMemberFilterParams
from ..models import Organisation, OrganisationMember
from ..schemas import OrganisationMemberResponse


class OrganisationMemberService:
    """Organisation member service"""

    @staticmethod
    async def _update_user_current_organisation(
        user_id: str, organisation_id: str = None
    ) -> None:
        """Update user current organisation"""
        update_data = {"current_organisation_id": organisation_id}
        await User.get_collection().update_one(
            {"_id": ObjectId(user_id)}, {"$set": update_data}
        )

    @staticmethod
    async def get_organisation_member(
        organisation_member_id: str,
    ) -> OrganisationMember:
        """Get organisation member by ID"""
        organisation_member = await OrganisationMember.find_one(
            {
                "_id": ObjectId(organisation_member_id),
                "is_active": True,
                "is_deleted": False,
            }
        )
        if not organisation_member:
            raise NotFoundError("Organisation member not found")

        return organisation_member

    @staticmethod
    async def create_organisation_member(
        organisation_member_data: dict, current_user: dict
    ) -> OrganisationMember:
        """Create a new organisation member"""
        async with await OrganisationMember.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    # Check for existing organisation
                    organisation = await Organisation.find_one(
                        {
                            "_id": ObjectId(
                                organisation_member_data["organisation_id"]
                            ),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not organisation:
                        raise NotFoundError("Organisation not found")

                    # Check for existing user
                    user = await User.find_one(
                        {
                            "_id": ObjectId(organisation_member_data["user_id"]),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not user:
                        raise NotFoundError("User not found")

                    # Check for existing organisation member
                    existing = await OrganisationMember.find_one(
                        {
                            "organisation_id": organisation_member_data[
                                "organisation_id"
                            ],
                            "user_id": organisation_member_data["user_id"],
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing:
                        raise DuplicateError("Organisation member already exists")

                    # Create organisation member
                    organisation_member = await OrganisationMember.create(
                        **organisation_member_data,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        session=session,
                    )

                    # Update user current organisation if they don't have one
                    if not user.current_organisation_id:
                        await OrganisationMemberService._update_user_current_organisation(
                            organisation_member_data["user_id"],
                            organisation_member_data["organisation_id"],
                        )

                    # Commit transaction
                    await session.commit_transaction()
                    return organisation_member
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def update_organisation_member(
        organisation_member_id: str, organisation_member_data: dict, current_user: dict
    ) -> OrganisationMember:
        """Update an existing organisation member"""
        async with await OrganisationMember.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    update_data = {
                        **organisation_member_data,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }
                    update_data = {
                        k: v for k, v in update_data.items() if v is not None
                    }

                    # Check for existing organisation member
                    existing = await OrganisationMember.find_one(
                        {
                            "_id": ObjectId(organisation_member_id),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Organisation member not found")

                    if "user_id" in update_data:
                        # Check for existing user
                        user = await User.find_one(
                            {
                                "_id": ObjectId(update_data["user_id"]),
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )
                        if not user:
                            raise NotFoundError("User not found")

                    if "organisation_id" in update_data:
                        # Check for existing organisation
                        organisation = await Organisation.find_one(
                            {
                                "_id": ObjectId(update_data["organisation_id"]),
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )
                        if not organisation:
                            raise NotFoundError("Organisation not found")

                        # Update user current organisation
                        user = await User.find_one({"_id": ObjectId(existing.user_id)})
                        if (
                            user
                            and user.current_organisation_id != existing.organisation_id
                        ):
                            await OrganisationMemberService._update_user_current_organisation(
                                existing.user_id, update_data["organisation_id"]
                            )

                    # Update organisation member
                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    return existing
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def delete_organisation_member(
        organisation_member_id: str, current_user: dict
    ) -> None:
        """Delete an existing organisation member"""
        async with await OrganisationMember.get_collection().database.client.start_session() as session:
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
                    # Check for existing organisation member
                    existing = await OrganisationMember.find_one(
                        {
                            "_id": ObjectId(organisation_member_id),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Organisation member not found")

                    user = await User.find_one({"_id": ObjectId(existing.user_id)})
                    if (
                        user
                        and user.current_organisation_id == existing.organisation_id
                    ):
                        await OrganisationMemberService._update_user_current_organisation(
                            existing.user_id, None
                        )

                    # Delete organisation member
                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()

                    return None
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def get_all_organisation_members(
        params: OrganisationMemberFilterParams,
        current_user: dict,
    ) -> dict:
        """Get all organisation members"""
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
        if params.user_id:
            filter_query["user_id"] = params.user_id

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
            await OrganisationMember.get_collection()
            .aggregate(pipeline)
            .to_list(length=1)
        )
        result = result[0] if result else {"metadata": {"total": 0}, "data": []}

        total = result["metadata"][0]["total"] if result["metadata"] else 0
        organisation_members = [
            OrganisationMemberResponse(
                id=str(organisation_member["_id"]),
                organisation_id=organisation_member["organisation_id"],
                user_id=organisation_member["user_id"],
                created_at=organisation_member["created_at"],
                updated_at=organisation_member["updated_at"],
            )
            for organisation_member in result["data"]
        ]

        pages = (total + params.limit - 1) // params.limit
        has_next = params.page < pages
        has_prev = params.page > 1

        response = {
            "items": organisation_members,
            "total": total,
            "page": params.page,
            "limit": params.limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }

        return response

    @staticmethod
    async def get_organisations_by_user_id(user_id: str) -> list[Organisation]:
        """Get all organisations by user ID"""
        # First get the organisation IDs for the user
        member_pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "is_active": True,
                    "is_deleted": False,
                }
            },
            {"$project": {"organisation_id": 1}},
        ]

        # Get the organisation IDs
        members = (
            await OrganisationMember.get_collection()
            .aggregate(member_pipeline)
            .to_list(length=None)
        )
        organisation_ids = [ObjectId(member["organisation_id"]) for member in members]

        # Get the organisations
        organisation_pipeline = [
            {
                "$match": {
                    "_id": {"$in": organisation_ids},
                    "is_active": True,
                    "is_deleted": False,
                }
            },
            {"$addFields": {"id": {"$toString": "$_id"}}},
            {
                "$project": {
                    "_id": 0,
                    "id": 1,
                    "unique_id": 1,
                    "name": 1,
                    "location": 1,
                    "created_at": 1,
                    "updated_at": 1,
                }
            },
        ]

        organisations = (
            await Organisation.get_collection()
            .aggregate(organisation_pipeline)
            .to_list(length=None)
        )
        return organisations


organisation_member_service = OrganisationMemberService()
