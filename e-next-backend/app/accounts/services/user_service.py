import logging

from bson import ObjectId

from app.base.models import DuplicateError, NotFoundError
from app.utils import decrypt_user_type, security

from ..enums import UserType
from ..filters import UserFilterParams
from ..models import User, UserProfile
from ..schemas import ProfileResponse, UserResponse

logger = logging.getLogger(__name__)


class UserService:
    """User service"""

    MAX_PROFILES_PER_USER = 5

    @staticmethod
    async def create_user_with_profile(user_data: dict) -> tuple[User, UserProfile]:
        """Create new user with primary profile"""
        async with await User.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Check for existing user
                    duplicate_conditions = [{"email": user_data["email"]}]
                    # Only check mobile number duplicate if both country_code and mobile_number are provided
                    if user_data.get("country_code") and user_data.get("mobile_number"):
                        duplicate_conditions.append({
                            "country_code": user_data["country_code"],
                            "mobile_number": user_data["mobile_number"],
                        })
                    existing = await User.find_one({"$or": duplicate_conditions})
                    if existing:
                        raise DuplicateError("User already exists")

                    # Generate username
                    username = await User.generate_unique_username()

                    # Extract profile data
                    profile_data = user_data.get("profile", {})
                    if not isinstance(profile_data, dict):
                        profile_data = profile_data.model_dump()

                    # Create user
                    user = await User.create(
                        username=username,
                        email=user_data["email"],
                        country_code=user_data.get("country_code"),
                        mobile_number=user_data.get("mobile_number"),
                        hashed_password=(
                            security.get_password_hash(user_data["password"])
                            if user_data.get("password")
                            else None
                        ),
                        created_by=user_data["created_by"],
                        updated_by=user_data["updated_by"],
                        created_by_profile=user_data["created_by_profile"],
                        updated_by_profile=user_data["updated_by_profile"],
                    )

                    # Create primary profile
                    profile = await UserProfile.create(
                        user_id=str(user.id),
                        user_type=profile_data.get("user_type"),
                        first_name=profile_data.get("first_name"),
                        last_name=profile_data.get("last_name"),
                        gender=profile_data.get("gender"),
                        date_of_birth=profile_data.get("date_of_birth"),
                        designation=profile_data.get("designation"),
                        role_type=profile_data.get("role_type"),
                        is_primary=True,
                        avatar=profile_data.get("avatar"),
                        signature=profile_data.get("signature"),
                        language=profile_data.get("language"),
                        theme=profile_data.get("theme"),
                        created_by=user_data["created_by"],
                        updated_by=user_data["updated_by"],
                        created_by_profile=user_data["created_by_profile"],
                        updated_by_profile=user_data["updated_by_profile"],
                    )

                    # Update user with profile IDs
                    user.primary_profile_id = str(profile.id)
                    user.current_profile_id = str(profile.id)
                    await user.save()

                    return user, profile

                except Exception as e:
                    logger.error(f"User creation error: {str(e)}")
                    raise

    @staticmethod
    async def get_user_details(user_id: str, profile_id: str = None) -> UserResponse:
        """Get user details with profiles"""
        user_filter = {"_id": ObjectId(user_id)}
        if profile_id:
            user_filter["current_profile_id"] = profile_id

        user = await User.find_one(user_filter)
        if not user:
            raise NotFoundError("User not found")

        profile = await user.get_active_profile()
        if not profile:
            raise NotFoundError("Profile not found")

        user_response = UserResponse(
            id=str(user.id),
            username=user.username,
            email=user.email,
            country_code=user.country_code,
            mobile_number=user.mobile_number,
            full_mobile_number=user.full_mobile_number,
            is_active=user.is_active,
            current_profile=ProfileResponse(
                id=str(profile.id),
                first_name=profile.first_name,
                last_name=profile.last_name,
                full_name=profile.full_name,
                user_type=profile.user_type,
                gender=profile.gender,
                date_of_birth=profile.date_of_birth,
                designation=profile.designation,
                role_type=profile.role_type,
                is_primary=profile.is_primary,
                avatar=profile.avatar,
                signature=profile.signature,
                language=profile.language,
                theme=profile.theme,
            ),
            current_organisation_id=user.current_organisation_id,
        )

        return user_response

    @staticmethod
    async def update_user(
        user_id: str, update_data: dict, updated_by: str, updated_by_profile: str
    ) -> User:
        """Update user details and optionally profile"""
        user = await User.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise NotFoundError("User not found")

        # Extract profile data if present
        profile_data = update_data.pop("profile", None)

        # Check for duplicate email or mobile if being updated
        if "email" in update_data or "mobile_number" in update_data:
            duplicate_query = {"_id": {"$ne": ObjectId(user_id)}}
            
            if "email" in update_data:
                duplicate_query["email"] = update_data["email"]
            
            if "mobile_number" in update_data and "country_code" in update_data:
                duplicate_query["country_code"] = update_data["country_code"]
                duplicate_query["mobile_number"] = update_data["mobile_number"]
            elif "mobile_number" in update_data:
                duplicate_query["country_code"] = user.country_code
                duplicate_query["mobile_number"] = update_data["mobile_number"]
            
            existing = await User.find_one(duplicate_query)
            if existing:
                raise DuplicateError("Email or mobile number already exists")

        # Update password if provided
        if "password" in update_data:
            update_data["hashed_password"] = security.get_password_hash(
                update_data.pop("password")
            )

        # Update audit fields
        update_data["updated_by"] = updated_by
        update_data["updated_by_profile"] = updated_by_profile

        # Update user
        for key, value in update_data.items():
            setattr(user, key, value)
        
        await user.save()

        # Update profile if profile data is provided
        if profile_data and isinstance(profile_data, dict):
            profile = await user.get_active_profile()
            if profile:
                # Update profile audit fields
                profile_data["updated_by"] = updated_by
                profile_data["updated_by_profile"] = updated_by_profile

                # Update profile fields
                for key, value in profile_data.items():
                    if hasattr(profile, key):
                        setattr(profile, key, value)
                
                await profile.save()

        return user

    @staticmethod
    async def activate_user(
        user_id: str, updated_by: str, updated_by_profile: str
    ) -> User:
        """Activate a user"""
        user = await User.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise NotFoundError("User not found")

        if user.is_active:
            raise DuplicateError("User is already active")

        user.is_active = True
        user.updated_by = updated_by
        user.updated_by_profile = updated_by_profile
        await user.save()

        return user

    @staticmethod
    async def deactivate_user(
        user_id: str, updated_by: str, updated_by_profile: str
    ) -> User:
        """Deactivate a user"""
        user = await User.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise NotFoundError("User not found")

        if not user.is_active:
            raise DuplicateError("User is already inactive")

        user.is_active = False
        user.updated_by = updated_by
        user.updated_by_profile = updated_by_profile
        await user.save()

        return user

    @staticmethod
    async def get_users_list(params: UserFilterParams, current_user: dict) -> dict:
        """Get users list with filters"""
        encrypted_user_type = current_user["ut"]
        user_type = UserType(decrypt_user_type(encrypted_user_type))

        # Build initial filter query
        filter_query = {"is_deleted": False}
        
        # Add is_active filter only if explicitly provided
        if params.is_active is not None:
            filter_query["is_active"] = params.is_active

        # Add user filters
        if params.email:
            filter_query["email"] = {"$regex": params.email, "$options": "i"}
        if params.country_code:
            filter_query["country_code"] = params.country_code
        if params.mobile_number:
            filter_query["mobile_number"] = {
                "$regex": params.mobile_number,
                "$options": "i",
            }

        # Add organisation filter
        if UserType.requires_organisation_id(user_type):
            if params.organisation_id:
                filter_query["current_organisation_id"] = params.organisation_id
        else:
            filter_query["current_organisation_id"] = current_user["oid"]

        skip = (params.page - 1) * params.limit
        sort_field = params.sort_by or "created_at"
        sort_order = 1 if params.sort_order == "asc" else -1

        # Build profile filter conditions
        profile_filters = []
        if params.first_name:
            profile_filters.append(
                {
                    "current_profile.first_name": {
                        "$regex": params.first_name,
                        "$options": "i",
                    }
                }
            )
        if params.last_name:
            profile_filters.append(
                {
                    "current_profile.last_name": {
                        "$regex": params.last_name,
                        "$options": "i",
                    }
                }
            )
        if params.user_type:
            profile_filters.append({"current_profile.user_type": params.user_type})
        if params.role_type:
            profile_filters.append(
                {
                    "current_profile.role_type": {
                        "$regex": params.role_type,
                        "$options": "i",
                    }
                }
            )

        # Pipeline with filters
        pipeline = [
            # Initial match for active users and user filters
            {"$match": filter_query},
            # Lookup current profile
            {
                "$lookup": {
                    "from": "user_profiles",
                    "let": {"profile_id": "$current_profile_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {
                                            "$eq": [
                                                "$_id",
                                                {"$toObjectId": "$$profile_id"},
                                            ]
                                        },
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "current_profile",
                }
            },
            # Unwind current profile
            {"$unwind": "$current_profile"},
            # Lookup primary profile
            {
                "$lookup": {
                    "from": "user_profiles",
                    "let": {"profile_id": "$primary_profile_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {
                                            "$eq": [
                                                "$_id",
                                                {"$toObjectId": "$$profile_id"},
                                            ]
                                        },
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "primary_profile",
                }
            },
            # Unwind primary profile with preserveNullAndEmptyArrays
            {
                "$unwind": {
                    "path": "$primary_profile",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            # Add full_mobile_number field
            {
                "$addFields": {
                    "full_mobile_number": {
                        "$concat": ["$country_code", "$mobile_number"]
                    }
                }
            },
        ]

        # Add profile filters if any exist
        if profile_filters:
            pipeline.append({"$match": {"$and": profile_filters}})

        # Add sorting and pagination
        pipeline.extend(
            [
                {"$sort": {sort_field: sort_order}},
                {
                    "$facet": {
                        "metadata": [{"$count": "total"}],
                        "data": [{"$skip": skip}, {"$limit": params.limit}],
                    }
                },
            ]
        )

        # Debug log for pipeline
        logger.debug(f"Pipeline: {pipeline}")

        # First, check if there are any users matching the initial filter
        total_users = await User.get_collection().count_documents(filter_query)
        logger.debug(f"Total users matching initial filter: {total_users}")

        result = await User.get_collection().aggregate(pipeline).to_list(length=1)
        result = result[0] if result else {"metadata": {"total": 0}, "data": []}

        # Debug log for result
        logger.debug(f"Result: {result}")

        total = result["metadata"][0]["total"] if result["metadata"] else 0

        # Transform the data into the response format
        users = []
        for user in result["data"]:
            try:
                user_response = UserResponse(
                    id=str(user["_id"]),
                    username=user.get("username", ""),
                    email=user.get("email", ""),
                    country_code=user.get("country_code"),
                    mobile_number=user.get("mobile_number"),
                    full_mobile_number=user.get("full_mobile_number"),
                    is_active=user.get("is_active", True),
                    current_profile=ProfileResponse(
                        id=str(user["current_profile"]["_id"]),
                        first_name=user["current_profile"].get("first_name", ""),
                        last_name=user["current_profile"].get("last_name", ""),
                        full_name=user["current_profile"].get("full_name", ""),
                        user_type=user["current_profile"].get("user_type", ""),
                        gender=user["current_profile"].get("gender"),
                        date_of_birth=user["current_profile"].get("date_of_birth"),
                        designation=user["current_profile"].get("designation"),
                        role_type=user["current_profile"].get("role_type"),
                        is_primary=user["current_profile"].get("is_primary", False),
                        avatar=user["current_profile"].get("avatar"),
                        signature=user["current_profile"].get("signature"),
                        language=user["current_profile"].get("language"),
                        theme=user["current_profile"].get("theme", "light"),
                    ),
                    primary_profile=(
                        ProfileResponse(
                            id=str(user["primary_profile"]["_id"]),
                            first_name=user["primary_profile"].get("first_name", ""),
                            last_name=user["primary_profile"].get("last_name", ""),
                            full_name=user["primary_profile"].get("full_name", ""),
                            user_type=user["primary_profile"].get("user_type", ""),
                            gender=user["primary_profile"].get("gender"),
                            date_of_birth=user["primary_profile"].get("date_of_birth"),
                            designation=user["primary_profile"].get("designation"),
                            role_type=user["primary_profile"].get("role_type"),
                            is_primary=user["primary_profile"].get("is_primary", False),
                            avatar=user["primary_profile"].get("avatar"),
                            signature=user["primary_profile"].get("signature"),
                            language=user["primary_profile"].get("language"),
                            theme=user["primary_profile"].get("theme", "light"),
                        )
                        if user.get("primary_profile")
                        else None
                    ),
                    current_organisation_id=user.get("current_organisation_id"),
                )
                users.append(user_response)
            except Exception as e:
                logger.error(f"Error processing user: {str(e)}")
                logger.error(f"User data: {user}")

        pages = (total + params.limit - 1) // params.limit
        has_next = params.page < pages
        has_prev = params.page > 1

        response = {
            "items": users,
            "total": total,
            "page": params.page,
            "limit": params.limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }

        return response
