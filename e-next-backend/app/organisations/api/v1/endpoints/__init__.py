from .organisation import router as organisation_router
from .organisation_icu import router as organisation_icu_router
from .organisation_icu_bed import router as organisation_icu_bed_router
from .organisation_member import router as organisation_member_router

__all__ = [
    "organisation_router",
    "organisation_member_router",
    "organisation_icu_router",
    "organisation_icu_bed_router",
]
