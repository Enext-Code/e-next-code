from datetime import datetime
from typing import Optional

from app.base.models import PaginationParams


class InvestigationReportFilterParams(PaginationParams):
    """Investigation report filter parameters"""

    patient_id: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    has_blood_analysis: Optional[bool] = None
    has_radiology: Optional[bool] = None
    has_arterial_analysis: Optional[bool] = None
    has_microbiology: Optional[bool] = None
    organisation_id: Optional[str] = None
