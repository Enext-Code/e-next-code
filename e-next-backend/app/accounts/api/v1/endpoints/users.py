import json
import logging
from datetime import datetime
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, File, Form, UploadFile, status

from app.base.models import (AuthorizationError, BaseResponse, DuplicateError,
                             ErrorResponse, InternalServerError, NotFoundError,
                             PaginationResponse)
from app.core.s3 import s3
from app.utils import format_response

from ....filters import UserFilterParams
from ....models import User
from ....schemas import UserCreate, UserResponse, UserUpdate
from ....services import UserService
from ..dependencies import get_current_user, require_admin_or_superadmin, require_superadmin

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "", status_code=status.HTTP_201_CREATED, response_model=BaseResponse[UserResponse]
)
@format_response(response_model=UserResponse, message="User created successfully")
async def create_user(
    user_data: UserCreate = Body(...), current_user: dict = Depends(require_superadmin)
) -> UserResponse:
    """Create new user with primary profile"""
    try:
        data = {
            **user_data.model_dump(),
            "created_by": str(current_user["sub"]),
            "updated_by": str(current_user["sub"]),
            "created_by_profile": str(current_user["pid"]),
            "updated_by_profile": str(current_user["pid"]),
        }
        user, profile = await UserService.create_user_with_profile(data)
        return await UserService.get_user_details(str(user.id))
    except DuplicateError:
        raise DuplicateError(
            message="User already exists", error_code="USER_ALREADY_EXISTS"
        )
    except Exception as e:
        logger.error(f"User creation error: {str(e)}")
        raise InternalServerError(
            message="Failed to create user", error_code="FAILED_TO_CREATE_USER"
        )


@router.post(
    "/with-signature",
    status_code=status.HTTP_201_CREATED,
    response_model=BaseResponse[UserResponse],
)
@format_response(response_model=UserResponse, message="User created successfully")
async def create_user_with_signature(
    user_data: str = Form(..., description="User data as JSON string"),
    signature_file: UploadFile = File(None, description="Optional signature photo file"),
    current_user: dict = Depends(require_superadmin),
) -> UserResponse:
    """
    Create new user with primary profile and optionally upload signature photo in one request
    
    This endpoint accepts multipart/form-data:
    - user_data: JSON string containing user creation data (same format as POST /users)
    - signature_file: (optional) Image file for signature
    
    Example using curl with signature:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/accounts/users/with-signature" \\
      -H "Authorization: Bearer <token>" \\
      -F "user_data={\"email\":\"user@example.com\",\"country_code\":\"+91\",\"mobile_number\":\"1234567890\",\"password\":\"password123\",\"profile\":{\"first_name\":\"John\",\"last_name\":\"Doe\",\"user_type\":\"admin\"}}" \\
      -F "signature_file=@/path/to/signature.jpg"
    ```
    
    Example using curl without signature:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/accounts/users/with-signature" \\
      -H "Authorization: Bearer <token>" \\
      -F "user_data={\"email\":\"user@example.com\",\"country_code\":\"+91\",\"mobile_number\":\"1234567890\",\"password\":\"password123\",\"profile\":{\"first_name\":\"John\",\"last_name\":\"Doe\",\"user_type\":\"admin\"}}"
    ```
    
    Note: Use POST /users for creating users without signature (JSON body only)
    """
    try:
        # Parse JSON string to UserCreate
        try:
            user_data_dict = json.loads(user_data)
            user_create = UserCreate(**user_data_dict)
        except json.JSONDecodeError:
            raise InternalServerError(
                message="Invalid JSON format for user_data", error_code="INVALID_JSON"
            )
        except Exception as e:
            raise InternalServerError(
                message=f"Invalid user data: {str(e)}", error_code="INVALID_USER_DATA"
            )
        
        data = {
            **user_create.model_dump(),
            "created_by": str(current_user["sub"]),
            "updated_by": str(current_user["sub"]),
            "created_by_profile": str(current_user["pid"]),
            "updated_by_profile": str(current_user["pid"]),
        }
        
        # Create user first
        user, profile = await UserService.create_user_with_profile(data)
        
        # Upload signature file to S3 if provided
        if signature_file:
            try:
                # Validate signature file type (only images)
                if not signature_file.content_type or not signature_file.content_type.startswith("image/"):
                    raise InternalServerError(
                        message="Invalid file type. Only image files are allowed for signature.",
                        error_code="INVALID_FILE_TYPE"
                    )
                
                # Generate unique filename
                file_extension = signature_file.filename.split(".")[-1] if "." in signature_file.filename else "jpg"
                filename = f"signature_{str(user.id)}_{uuid4().hex}.{file_extension}"
                folder = f"users/{str(user.id)}/signatures"
                
                # Upload to S3
                metadata = {
                    "user_id": str(user.id),
                    "profile_id": str(profile.id),
                    "uploaded_by": str(current_user["sub"]),
                    "uploaded_at": datetime.utcnow().isoformat(),
                    "file_type": "signature",
                }
                
                upload_result = await s3.upload_file(
                    file=signature_file,
                    folder=folder,
                    filename=filename,
                    metadata=metadata,
                )
                
                # Update profile with S3 key
                profile.signature = upload_result["key"]
                profile.updated_by = str(current_user["sub"])
                profile.updated_by_profile = str(current_user["pid"])
                await profile.save()
                
                # Invalidate cache
                from app.core import cache
                cache_key_pattern = f"user:{str(user.id)}:*"
                await cache.delete_pattern(cache_key_pattern)
                profile_cache_key = f"user:active_profile:{profile.id}"
                await cache.delete(profile_cache_key)
            except InternalServerError:
                raise
            except Exception as e:
                logger.error(f"Error uploading signature during user creation: {str(e)}")
                # Don't fail user creation if signature upload fails, just log it
                # User can upload signature later using the signature endpoint
        
        return await UserService.get_user_details(str(user.id))

    except DuplicateError:
        raise DuplicateError(
            message="User already exists", error_code="USER_ALREADY_EXISTS"
        )
    except InternalServerError:
        raise
    except Exception as e:
        logger.error(f"User creation error: {str(e)}")
        raise InternalServerError(
            message="Failed to create user", error_code="FAILED_TO_CREATE_USER"
        )


