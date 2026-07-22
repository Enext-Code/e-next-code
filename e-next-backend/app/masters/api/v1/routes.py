from fastapi import APIRouter

from .endpoints import icd_code_router

router = APIRouter()

router.include_router(icd_code_router, prefix="/icd-codes", tags=["ICD Codes"])


__all__ = ["router"]
