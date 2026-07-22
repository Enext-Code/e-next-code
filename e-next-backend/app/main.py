import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.accounts.api.v1 import accounts_router
from app.base.models import BaseError
from app.core import MongoDB, ensure_superadmin, s3, settings
from app.dashboard.api.v1 import api_router as dashboard_router
from app.investigation_reports.api.v1 import investigation_reports_router
from app.masters.api.v1 import masters_router
from app.middlewares import (AppException, RequestLogger,
                             app_exception_handler, base_error_handler,
                             general_exception_handler,
                             validation_exception_handler)
from app.organisations.api.v1 import organisations_router
from app.patients.api.v1 import patient_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan for the app."""

    try:
        # Start the app
        logger.info("Starting up the application")
        await MongoDB.connect_to_database()
        await s3.initialize()
        await ensure_superadmin()

        yield

    except Exception as e:
        logger.error(f"Error starting up the application: {e}")
        raise

    finally:
        logger.info("Shutting down the application")
        await MongoDB.close_database_connection()


def create_application() -> FastAPI:
    """Create the FastAPI application."""

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        description="API Documentation for the project",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/api/v1/docs",
        redoc_url="/api/v1/redoc",
        lifespan=lifespan,
        # Avoid 307 slash redirects (Location points to 127.0.0.1:8000 via Next rewrite
        # and the browser drops Authorization / returns opaque status 0).
        redirect_slashes=False,
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add exception handlers
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
    app.add_exception_handler(BaseError, base_error_handler)

    # Setup logging
    logger.setLevel(logging.INFO)
    app.add_middleware(RequestLogger)

    # Include accounts router
    app.include_router(accounts_router, prefix=f"{settings.API_V1_STR}/accounts")

    # Include organisations router
    app.include_router(
        organisations_router, prefix=f"{settings.API_V1_STR}/organisations"
    )

    # Include patients router
    app.include_router(patient_router, prefix=f"{settings.API_V1_STR}/patients")

    # Include masters router
    app.include_router(masters_router, prefix=f"{settings.API_V1_STR}/masters")

    # Include investigation reports router
    app.include_router(
        investigation_reports_router,
        prefix=f"{settings.API_V1_STR}/investigation-reports",
    )

    # Include dashboard router
    app.include_router(dashboard_router, prefix=f"{settings.API_V1_STR}")

    return app


app = create_application()


@app.get("/")
async def root():
    """Root endpoint for the application"""
    return {"message": "Welcome to E-Next Backend!"}
