import logging
from datetime import UTC, datetime
from typing import List, Optional

from bson import ObjectId

from app.base.models import DuplicateError, NotFoundError
from app.utils import generate_api_key, generate_secret_key, security

from ..models import APIKey
from ..schemas.api_key import APIKeyCreate, APIKeyCreateResponse, APIKeyResponse, APIKeyUpdate

logger = logging.getLogger(__name__)


class APIKeyService:
    """API Key service for managing third-party API keys"""

    @staticmethod
    async def create_api_key(
        data: APIKeyCreate, created_by: Optional[str] = None, created_by_profile: Optional[str] = None
    ) -> APIKeyCreateResponse:
        """Create a new API key"""
        try:
            # Generate API key and secret key
            api_key_value = generate_api_key(prefix="ak")
            secret_key_value = generate_secret_key()

            # Hash the secret key before storing
            hashed_secret = security.get_password_hash(secret_key_value)

            # Create API key document
            api_key = await APIKey.create(
                name=data.name,
                description=data.description,
                api_key=api_key_value,
                secret_key=hashed_secret,
                allowed_domains=data.allowed_domains,
                created_by=created_by,
                created_by_profile=created_by_profile,
            )

            # Return response with full keys (only time they'll be shown)
            return APIKeyCreateResponse(
                id=str(api_key.id),
                name=api_key.name,
                description=api_key.description,
                api_key=api_key_value,  # Full API key
                secret_key=secret_key_value,  # Full secret key (only shown once)
                allowed_domains=api_key.allowed_domains,
                is_active=api_key.is_active,
                created_at=api_key.created_at,
                updated_at=api_key.updated_at,
            )

        except Exception as e:
            logger.error(f"Error creating API key: {e}")
            raise

    @staticmethod
    async def get_api_key(api_key_id: str) -> APIKeyResponse:
        """Get API key by ID"""
        api_key = await APIKey.find_one({"_id": ObjectId(api_key_id), "is_deleted": False})
        if not api_key:
            raise NotFoundError("API key not found")

        # Only show partial API key for security (prefix and first few chars)
        masked_api_key = APIKeyService._mask_api_key(api_key.api_key)

        return APIKeyResponse(
            id=str(api_key.id),
            name=api_key.name,
            description=api_key.description,
            api_key=masked_api_key,
            allowed_domains=api_key.allowed_domains,
            is_active=api_key.is_active,
            last_used_at=api_key.last_used_at,
            created_at=api_key.created_at,
            updated_at=api_key.updated_at,
        )

    @staticmethod
    async def list_api_keys(
        skip: int = 0, limit: int = 100, is_active: Optional[bool] = None
    ) -> List[APIKeyResponse]:
        """List all API keys"""
        filter_dict = {"is_deleted": False}
        if is_active is not None:
            filter_dict["is_active"] = is_active

        api_keys = await APIKey.find(filter_dict, skip=skip, limit=limit, sort=[("created_at", -1)])

        return [
            APIKeyResponse(
                id=str(ak.id),
                name=ak.name,
                description=ak.description,
                api_key=APIKeyService._mask_api_key(ak.api_key),
                allowed_domains=ak.allowed_domains,
                is_active=ak.is_active,
                last_used_at=ak.last_used_at,
                created_at=ak.created_at,
                updated_at=ak.updated_at,
            )
            for ak in api_keys
        ]

    @staticmethod
    async def update_api_key(
        api_key_id: str,
        data: APIKeyUpdate,
        updated_by: Optional[str] = None,
        updated_by_profile: Optional[str] = None,
    ) -> APIKeyResponse:
        """Update an API key"""
        api_key = await APIKey.find_one({"_id": ObjectId(api_key_id), "is_deleted": False})
        if not api_key:
            raise NotFoundError("API key not found")

        update_dict = {}
        if data.name is not None:
            update_dict["name"] = data.name
        if data.description is not None:
            update_dict["description"] = data.description
        if data.allowed_domains is not None:
            update_dict["allowed_domains"] = data.allowed_domains
        if data.is_active is not None:
            update_dict["is_active"] = data.is_active

        if update_dict:
            update_dict["updated_by"] = updated_by
            update_dict["updated_by_profile"] = updated_by_profile
            await api_key.update(update_dict)

        # Reload to get updated data
        api_key = await APIKey.find_one({"_id": ObjectId(api_key_id), "is_deleted": False})

        return APIKeyResponse(
            id=str(api_key.id),
            name=api_key.name,
            description=api_key.description,
            api_key=APIKeyService._mask_api_key(api_key.api_key),
            allowed_domains=api_key.allowed_domains,
            is_active=api_key.is_active,
            last_used_at=api_key.last_used_at,
            created_at=api_key.created_at,
            updated_at=api_key.updated_at,
        )

    @staticmethod
    async def delete_api_key(api_key_id: str) -> bool:
        """Delete (soft delete) an API key"""
        api_key = await APIKey.find_one({"_id": ObjectId(api_key_id), "is_deleted": False})
        if not api_key:
            raise NotFoundError("API key not found")

        await api_key.delete()
        return True

    @staticmethod
    async def regenerate_secret_key(
        api_key_id: str, updated_by: Optional[str] = None, updated_by_profile: Optional[str] = None
    ) -> APIKeyCreateResponse:
        """Regenerate secret key for an API key"""
        api_key = await APIKey.find_one({"_id": ObjectId(api_key_id), "is_deleted": False})
        if not api_key:
            raise NotFoundError("API key not found")

        # Generate new secret key
        new_secret_key = generate_secret_key()
        hashed_secret = security.get_password_hash(new_secret_key)

        # Update secret key
        await api_key.update({
            "secret_key": hashed_secret,
            "updated_by": updated_by,
            "updated_by_profile": updated_by_profile,
        })

        # Reload to get updated data
        api_key = await APIKey.find_one({"_id": ObjectId(api_key_id), "is_deleted": False})

        return APIKeyCreateResponse(
            id=str(api_key.id),
            name=api_key.name,
            description=api_key.description,
            api_key=api_key.api_key,  # API key remains the same
            secret_key=new_secret_key,  # New secret key (only shown once)
            allowed_domains=api_key.allowed_domains,
            is_active=api_key.is_active,
            created_at=api_key.created_at,
            updated_at=api_key.updated_at,
        )

    @staticmethod
    async def verify_api_key(api_key_value: str, secret_key_value: str) -> Optional[APIKey]:
        """Verify API key and secret key combination"""
        api_key = await APIKey.find_one({
            "api_key": api_key_value,
            "is_active": True,
            "is_deleted": False,
        })
        if not api_key:
            return None

        # Verify secret key
        if not security.verify_password(secret_key_value, api_key.secret_key):
            return None

        return api_key

    @staticmethod
    async def verify_api_key_by_api_key_only(api_key_value: str) -> Optional[APIKey]:
        """Verify API key (for cases where only API key is provided)"""
        api_key = await APIKey.find_one({
            "api_key": api_key_value,
            "is_active": True,
            "is_deleted": False,
        })
        return api_key

    @staticmethod
    async def update_last_used(api_key_id: str) -> None:
        """Update last used timestamp for an API key"""
        try:
            await APIKey.get_collection().update_one(
                {"_id": ObjectId(api_key_id)},
                {"$set": {"last_used_at": datetime.now(UTC)}},
            )
        except Exception as e:
            logger.warning(f"Failed to update last_used_at for API key {api_key_id}: {e}")

    @staticmethod
    def _mask_api_key(api_key: str) -> str:
        """Mask API key for display (show prefix and first 8 chars)"""
        if not api_key:
            return ""
        parts = api_key.split("_", 1)
        if len(parts) == 2:
            prefix, key_part = parts
            if len(key_part) > 8:
                return f"{prefix}_{key_part[:8]}***"
            else:
                return f"{prefix}_***"
        return "***"

