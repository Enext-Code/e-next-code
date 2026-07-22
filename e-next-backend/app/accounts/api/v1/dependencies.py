import logging
from datetime import timedelta
from typing import Optional, Type
from urllib.parse import urlparse

from bson import ObjectId
from fastapi import Depends, Header, HTTPException, Request
from fastapi.security import HTTPBearer
from pydantic import BaseModel

from app.base.models import (AuthenticationError, AuthorizationError,
                             ValidationError)
from app.core import cache
from app.utils import decode_jwt_token, decrypt_user_type

from ...enums import OrganisationRole, UserType
from ...models import APIKey, User
from ...services import APIKeyService, AuthService

logger = logging.getLogger(__name__)

security = HTTPBearer(
    scheme_name="Bearer Auth",
    description="Enter your token in the format 'Bearer <token>'",
    auto_error=True,
)


async def get_current_user(credentials=Depends(security)) -> dict:
    """
    Validate access token from Authorization header and return current user
    """
    try:
        # Get token from Authorization header
        token = credentials.credentials

        if await AuthService.is_token_blacklisted(token):
            raise AuthenticationError(
                message="Token is been revoked", error_code="TOKEN_REVOKED"
            )

        # Decode and verify token
        payload = decode_jwt_token(token)
        payload["exp"] = '1784224435'
        return payload

    except Exception as e:
        raise AuthenticationError(
            message="Invalid authentication credentials",
            error_code="INVALID_AUTHENTICATION_CREDENTIALS",
        )


async def get_current_token(credentials=Depends(security)) -> str:
    """
    Extract token from Authorization header

    Args:
        credentials: Security credentials from bearer token

    Returns:
        str: The raw JWT token

    Raises:
        HTTPException: If token is missing or malformed
    """
    try:
        return credentials.credentials
    except Exception:
        raise AuthenticationError(
            message="Invalid token format", error_code="INVALID_TOKEN_FORMAT"
        )


async def check_superadmin_permission(user_id: str) -> bool:
    """Check if the user has superadmin permission"""
    try:
        cache_key = f"permission:superadmin:{user_id}"

        async def fetch_permissions():
            user = await User.find_one({"_id": ObjectId(user_id)})
            if not user:
                return False

            profile = await user.get_active_profile()
            if not profile:
                return False

            return profile.user_type == UserType.SUPERADMIN

        is_superadmin = await cache.get_with_refresh(
            cache_key,
            fetch_permissions,
            timeout=timedelta(minutes=5),
        )

        return is_superadmin
    except Exception as e:
        logger.error(f"Error checking superadmin permission: {e}")
        raise AuthorizationError(message="Superadmin access required")


async def require_superadmin(credentials=Depends(security)) -> dict:
    """
    Ensure the current user is a superadmin
    """
    try:
        token = credentials.credentials
        payload = decode_jwt_token(token)
        user_id = payload["sub"]
        if not user_id:
            raise AuthorizationError(message="Superadmin access required")

        is_superadmin = await check_superadmin_permission(str(user_id))

        if not is_superadmin:
            raise AuthorizationError(message="Superadmin access required")

        return payload
    except Exception as e:
        logger.error(f"Error checking superadmin permission: {e}")
        raise AuthorizationError(message="Superadmin access required")


async def check_admin_or_superadmin_permission(user_id: str) -> bool:
    """Check if the user has admin or superadmin permission"""
    try:
        cache_key = f"permission:admin_or_superadmin:{user_id}"

        async def fetch_permissions():
            user = await User.find_one({"_id": ObjectId(user_id)})
            if not user:
                return False

            profile = await user.get_active_profile()
            if not profile:
                return False

            return profile.user_type in [UserType.ADMIN, UserType.SUPERADMIN]

        has_permission = await cache.get_with_refresh(
            cache_key,
            fetch_permissions,
            timeout=timedelta(minutes=5),
        )

        return has_permission
    except Exception as e:
        logger.error(f"Error checking admin/superadmin permission: {e}")
        raise AuthorizationError(message="Admin or Superadmin access required")


