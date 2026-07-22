from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class BaseResponse(BaseModel, Generic[T]):
    """Base response"""

    success: bool
    message: Optional[str] = None
    data: Optional[T] = None
    error: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response"""

    success: bool = False
    message: str
    error_code: str
    details: Optional[Any] = None
