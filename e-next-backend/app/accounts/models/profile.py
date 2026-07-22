from datetime import UTC, date, datetime, timedelta
from typing import Optional

from bson import ObjectId
from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, IDMixin, NotFoundError,
                             StatusMixin, TimestampMixin)
from app.core import cache

from ..enums import Gender, Language


class UserProfile(BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin):
    """User profile"""

    user_id: Optional[str] = Field(
        default=None, description="ID of the associated user"
    )
    user_type: str = Field(..., description="Type of user")
    first_name: str = Field(..., description="Profile first name")
    last_name: Optional[str] = Field(default=None, description="Profile last name")
    gender: Optional[Gender] = Field(default=None, description="Gender of the profile")
    date_of_birth: Optional[date] = Field(
        default=None, description="Date of birth of the profile"
    )
    designation: Optional[str] = Field(
        default=None, max_length=100, description="Job title or designation"
    )
    role_type: Optional[str] = Field(
        default=None, max_length=100, description="Role or position type"
    )
    is_primary: bool = Field(default=False, description="Is primary profile")
    avatar: Optional[str] = Field(default=None, description="Profile avatar")
    language: Optional[Language] = Field(
        default=None, description="Language of the profile"
    )
    theme: Optional[str] = Field(default="light", description="UI theme preference")
    city: Optional[str] = Field(default=None, description="City of the profile")
    bank_name: Optional[str] = Field(default=None, description="Bank name")
    bank_account_number: Optional[str] = Field(
        default=None, description="Bank account number"
    )
    ifsc_code: Optional[str] = Field(default=None, description="IFSC code")
    signature: Optional[str] = Field(default=None, description="Signature photo S3 key")

    class Settings:
        collection = "user_profiles"
        indexes = [
            [("user_id", 1)],
            [("user_id", 1), ("is_primary", 1)],
            [("is_active", 1)],
            [("created_at", -1)],
        ]

    @property
    def full_name(self) -> str:
        """Get the full name"""
        full_name = ""
        if self.first_name:
            full_name += self.first_name
        if self.last_name:
            full_name += f" {self.last_name}"
        return full_name.strip()

    async def save(self, *args, **kwargs) -> None:
        """Override save to update user's profile cache"""
        await super().save(*args, **kwargs)

    @classmethod
    async def get_profile_with_user(cls, profile_id: str) -> tuple["UserProfile", dict]:
        """Get profile and user data efficiently"""
        cache_key = f"profile:complete:{profile_id}"

        async def fetch_complete_profile():
            # Fetch profile and user data in one aggregation query
            pipeline = [
                {"$match": {"_id": ObjectId(profile_id), "is_active": True}},
                {
                    "$lookup": {
                        "from": "users",
                        "let": {"user_id": "$user_id"},
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {
                                        "$eq": ["$_id", {"$toObjectId": "$$user_id"}]
                                    }
                                }
                            },
                            {
                                "$project": {
                                    "username": 1,
                                    "email": 1,
                                    "country_code": 1,
                                    "mobile_number": 1,
                                    "status": 1,
                                    "full_mobile_number": {
                                        "$concat": ["$country_code", "$mobile_number"]
                                    },
                                }
                            },
                        ],
                        "as": "user",
                    }
                },
                {"$unwind": "$user"},
                # Add ID field explicitly
                {
                    "$addFields": {
                        "id": {"$toString": "$_id"},
                        "user_id": {"$toString": "$user_id"},
                    }
                },
            ]

            result = await cls.get_collection().aggregate(pipeline).to_list(1)
            if not result:
                raise NotFoundError("Profile not found")

            profile_data = result[0]
            user_data = profile_data.pop("user")

            # Ensure _id is converted to string format
            profile_data["id"] = str(profile_data["_id"])

            return {"profile": profile_data, "user": user_data}

        # Get cached data with background refresh
        data = await cache.get_with_refresh(
            cache_key, fetch_complete_profile, timeout=timedelta(minutes=30)
        )

        if not data:
            raise NotFoundError("Profile not found")

        # Ensure profile data has the required ID field
        if "_id" in data["profile"] and "id" not in data["profile"]:
            data["profile"]["id"] = str(data["profile"]["_id"])

        profile = cls.model_validate(data["profile"])
        user_data = data["user"]

        return profile, user_data

    @classmethod
    async def create_primary_profile(
        cls, user_id: str, first_name: str, user_type: str, **kwargs
    ) -> "UserProfile":
        """Create primary profile for new user"""
        profile = await cls.create(
            user_id=user_id,
            first_name=first_name,
            user_type=user_type,
            is_primary=True,
            **kwargs,
        )
        return profile

    @classmethod
    async def create_secondary_profile(
        cls, user_id: str, first_name: str, user_type: str, **kwargs
    ) -> "UserProfile":
        """Create secondary profile"""
        # Check profile limit (e.g., max 4 profiles)
        profile_count = await cls.count_documents(
            {"user_id": user_id, "is_active": True}
        )

        if profile_count >= 4:
            raise ValueError("Maximum profile limit reached")

        profile = await cls.create(
            user_id=user_id,
            first_name=first_name,
            user_type=user_type,
            is_primary=False,
            **kwargs,
        )
        return profile

    def model_dump(self, *args, **kwargs):
        """Dump the model"""
        data = super().model_dump(*args, **kwargs)
        if isinstance(data["date_of_birth"], date):
            data["date_of_birth"] = datetime.combine(
                data["date_of_birth"], datetime.min.time(), tzinfo=UTC
            )
        return data
