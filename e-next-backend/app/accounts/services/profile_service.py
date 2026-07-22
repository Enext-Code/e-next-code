from app.base.models import NotFoundError

from ..models import UserProfile


class ProfileService:
    """Profile service"""

    @staticmethod
    async def get_profile_with_user(profile_id: str) -> tuple[UserProfile, dict]:
        """Get profile and username"""
        try:
            profile, user_data = await UserProfile.get_profile_with_user(profile_id)

            # Ensure profile has an ID
            if not profile.id:
                profile.id = profile_id

            return profile, user_data
        except Exception as e:
            raise NotFoundError("Profile not found")

    @staticmethod
    async def get_active_profile(profile_id: str) -> UserProfile:
        """Get active profile by ID"""
        profile, _ = await ProfileService.get_profile_with_user(profile_id)
        return profile

    @staticmethod
    async def update_profile(profile_id: str, update_data: dict) -> UserProfile:
        """Update profile"""
        profile = await UserProfile.find_one({"_id": profile_id})
        if not profile:
            raise NotFoundError("Profile not found")
        await profile.update({"$set": update_data})
        return profile
