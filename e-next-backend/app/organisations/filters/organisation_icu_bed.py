from typing import Optional

from app.base.models import PaginationParams


class OrganisationICUBedFilterParams(PaginationParams):
    """Organisation ICU bed filter"""

    organisation_icu_id: Optional[str] = None
    bed_number: Optional[int] = None
    is_available: Optional[bool] = None
