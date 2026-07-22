from typing import Optional

from app.base.models import PaginationParams

from ..enums import UserType


class UserFilterParams(PaginationParams):
    """User filter"""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    country_code: Optional[str] = None
    mobile_number: Optional[str] = None
    user_type: Optional[UserType] = None
    role_type: Optional[str] = None
    organisation_id: Optional[str] = None
    is_active: Optional[bool] = None  # None = all users, True = active only, False = inactive only
