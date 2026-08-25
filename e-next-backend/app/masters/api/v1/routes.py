from fastapi import APIRouter

from .endpoints import icd_code_router, plan_line_template_router

router = APIRouter()

router.include_router(icd_code_router, prefix="/icd-codes", tags=["ICD Codes"])
router.include_router(
    plan_line_template_router,
    prefix="/plan-line-templates",
    tags=["Plan Line Templates"],
)


__all__ = ["router"]
