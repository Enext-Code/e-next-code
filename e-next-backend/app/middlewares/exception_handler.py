import logging
from typing import Union

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.base.models import BaseError, ErrorResponse

logger = logging.getLogger(__name__)


class AppException(Exception):
    """App exception"""

    def __init__(self, status_code: int, message: str, data: dict = None):
        """Initialize the app exception"""
        self.status_code = status_code
        self.message = message
        self.data = data


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle the app exception"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": False, "message": exc.message, "data": exc.data},
    )


async def validation_exception_handler(
    request: Request, exc: Union[RequestValidationError, ValidationError]
) -> JSONResponse:
    """Handle the validation exception"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": False,
            "message": "Validation error",
            "data": {
                "errors": [
                    {"field": error["loc"][-1], "message": error["msg"]}
                    for error in exc.errors()
                ]
            },
        },
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle the general exception"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"status": False, "message": "Internal server error", "data": None},
    )


async def base_error_handler(request: Request, exc: BaseError) -> JSONResponse:
    """Handle BaseError exceptions and format them according to ErrorResponse schema"""
    if isinstance(exc.detail, dict):
        error_response = ErrorResponse(
            success=False,
            message=exc.detail.get("message", "An error occurred"),
            error_code=exc.detail.get("error_code", "ERROR"),
            details=exc.detail.get("details"),
        )
    else:
        error_response = ErrorResponse(
            success=False, message=str(exc.detail), error_code="ERROR"
        )

    return JSONResponse(
        status_code=exc.status_code, content=error_response.model_dump()
    )
