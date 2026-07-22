from .daily_round_sheet import router as daily_round_sheet_router
from .investigation_report import router as investigation_report_router
from .patient_criticality import router as patient_criticality_router
from .progress_sheet import router as progress_sheet_router

__all__ = [
    "investigation_report_router",
    "progress_sheet_router",
    "daily_round_sheet_router",
    "patient_criticality_router",
]
