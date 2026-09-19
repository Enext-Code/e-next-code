from typing import Optional

from app.base.models import PaginationParams


class ICDCodeFilterParams(PaginationParams):
    """ICD Code filter"""

    # search comes from PaginationParams — matches code OR description
    code: Optional[str] = None
    description: Optional[str] = None