async def require_admin_or_superadmin(credentials=Depends(security)) -> dict:
    """
    Ensure the current user is an admin or superadmin
    """
    try:
        token = credentials.credentials
        payload = decode_jwt_token(token)
        user_id = payload["sub"]
        if not user_id:
            raise AuthorizationError(message="Admin or Superadmin access required")

        has_permission = await check_admin_or_superadmin_permission(str(user_id))

        if not has_permission:
            raise AuthorizationError(message="Admin or Superadmin access required")

        return payload
    except Exception as e:
        logger.error(f"Error checking admin/superadmin permission: {e}")
        raise AuthorizationError(message="Admin or Superadmin access required")


async def check_sales_permission(user_id: str) -> bool:
    """Check if the user has sales permission"""
    try:
        cache_key = f"permission:sales:{user_id}"

        async def fetch_permissions():
            user = await User.find_one({"_id": ObjectId(user_id)})
            if not user:
                return False

            profile = await user.get_active_profile()
            if not profile:
                return False

            return profile.user_type == UserType.SALES

        is_sales = await cache.get_with_refresh(
            cache_key,
            fetch_permissions,
            timeout=timedelta(minutes=5),
        )

        return is_sales
    except Exception as e:
        logger.error(f"Error checking sales permission: {e}")
        return False


async def require_sales(credentials=Depends(security)) -> dict:
    """Ensure the current user is a sales"""
    try:
        token = credentials.credentials
        payload = decode_jwt_token(token)
        user_id = payload["sub"]
        if not user_id:
            raise AuthorizationError(message="Sales access required")

        is_sales = await check_sales_permission(str(user_id))

        if not is_sales:
            raise AuthorizationError(message="Sales access required")

        return payload
    except Exception as e:
        logger.error(f"Error checking sales permission: {e}")
        raise AuthorizationError(message="Sales access required")


def get_organisation_role(user_type: UserType) -> OrganisationRole:
    if user_type in [UserType.DOCTOR, UserType.NURSE]:
        return OrganisationRole.ORGANISATION_USER
    return OrganisationRole.ORGANISATION_ADMIN


def requires_organisation_id(user_type: UserType) -> bool:
    """Check if user type requires organisation id in payload"""
    return get_organisation_role(user_type) == OrganisationRole.ORGANISATION_ADMIN


async def validate_organisation_access(
    current_user: dict = Depends(get_current_user),
    organisation_id: Optional[str] = None,
) -> str:
    """Validate organisation access"""

    encrypted_user_type = current_user["ut"]
    user_type = UserType(decrypt_user_type(encrypted_user_type))

    if requires_organisation_id(user_type):
        if not organisation_id:
            raise ValidationError(
                message="Organisation ID is required",
                error_code="ORGANISATION_ID_REQUIRED",
            )
        return organisation_id

    return current_user["oid"]


async def validate_resource_access(
    field_name: str,
    field_value: str,
    model_class: Type[BaseModel],
    current_user: dict = Depends(get_current_user),
) -> None:
    """Validate resource access"""
    try:
        # Decrypt user type
        encrypted_user_type = current_user["ut"]
        user_type = UserType(decrypt_user_type(encrypted_user_type))

        # Build query
        query = {
            field_name: ObjectId(field_value) if field_name == "_id" else field_value,
            "is_active": True,
            "is_deleted": False,
        }

        # Get resource
        resource = await model_class.get_collection().find_one(query)

        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")

        if UserType.requires_organisation_id(user_type):
            # Admin/Superadmin
            return
        else:
            # Organisation user
            if str(current_user["oid"]) != str(resource["organisation_id"]):
                raise HTTPException(
                    status_code=403,
                    detail="You are not authorized to access this resource",
                )
        return

    except Exception as e:
        logger.error(f"Error validating resource access: {e}")
        raise HTTPException(
            status_code=403, detail="You are not authorized to access this resource"
        )


