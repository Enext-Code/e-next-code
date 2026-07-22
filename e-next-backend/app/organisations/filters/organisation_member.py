from typing import Optional

from app.base.models import PaginationParams


class OrganisationMemberFilterParams(PaginationParams):
    """Organisation member filter"""

    organisation_id: Optional[str] = None
    user_id: Optional[str] = None
