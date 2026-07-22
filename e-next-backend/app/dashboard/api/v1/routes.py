from fastapi import APIRouter

from .endpoints import dashboard_router

api_router = APIRouter()

# Include dashboard endpoints
api_router.include_router(
    dashboard_router,
    prefix="/dashboard",
    tags=["Dashboard"],
)
