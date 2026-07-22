from datetime import datetime
from typing import Optional

from app.base.models import PaginationParams


class ProgressSheetFilterParams(PaginationParams):
    """Progress sheet filter parameters"""

    patient_id: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    organisation_id: Optional[str] = None
