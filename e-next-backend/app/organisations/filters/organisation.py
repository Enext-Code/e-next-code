from typing import Optional

from app.base.models import PaginationParams


class OrganisationFilterParams(PaginationParams):
    """Organisation filter"""

    name: Optional[str] = None
    unique_id: Optional[str] = None
