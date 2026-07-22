import logging

from app.core import settings

logger = logging.getLogger(__name__)


async def ensure_superadmin():
    """Ensure superadmin user exists"""
    from app.accounts.enums import UserStatus, UserType
    from app.accounts.models import User, UserProfile
    from app.utils import security

    try:
        superadmin = await User.find_one({"email": settings.SUPERADMIN_EMAIL})

        if not superadmin:
            logger.info("Superadmin user not found, creating...")

            # Create superadmin user
            superadmin = await User.create(
                username=settings.SUPERADMIN_USERNAME,
                email=settings.SUPERADMIN_EMAIL,
                hashed_password=security.get_password_hash(
                    settings.SUPERADMIN_PASSWORD
                ),
                country_code="+1",
                mobile_number="0000000000",
                status=UserStatus.ACTIVE,
            )

            # Create superadmin profile
            profile = await UserProfile.create(
                user_id=str(superadmin.id),
                user_type=UserType.SUPERADMIN,
                first_name=settings.SUPERADMIN_FIRST_NAME,
                last_name=settings.SUPERADMIN_LAST_NAME,
                is_primary=True,
            )

            # Update superadmin with profile ID
            superadmin.primary_profile_id = str(profile.id)
            superadmin.current_profile_id = str(profile.id)

            await superadmin.save()

            logger.info("Superadmin user created successfully")
        else:
            logger.info("Superadmin user already exists")
    except Exception as e:
        logger.error(f"Error creating superadmin user: {e}")
        raise
