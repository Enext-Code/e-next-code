from typing import Optional

from app.base.models import PaginationParams


class OrganisationICUFilterParams(PaginationParams):
    """Organisation ICU filter"""

    organisation_id: Optional[str] = None
    name: Optional[str] = None
