import re
from typing import List, Optional

from pydantic import field_validator

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
    tele_icu_date: Optional[str] = None

    @field_validator("tele_icu_date")
    @classmethod
    def validate_tele_icu_date(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", value):
            raise ValueError("tele_icu_date must be in YYYY-MM format")
        return value
