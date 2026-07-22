from typing import List, Optional

from app.base.models import PaginationParams

from ..enums import Criticality, Gender, PatientStatus, Triage


class PatientFilterParams(PaginationParams):
    """Patient filter"""

    unique_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[Gender] = None
    criticality: Optional[Criticality] = None
    triage: Optional[Triage] = None
    organisation_id: Optional[str] = None
    organisation_icu_id: Optional[str] = None
    organisation_icu_bed_id: Optional[str] = None
    doctor_id: Optional[str] = None
    status: Optional[PatientStatus] = None
    statuses: Optional[List[PatientStatus]] = None
