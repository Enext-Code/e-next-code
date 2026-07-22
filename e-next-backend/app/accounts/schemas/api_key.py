from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class APIKeyCreate(BaseModel):
    """Schema for creating an API key"""

    name: str = Field(..., min_length=1, max_length=100, description="Name/identifier for the API key")
    description: Optional[str] = Field(
        default=None, max_length=500, description="Description of the API key usage"
    )
    allowed_domains: List[str] = Field(
        default_factory=list,
        description="List of allowed domains (e.g., ['example.com', 'api.example.com'])",
    )

    @field_validator("allowed_domains")
    @classmethod
    def validate_domains(cls, v: List[str]) -> List[str]:
        """Validate domain format"""
        for domain in v:
            if not domain or not isinstance(domain, str):
                raise ValueError("Domain must be a non-empty string")
            # Basic domain validation
            if not ("." in domain or domain == "localhost"):
                raise ValueError(f"Invalid domain format: {domain}")
        return v


class APIKeyUpdate(BaseModel):
    """Schema for updating an API key"""

    name: Optional[str] = Field(
        default=None, min_length=1, max_length=100, description="Name/identifier for the API key"
    )
    description: Optional[str] = Field(
        default=None, max_length=500, description="Description of the API key usage"
    )
    allowed_domains: Optional[List[str]] = Field(
        default=None,
        description="List of allowed domains (e.g., ['example.com', 'api.example.com'])",
    )
    is_active: Optional[bool] = Field(
        default=None, description="Whether the API key is active"
    )

    @field_validator("allowed_domains")
    @classmethod
    def validate_domains(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Validate domain format"""
        if v is None:
            return v
        for domain in v:
            if not domain or not isinstance(domain, str):
                raise ValueError("Domain must be a non-empty string")
            # Basic domain validation
            if not ("." in domain or domain == "localhost"):
                raise ValueError(f"Invalid domain format: {domain}")
        return v


class APIKeyResponse(BaseModel):
    """Schema for API key response"""

    id: str
    name: str
    description: Optional[str] = None
    api_key: str  # Only the prefix part shown for security
    allowed_domains: List[str]
    is_active: bool
    last_used_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        """Config"""

        from_attributes = True


class APIKeyCreateResponse(BaseModel):
    """Schema for API key creation response (includes full keys)"""

    id: str
    name: str
    description: Optional[str] = None
    api_key: str  # Full API key (only shown once on creation)
    secret_key: str  # Full secret key (only shown once on creation)
    allowed_domains: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    message: str = "Please store these keys securely. The secret key will not be shown again."

    class Config:
        """Config"""

        from_attributes = True