async def get_api_key_auth(
    request: Request,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    x_api_secret: Optional[str] = Header(None, alias="X-API-Secret"),
    authorization: Optional[str] = Header(None),
) -> APIKey:
    """
    Authenticate using API key and secret key with domain validation
    
    Supports two authentication methods:
    1. X-API-Key and X-API-Secret headers
    2. Authorization header with format: ApiKey <api_key>:<secret_key>
    
    Also validates the request domain against allowed_domains
    """
    api_key_value = None
    secret_key_value = None

    # Method 1: Try X-API-Key and X-API-Secret headers
    if x_api_key and x_api_secret:
        api_key_value = x_api_key
        secret_key_value = x_api_secret
    # Method 2: Try Authorization header with ApiKey scheme
    elif authorization:
        try:
            if authorization.startswith("ApiKey "):
                credentials = authorization[7:]  # Remove "ApiKey " prefix
                if ":" in credentials:
                    api_key_value, secret_key_value = credentials.split(":", 1)
                else:
                    raise AuthenticationError(
                        message="Invalid API key format in Authorization header. Expected: ApiKey <api_key>:<secret_key>",
                        error_code="INVALID_API_KEY_FORMAT",
                    )
            else:
                # Not API key auth, let it fail and fall through
                raise AuthenticationError(
                    message="API key authentication required",
                    error_code="API_KEY_REQUIRED",
                )
        except ValueError:
            raise AuthenticationError(
                message="Invalid API key format in Authorization header. Expected: ApiKey <api_key>:<secret_key>",
                error_code="INVALID_API_KEY_FORMAT",
            )

    if not api_key_value or not secret_key_value:
        raise AuthenticationError(
            message="API key and secret key required. Use X-API-Key and X-API-Secret headers, or Authorization: ApiKey <api_key>:<secret_key>",
            error_code="API_KEY_REQUIRED",
        )

    # Verify API key and secret key
    api_key = await APIKeyService.verify_api_key(api_key_value, secret_key_value)
    if not api_key:
        raise AuthenticationError(
            message="Invalid API key or secret key",
            error_code="INVALID_API_KEY",
        )

    # Validate domain
    domain = _extract_domain_from_request(request)
    if domain and api_key.allowed_domains:
        # Only validate if allowed_domains is not empty
        if domain not in api_key.allowed_domains:
            raise AuthenticationError(
                message=f"Domain {domain} is not allowed for this API key",
                error_code="DOMAIN_NOT_ALLOWED",
            )

    # Update last used timestamp
    await APIKeyService.update_last_used(str(api_key.id))

    return api_key


def _extract_domain_from_request(request: Request) -> Optional[str]:
    """Extract domain from request headers (Origin or Referer)"""
    # Try Origin header first (more reliable for CORS requests)
    origin = request.headers.get("Origin")
    if origin:
        try:
            parsed = urlparse(origin)
            domain = parsed.netloc
            # Remove port if present
            if ":" in domain:
                domain = domain.split(":")[0]
            return domain
        except Exception:
            pass

    # Try Referer header as fallback
    referer = request.headers.get("Referer")
    if referer:
        try:
            parsed = urlparse(referer)
            domain = parsed.netloc
            # Remove port if present
            if ":" in domain:
                domain = domain.split(":")[0]
            return domain
        except Exception:
            pass

    # If no Origin or Referer, return None (will allow if no domain restrictions)
    return None


async def get_api_key_user(
    api_key: APIKey = Depends(get_api_key_auth),
) -> dict:
    """
    Get API key user payload (for compatibility with endpoints that expect user dict)
    This returns a dict similar to JWT token payload but for API key authentication
    """
    return {
        "auth_type": "api_key",
        "api_key_id": str(api_key.id),
        "api_key_name": api_key.name,
    }
