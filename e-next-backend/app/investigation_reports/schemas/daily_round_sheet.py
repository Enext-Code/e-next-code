from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DailyRoundSheetBaseSchema(BaseModel):
    """Daily Round Sheet Base Schema"""

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


class DailyRoundSheetCreateSchema(DailyRoundSheetBaseSchema):
    """Daily Round Sheet Create Schema"""

    pass


class DailyRoundSheetResponseSchema(DailyRoundSheetBaseSchema):
    """Daily Round Sheet Response Schema"""

    id: str = Field(..., description="The ID of the daily round sheet")
    sheet_id: str = Field(..., description="The ID of the daily round sheet")
    created_at: datetime = Field(
        ..., description="The date and time the daily round sheet was created"
    )
    updated_at: datetime = Field(
        ..., description="The date and time the daily round sheet was last updated"
    )


class DailyRoundSheetUpdateSchema(BaseModel):
    """Daily Round Sheet Update Schema"""

    date: Optional[datetime] = Field(
        None, description="The date of the daily round sheet"
    )
    prescription: Optional[str] = Field(
        None, description="The prescription of the daily round sheet"
    )
    progress_sheet_id: Optional[str] = Field(
        None, description="The ID of the progress sheet"
    )
    progress_sheet_datetime: Optional[str] = Field(
        None, description="The date and time of the progress sheet"
    )
    investigation_report_id: Optional[str] = Field(
        None, description="The ID of the investigation report"
    )
    current_issue: Optional[str] = Field(
        None, description="Current issue description"
    )
    current_treatment: Optional[str] = Field(
        None, description="Current treatment description"
    )
