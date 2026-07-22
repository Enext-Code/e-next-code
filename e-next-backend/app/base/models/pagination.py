from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Pagination parameters"""

    page: int = Field(default=1, ge=1)
    limit: int = Field(default=10, ge=1, le=10000)
    sort_by: Optional[str] = None
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$")
    search: Optional[str] = None


class PaginationResponse(BaseModel, Generic[T]):
    """Pagination response"""

    items: List[T]
    total: int
    page: int
    limit: int
    pages: int
    has_next: bool
    has_prev: bool
