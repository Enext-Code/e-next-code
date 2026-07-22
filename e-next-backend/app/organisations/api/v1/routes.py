from fastapi import APIRouter

from .endpoints import (organisation_icu_bed_router, organisation_icu_router,
                        organisation_member_router, organisation_router)

router = APIRouter()

router.include_router(
    organisation_router, prefix="/organisations", tags=["Organisations"]
)

router.include_router(
    organisation_member_router,
    prefix="/organisation-members",
    tags=["Organisation Members"],
)

router.include_router(
    organisation_icu_router, prefix="/organisation-icus", tags=["Organisation ICUs"]
)

router.include_router(
    organisation_icu_bed_router,
    prefix="/organisation-icu-beds",
    tags=["Organisation ICU Beds"],
)


__all__ = ["router"]
