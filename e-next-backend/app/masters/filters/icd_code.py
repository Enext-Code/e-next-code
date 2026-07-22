from typing import Optional

from app.base.models import PaginationParams


class ICDCodeFilterParams(PaginationParams):
    """ICD Code filter"""

    code: Optional[str] = None
    description: Optional[str] = None
