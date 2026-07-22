from fastapi import APIRouter
from .endpoints import api_keys_router, auth_router, users_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
router.include_router(users_router, prefix="/users", tags=["Users"])
router.include_router(api_keys_router, prefix="/api-keys", tags=["API Keys"])
