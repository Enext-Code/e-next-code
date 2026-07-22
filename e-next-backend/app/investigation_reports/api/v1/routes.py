from fastapi import APIRouter

from .endpoints import (daily_round_sheet_router, investigation_report_router,
                        patient_criticality_router, progress_sheet_router)

router = APIRouter()

router.include_router(
    investigation_report_router,
    prefix="/investigation-reports",
    tags=["Investigation Reports"],
)

router.include_router(
    progress_sheet_router,
    prefix="/progress-sheets",
    tags=["Progress Sheets"],
)

router.include_router(
    daily_round_sheet_router,
    prefix="/daily-round-sheets",
    tags=["Daily Round Sheets"],
)

router.include_router(
    patient_criticality_router,
    prefix="/patient-criticalities",
    tags=["Patient Criticalities"],
)


__all__ = ["router"]
