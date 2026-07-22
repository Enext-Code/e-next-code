import logging
from typing import List

from fastapi import APIRouter, Depends, Query

from app.base.models import BaseResponse, ErrorResponse, NotFoundError
from app.utils import format_response

from ....schemas.api_key import (
    APIKeyCreate,
    APIKeyCreateResponse,
    APIKeyResponse,
    APIKeyUpdate,
)
from ....services import APIKeyService
from ..dependencies import get_current_user, require_admin_or_superadmin

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "",
    response_model=BaseResponse[APIKeyCreateResponse],
    status_code=201,
)
@format_response(
    response_model=APIKeyCreateResponse, message="API key created successfully"
)
async def create_api_key(
    data: APIKeyCreate,
    current_user: dict = Depends(require_admin_or_superadmin),
) -> APIKeyCreateResponse:
    """
    Create a new API key for third-party integrations
    
    Returns the API key and secret key. Store these securely as the secret key
    will not be shown again.
    """
    try:
        result = await APIKeyService.create_api_key(
            data=data,
            created_by=str(current_user["sub"]),
            created_by_profile=str(current_user.get("pid", "")),
        )
        return result
    except Exception as e:
        logger.error(f"Error creating API key: {e}")
        raise


@router.get(
    "",
    response_model=BaseResponse[List[APIKeyResponse]],
)
@format_response(response_model=List[APIKeyResponse], message="API keys retrieved successfully")
async def list_api_keys(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    is_active: bool = Query(None, description="Filter by active status"),
    current_user: dict = Depends(require_admin_or_superadmin),
) -> List[APIKeyResponse]:
    """
    List all API keys
    """
    try:
        result = await APIKeyService.list_api_keys(
            skip=skip, limit=limit, is_active=is_active
        )
        return result
    except Exception as e:
        logger.error(f"Error listing API keys: {e}")
        raise


@router.get(
    "/{api_key_id}",
    response_model=BaseResponse[APIKeyResponse],
    responses={
        200: {
            "model": BaseResponse[APIKeyResponse],
            "description": "Successfully retrieved API key",
        },
        404: {"model": ErrorResponse, "description": "API key not found"},
    },
)
@format_response(response_model=APIKeyResponse, message="API key retrieved successfully")
async def get_api_key(
    api_key_id: str,
    current_user: dict = Depends(require_admin_or_superadmin),
) -> APIKeyResponse:
    """
    Get API key by ID
    """
    try:
        result = await APIKeyService.get_api_key(api_key_id)
        return result
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error getting API key: {e}")
        raise


@router.put(
    "/{api_key_id}",
    response_model=BaseResponse[APIKeyResponse],
)
@format_response(response_model=APIKeyResponse, message="API key updated successfully")
async def update_api_key(
    api_key_id: str,
    data: APIKeyUpdate,
    current_user: dict = Depends(require_admin_or_superadmin),
) -> APIKeyResponse:
    """
    Update an API key
    
    You can update the name, description, allowed domains, and active status.
    The API key and secret key cannot be changed through this endpoint.
    """
    try:
        result = await APIKeyService.update_api_key(
            api_key_id=api_key_id,
            data=data,
            updated_by=str(current_user["sub"]),
            updated_by_profile=str(current_user.get("pid", "")),
        )
        return result
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error updating API key: {e}")
        raise


@router.delete(
    "/{api_key_id}",
    response_model=BaseResponse[dict],
)
@format_response(response_model=dict, message="API key deleted successfully")
async def delete_api_key(
    api_key_id: str,
    current_user: dict = Depends(require_admin_or_superadmin),
) -> dict:
    """
    Delete (deactivate) an API key
    
    This performs a soft delete - the API key will be marked as deleted
    and will no longer be active.
    """
    try:
        await APIKeyService.delete_api_key(api_key_id)
        return {"success": True}
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error deleting API key: {e}")
        raise


@router.post(
    "/{api_key_id}/regenerate-secret",
    response_model=BaseResponse[APIKeyCreateResponse],
)
@format_response(
    response_model=APIKeyCreateResponse, message="Secret key regenerated successfully"
)
async def regenerate_secret_key(
    api_key_id: str,
    current_user: dict = Depends(require_admin_or_superadmin),
) -> APIKeyCreateResponse:
    """
    Regenerate the secret key for an API key
    
    Returns the new secret key. Store it securely as it will not be shown again.
    The API key remains the same, only the secret key is regenerated.
    """
    try:
        result = await APIKeyService.regenerate_secret_key(
            api_key_id=api_key_id,
            updated_by=str(current_user["sub"]),
            updated_by_profile=str(current_user.get("pid", "")),
        )
        return result
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error regenerating secret key: {e}")
        raise

