import logging
from datetime import datetime

from pydantic import Field

from app.base.models import (AuditMixin, BaseSchema, DuplicateError, IDMixin,
                             OrganisationMixin, StatusMixin, TimestampMixin)
from app.utils import generate_random_string

logger = logging.getLogger(__name__)


class DailyRoundSheet(
    BaseSchema, AuditMixin, IDMixin, OrganisationMixin, StatusMixin, TimestampMixin
):
    """Daily Round Sheet"""

    sheet_id: str = Field(..., description="The ID of the daily round sheet")
    patient_id: str = Field(..., description="The ID of the patient")
    date: datetime = Field(..., description="The date of the daily round sheet")
    prescription: str = Field(
        ..., description="The prescription of the daily round sheet"
    )
    progress_sheet_id: str = Field(
        ..., description="The ID of the progress sheet"
    )
    progress_sheet_datetime: str = Field(
        ..., description="The date and time of the progress sheet"
    )
    investigation_report_id: str = Field(
        ..., description="The ID of the investigation report"
    )
    current_issue: str = Field(
        ..., description="Current issue description"
    )
    current_treatment: str = Field(
        ..., description="Current treatment description"
    )

    class Settings:
        """Pydantic settings"""

        collection = "daily_round_sheets"
        indexes = [
            [("patient_id", 1), ("date", -1)],
            [("sheet_id", 1)],
            [("organisation_id", 1), ("created_at", -1)],
            [("is_active", 1), ("is_deleted", 1)],
        ]

    @classmethod
    async def generate_sheet_id(cls) -> str:
        """Generate a unique ID for the daily round sheet"""
        max_attempts = 5
        attempt = 0

        while attempt < max_attempts:
            sheet_id = generate_random_string("DRS", 10)
            existing = await cls.find_one({"sheet_id": sheet_id}, {"_id": 1})
            if not existing:
                return sheet_id
            attempt += 1

        raise DuplicateError(
            message="Failed to generate unique sheet ID",
            error_code="SHEET_ID_GENERATION_FAILED",
        )
