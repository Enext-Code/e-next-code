import logging
import re
from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
from pydantic import EmailStr, Field, field_validator

from app.base.models import (AuditMixin, BaseSchema, DuplicateError, IDMixin,
                             StatusMixin, TimestampMixin)
from app.core import cache
from app.utils import MOBILE_NUMBER_REGEX, generate_username

from ..enums import UserStatus
from .profile import UserProfile

logger = logging.getLogger(__name__)


class User(BaseSchema, TimestampMixin, IDMixin, StatusMixin, AuditMixin):
    """User"""

    username: str = Field(..., description="Unique username for the user")
    email: EmailStr = Field(..., description="Email address")
    country_code: Optional[str] = Field(default=None, description="Country code")
    mobile_number: Optional[str] = Field(default=None, description="Mobile number")
    hashed_password: Optional[str] = Field(default=None, description="Hashed password")
    primary_profile_id: Optional[str] = Field(
        default=None, description="Primary profile ID"
    )
    current_profile_id: Optional[str] = Field(
        default=None, description="Current profile ID"
    )
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="User status")
    last_login: Optional[datetime] = Field(default=None, description="Last login")
    _profile: Optional[UserProfile] = None
    current_organisation_id: Optional[str] = Field(
        default=None, description="Current organisation ID"
    )

    class Settings:
        """Settings for the user"""

        collection = "users"
        indexes = [
            [("username", 1), {"unique": True}],
            [("email", 1), {"unique": True}],
            [("country_code", 1), ("mobile_number", 1), {"unique": True, "sparse": True}],
            [("primary_profile_id", 1)],
            [("current_profile_id", 1)],
            [("status", 1)],
            [("created_at", -1)],
            [("last_login", -1)],
        ]

    @field_validator("mobile_number", mode="before")
    def validate_mobile_number(cls, v):
        """Validate the mobile number"""
        # Treat empty string as None
        if v == "" or v is None:
            return None
        if not re.match(MOBILE_NUMBER_REGEX, v):
            raise ValueError("Invalid mobile number")
        return v

    @field_validator("country_code", mode="before")
    def validate_country_code(cls, v):
        """Validate the country code - treat empty string as None"""
        if v == "" or v is None:
            return None
        return v

    @property
    def full_mobile_number(self) -> Optional[str]:
        """Get the full mobile number"""
        if self.country_code and self.mobile_number:
            return f"{self.country_code}{self.mobile_number}"
        return None

    @property
    def profile(self) -> Optional[UserProfile]:
        """Profile"""
        return self._profile

    @profile.setter
    def profile(self, value: UserProfile):
        """Set the profile"""
        self._profile = value

    @classmethod
    async def generate_unique_username(cls) -> str:
        """Generate a unique username with efficient DB queries"""
        max_attempts = 5
        attempt = 0

        while attempt < max_attempts:
            try:
                # Get existing usernames efficiently
                cursor = (
                    cls.get_collection().find({}, {"username": 1, "_id": 0}).limit(1000)
                )

                existing_usernames = set()
                async for doc in cursor:
                    existing_usernames.add(doc["username"])

                # Generate new username
                username = generate_username(existing_usernames=existing_usernames)

                # Verify username uniqueness with index
                existing = await cls.find_one({"username": username}, {"_id": 1})

                if not existing:
                    return username

            except Exception as e:
                logger.error(f"Username generation error: {str(e)}")

            attempt += 1

        raise DuplicateError(
            message="Failed to generate unique username",
            error_code="USERNAME_GENERATION_FAILED",
        )

    @classmethod
    async def create_user(cls, **kwargs) -> "User":
        """Create a new user with generated username if not provided"""
        if "username" not in kwargs:
            # Get existing usernames
            users = await cls.find(
                filter_dict={}, projection={"username": 1}, limit=1000
            )
            # Convert users to a list and extract usernames
            existing_usernames = {user.username for user in users}
            kwargs["username"] = generate_username(
                existing_usernames=existing_usernames
            )

        # Create and save user
        user = await cls.create(**kwargs)
        return user

    def model_dump(self, *args, **kwargs):
        """Dump the model"""
        data = super().model_dump(*args, **kwargs)
        if "_profile" in data:
            data.pop("_profile")
        return data

    async def get_all_profiles(self) -> list[UserProfile]:
        """Get all profiles"""
        cache_key = f"user:profiles:{self.id}"

        async def fetch_profiles():
            pipeline = [
                {
                    "$match": {
                        "user_id": str(self.id),
                        "is_active": True,
                    }
                },
                {
                    "$addFields": {
                        "is_primary": {
                            "$eq": [{"$toString": "$id"}, self.primary_profile_id]
                        }
                    }
                },
                {"$sort": {"is_primary": -1, "created_at": -1}},
            ]

            profiles = (
                await UserProfile.get_collection().aggregate(pipeline).to_list(None)
            )
            return profiles

        profiles_data = await cache.get_with_refresh(
            cache_key,
            fetch_profiles,
            timeout=timedelta(seconds=30),
        )

        if not profiles_data:
            return []

        return [UserProfile.model_validate(p) for p in profiles_data]

    async def get_active_profile(self) -> Optional[UserProfile]:
        """Get active profile with caching"""
        if not self.current_profile_id:
            self.current_profile_id = self.primary_profile_id
            await self.save()

        if self._profile:
            return self._profile

        cache_key = f"user:active_profile:{self.current_profile_id}"

        async def fetch_profile():
            return await UserProfile.find_one(
                {
                    "_id": ObjectId(self.current_profile_id),
                    "user_id": str(self.id),
                    "is_active": True,
                }
            )

        profile = await cache.get_with_refresh(
            cache_key, fetch_profile, timeout=timedelta(minutes=30)
        )

        if profile:
            self._profile = profile
            return profile

        return None
