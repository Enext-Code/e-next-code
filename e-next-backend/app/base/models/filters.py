from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class DateRangeFilter(BaseModel):
    """Date range filter"""

    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class StatusFilter(BaseModel):
    """Status filter"""

    is_active: Optional[bool] = None
    status: Optional[List[str]] = None
