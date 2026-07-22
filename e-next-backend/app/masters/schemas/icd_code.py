from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ICDCodeBase(BaseModel):
    """Base ICD code schema with common fields"""

    code: str = Field(..., description="ICD code")
    description: str = Field(..., description="ICD description")

    class Config:
        from_attributes = True
        use_enum_values = True


class ICDCodeCreate(ICDCodeBase):
    """Schema for creating a new ICD code"""

    pass


class ICDCodeResponse(ICDCodeBase):
    """Schema for ICD code response"""

    id: str
    created_at: datetime
    updated_at: datetime


class ICDCodeUpdate(BaseModel):
    """Schema for updating an existing ICD code"""

    code: Optional[str] = None
    description: Optional[str] = None


class ICDCodeBulkCreateRequest(BaseModel):
    """Schema for bulk create request of ICD code"""

    items: List[ICDCodeCreate] = Field(
        ..., description="List of ICD code items", min_length=1, max_length=10000
    )
    stop_on_error: bool = Field(False, description="Stop on error")
    validate_only: bool = Field(False, description="Validate only")


class BulkOperationError(BaseModel):
    """Schema for bulk operation error"""

    index: int = Field(..., description="Index")
    code: Optional[str] = Field(None, description="Code")
    error: str = Field(..., description="Error")
    error_type: str = Field(..., description="Error type")


class ICDCodeBulkCreateResponse(BaseModel):
    """Schema for bulk create response of ICD code"""

    total: int = Field(..., description="Total")
    successful: int = Field(..., description="Successful")
    failed: int = Field(..., description="Failed")
    errors: List[BulkOperationError] = Field(default_factory=list, description="Errors")
    created_ids: List[str] = Field(default_factory=list, description="Created IDs")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")
