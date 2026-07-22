from enum import Enum


class CountryCode(str, Enum):
    """Country enum"""

    INDIA = "+91"
    USA = "+1"


class Gender(str, Enum):
    """Gender enum"""

    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class Language(str, Enum):
    """Language enum"""

    ENGLISH = "en"
    HINDI = "hi"


class UserType(str, Enum):
    """User type enum"""

    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    DOCTOR = "doctor"
    NURSE = "nurse"

    @classmethod
    def requires_organisation_id(cls, user_type: str) -> bool:
        """Check if user type requires organisation ID"""
        return user_type in [cls.SUPERADMIN, cls.ADMIN]


class UserStatus(str, Enum):
    """User status enum"""

    ACTIVE = "active"
    INACTIVE = "inactive"
    BLOCKED = "blocked"
    DELETED = "deleted"


class OrganisationRole(str, Enum):
    """Organisation role enum"""

    ORGANISATION_USER = "organisation_user"  # For doctor, nurse
    ORGANISATION_ADMIN = "organisation_admin"  #  For admin, superadmin