@router.get(
    "",
    response_model=BaseResponse[UserResponse],
    responses={
        200: {
            "model": BaseResponse[UserResponse],
            "description": "Successfully retrieved user details",
        },
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "User not found"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(
    response_model=UserResponse, message="User details retrieved successfully"
)
async def get_profile(
    current_user: dict = Depends(get_current_user), profile_id: str = None
) -> UserResponse:
    """Get active profile"""
    try:
        return await UserService.get_user_details(str(current_user["sub"]), profile_id)
    except NotFoundError:
        raise NotFoundError(message="User not found", error_code="USER_NOT_FOUND")
    except Exception as e:
        logger.error(f"User details retrieval error: {str(e)}")
        raise InternalServerError(
            message="Failed to retrieve user details",
            error_code="FAILED_TO_RETRIEVE_USER_DETAILS",
        )


@router.get(
    "/list",
    response_model=BaseResponse[PaginationResponse[UserResponse]],
    responses={
        200: {
            "model": BaseResponse[PaginationResponse[UserResponse]],
            "description": "Successfully retrieved users list",
        },
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(
    response_model=PaginationResponse[UserResponse],
    message="Users list retrieved successfully",
)
async def get_users(
    params: UserFilterParams = Depends(), current_user: dict = Depends(get_current_user)
) -> PaginationResponse[UserResponse]:
    """Get users list with filters"""
    try:
        return await UserService.get_users_list(params, current_user)
    except Exception as e:
        logger.error(f"Users list retrieval error: {str(e)}")
        raise InternalServerError(
            message="Failed to retrieve users list",
            error_code="FAILED_TO_RETRIEVE_USERS_LIST",
        )


@router.put(
    "/{user_id}",
    response_model=BaseResponse[UserResponse],
    responses={
        200: {
            "model": BaseResponse[UserResponse],
            "description": "Successfully updated user and/or profile",
        },
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        403: {"model": ErrorResponse, "description": "Insufficient permissions"},
        404: {"model": ErrorResponse, "description": "User not found"},
        409: {"model": ErrorResponse, "description": "Duplicate email or mobile"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(response_model=UserResponse, message="User updated successfully")
async def update_user(
    user_id: str,
    update_data: UserUpdate = Body(
        ...,
        examples=[
            {
                "email": "updated@example.com",
                "country_code": "+91",
                "mobile_number": "9876543210",
                "profile": {
                    "first_name": "John",
                    "last_name": "Doe",
                    "user_type": "admin",
                    "gender": "male"
                }
            }
        ]
    ),
    current_user: dict = Depends(require_admin_or_superadmin),
) -> UserResponse:
    """
    Update user details and/or profile (admin or superadmin only)
    
    You can update:
    - User fields: email, country_code, mobile_number, password
    - Profile fields: first_name, last_name, user_type, gender, date_of_birth, avatar, signature, language, theme
    
    All fields are optional. Only provide the fields you want to update.
    Note: To upload a signature photo file, use the POST /{user_id}/signature endpoint.
    """
    try:
        # Get only the fields that are set
        data = update_data.model_dump(exclude_unset=True)
        
        if not data:
            raise InternalServerError(
                message="No fields to update", error_code="NO_FIELDS_TO_UPDATE"
            )
        
        await UserService.update_user(
            user_id=user_id,
            update_data=data,
            updated_by=str(current_user["sub"]),
            updated_by_profile=str(current_user["pid"]),
        )
        
        return await UserService.get_user_details(user_id)
    except NotFoundError:
        raise NotFoundError(message="User not found", error_code="USER_NOT_FOUND")
    except DuplicateError:
        raise DuplicateError(
            message="Email or mobile number already exists",
            error_code="USER_ALREADY_EXISTS",
        )
    except Exception as e:
        logger.error(f"User update error: {str(e)}")
        raise InternalServerError(
            message="Failed to update user", error_code="FAILED_TO_UPDATE_USER"
        )


@router.get(
    "/{user_id}/signature-url",
    response_model=BaseResponse[dict],
    responses={
        200: {
            "model": BaseResponse[dict],
            "description": "Successfully retrieved signature presigned URL",
        },
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        403: {"model": ErrorResponse, "description": "Insufficient permissions"},
        404: {"model": ErrorResponse, "description": "User or signature not found"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(
    response_model=dict, message="Signature URL retrieved successfully"
)
async def get_signature_url(
    user_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Get presigned URL for user's signature photo
    
    Users can get their own signature URL, or admins/superadmins can get for any user.
    Returns a presigned URL that can be used to access the signature image directly.
    The URL is valid for the duration specified in AWS_PRESIGNED_EXPIRATION (default 1 hour).
    
    Returns:
    - signature_url: Presigned URL to access the signature image (null if no signature exists)
    """
    try:
        # Check if user is getting their own signature or is admin/superadmin
        if user_id != str(current_user["sub"]):
            # Verify admin/superadmin permissions
            from ....enums import UserType
            from app.utils import decrypt_user_type
            encrypted_user_type = current_user.get("ut")
            if encrypted_user_type:
                user_type = UserType(decrypt_user_type(encrypted_user_type))
                if user_type not in [UserType.ADMIN, UserType.SUPERADMIN]:
                    raise AuthorizationError(
                        message="Insufficient permissions",
                        error_code="INSUFFICIENT_PERMISSIONS"
                    )
        
        # Get user to verify it exists
        user = await User.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise NotFoundError(message="User not found", error_code="USER_NOT_FOUND")
        
        # Get user's active profile
        profile = await user.get_active_profile()
        if not profile:
            raise NotFoundError(message="Profile not found", error_code="PROFILE_NOT_FOUND")
        
        # Check if signature exists
        if not profile.signature:
            return {"signature_url": None}
        
        # Generate presigned URL
        try:
            signature_url = await s3.get_presigned_url(profile.signature)
            return {"signature_url": signature_url}
        except Exception as e:
            logger.error(f"Error generating presigned URL for signature: {str(e)}")
            raise InternalServerError(
                message="Failed to generate signature URL", error_code="FAILED_TO_GENERATE_SIGNATURE_URL"
            )
    except NotFoundError:
        raise
    except AuthorizationError:
        raise
    except Exception as e:
        logger.error(f"Get signature URL error: {str(e)}")
        raise InternalServerError(
            message="Failed to get signature URL", error_code="FAILED_TO_GET_SIGNATURE_URL"
        )


@router.post(
    "/{user_id}/signature",
    response_model=BaseResponse[UserResponse],
    responses={
        200: {
            "model": BaseResponse[UserResponse],
            "description": "Successfully uploaded signature",
        },
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        403: {"model": ErrorResponse, "description": "Insufficient permissions"},
        404: {"model": ErrorResponse, "description": "User not found"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(response_model=UserResponse, message="Signature uploaded successfully")
async def upload_signature(
    user_id: str,
    signature_file: UploadFile = File(..., description="Signature photo file"),
    current_user: dict = Depends(get_current_user),
) -> UserResponse:
    """
    Upload signature photo for a user
    
    Users can upload their own signature, or admins/superadmins can upload for any user.
    The file will be uploaded to S3 and the S3 key will be stored in the user's profile.
    """
    try:
        # Check if user is uploading their own signature or is admin/superadmin
        if user_id != str(current_user["sub"]):
            # Verify admin/superadmin permissions
            from ....enums import UserType
            from app.utils import decrypt_user_type
            encrypted_user_type = current_user.get("ut")
            if encrypted_user_type:
                user_type = UserType(decrypt_user_type(encrypted_user_type))
                if user_type not in [UserType.ADMIN, UserType.SUPERADMIN]:
                    raise AuthorizationError(
                        message="Insufficient permissions",
                        error_code="INSUFFICIENT_PERMISSIONS"
                    )
        
        # Validate file type (only images)
        if not signature_file.content_type or not signature_file.content_type.startswith("image/"):
            raise InternalServerError(
                message="Invalid file type. Only image files are allowed.",
                error_code="INVALID_FILE_TYPE"
            )
        
        # Get user to verify it exists
        user = await User.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise NotFoundError(message="User not found", error_code="USER_NOT_FOUND")
        
        # Get user's active profile
        profile = await user.get_active_profile()
        if not profile:
            raise NotFoundError(message="Profile not found", error_code="PROFILE_NOT_FOUND")
        
        # Delete old signature from S3 if exists
        if profile.signature:
            try:
                await s3.delete_file(profile.signature)
            except Exception as e:
                logger.warning(f"Failed to delete old signature from S3: {str(e)}")
        
        # Generate unique filename
        file_extension = signature_file.filename.split(".")[-1] if "." in signature_file.filename else "jpg"
        filename = f"signature_{user_id}_{uuid4().hex}.{file_extension}"
        folder = f"users/{user_id}/signatures"
        
        # Upload to S3
        metadata = {
            "user_id": user_id,
            "profile_id": str(profile.id),
            "uploaded_by": str(current_user["sub"]),
            "uploaded_at": datetime.utcnow().isoformat(),
            "file_type": "signature",
        }
        
        upload_result = await s3.upload_file(
            file=signature_file,
            folder=folder,
            filename=filename,
            metadata=metadata,
        )
        
        # Update profile with S3 key
        profile.signature = upload_result["key"]
        profile.updated_by = str(current_user["sub"])
        profile.updated_by_profile = str(current_user["pid"])
        await profile.save()
        
        # Invalidate cache
        from app.core import cache
        cache_key_pattern = f"user:{user_id}:*"
        await cache.delete_pattern(cache_key_pattern)
        profile_cache_key = f"user:active_profile:{profile.id}"
        await cache.delete(profile_cache_key)
        
        return await UserService.get_user_details(user_id)
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Signature upload error: {str(e)}")
        raise InternalServerError(
            message="Failed to upload signature", error_code="FAILED_TO_UPLOAD_SIGNATURE"
        )


@router.patch(
    "/{user_id}/activate",
    response_model=BaseResponse[UserResponse],
    responses={
        200: {
            "model": BaseResponse[UserResponse],
            "description": "Successfully activated user",
        },
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        403: {"model": ErrorResponse, "description": "Insufficient permissions"},
        404: {"model": ErrorResponse, "description": "User not found"},
        409: {"model": ErrorResponse, "description": "User already active"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(response_model=UserResponse, message="User activated successfully")
async def activate_user(
    user_id: str,
    current_user: dict = Depends(require_admin_or_superadmin),
) -> UserResponse:
    """Activate a user (admin or superadmin only)"""
    try:
        await UserService.activate_user(
            user_id=user_id,
            updated_by=str(current_user["sub"]),
            updated_by_profile=str(current_user["pid"]),
        )
        return await UserService.get_user_details(user_id)
    except NotFoundError:
        raise NotFoundError(message="User not found", error_code="USER_NOT_FOUND")
    except DuplicateError:
        raise DuplicateError(
            message="User is already active", error_code="USER_ALREADY_ACTIVE"
        )
    except Exception as e:
        logger.error(f"User activation error: {str(e)}")
        raise InternalServerError(
            message="Failed to activate user", error_code="FAILED_TO_ACTIVATE_USER"
        )


@router.patch(
    "/{user_id}/deactivate",
    response_model=BaseResponse[UserResponse],
    responses={
        200: {
            "model": BaseResponse[UserResponse],
            "description": "Successfully deactivated user",
        },
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        403: {"model": ErrorResponse, "description": "Insufficient permissions"},
        404: {"model": ErrorResponse, "description": "User not found"},
        409: {"model": ErrorResponse, "description": "User already inactive"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(response_model=UserResponse, message="User deactivated successfully")
async def deactivate_user(
    user_id: str,
    current_user: dict = Depends(require_admin_or_superadmin),
) -> UserResponse:
    """Deactivate a user (admin or superadmin only)"""
    try:
        await UserService.deactivate_user(
            user_id=user_id,
            updated_by=str(current_user["sub"]),
            updated_by_profile=str(current_user["pid"]),
        )
        return await UserService.get_user_details(user_id)
    except NotFoundError:
        raise NotFoundError(message="User not found", error_code="USER_NOT_FOUND")
    except DuplicateError:
        raise DuplicateError(
            message="User is already inactive", error_code="USER_ALREADY_INACTIVE"
        )
    except Exception as e:
        logger.error(f"User deactivation error: {str(e)}")
        raise InternalServerError(
            message="Failed to deactivate user",
            error_code="FAILED_TO_DEACTIVATE_USER",
        )
