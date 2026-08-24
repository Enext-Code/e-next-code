from fastapi import APIRouter, Depends

from app.accounts.api.v1 import get_current_user, require_superadmin
from app.base.models import BaseResponse, PaginationResponse
from app.utils import format_response

from ....filters import ICDCodeFilterParams
from ....schemas import (ICDCodeBulkCreateRequest, ICDCodeBulkCreateResponse,
                         ICDCodeCreate, ICDCodeResponse, ICDCodeUpdate)
from ....services import icd_code_service

router = APIRouter()


@router.get(
    "/",
    response_model=BaseResponse[ICDCodeResponse],
    description="Get ICD code by ID",
)
@format_response(
    response_model=ICDCodeResponse, message="ICD code retrieved successfully"
)
async def get_icd_code(
    icd_code_id: str, current_user=Depends(get_current_user)
) -> ICDCodeResponse:
    """
    Get ICD code by ID
    """
    try:
        icd_code = await icd_code_service.get_icd_code(icd_code_id)
        return icd_code
    except Exception as e:
        raise e


@router.post(
    "",
    response_model=BaseResponse[ICDCodeResponse],
    description="Create a new ICD code",
)
@format_response(
    response_model=ICDCodeResponse, message="ICD code created successfully"
)
async def create_icd_code(
    icd_code: ICDCodeCreate, current_user=Depends(require_superadmin)
) -> ICDCodeResponse:
    """
    Create a new ICD code
    """
    try:
        icd_code = await icd_code_service.create_icd_code(
            icd_code.model_dump(), current_user
        )
        return icd_code
    except Exception as e:
        raise e


@router.put(
    "/",
    response_model=BaseResponse[ICDCodeResponse],
    description="Update an existing ICD code",
)
@format_response(
    response_model=ICDCodeResponse, message="ICD code updated successfully"
)
async def update_icd_code(
    icd_code_id: str, icd_code: ICDCodeUpdate, current_user=Depends(require_superadmin)
) -> ICDCodeResponse:
    """
    Update an existing ICD code
    """
    try:
        icd_code = await icd_code_service.update_icd_code(
            icd_code_id, icd_code.model_dump(), current_user
        )
        return icd_code
    except Exception as e:
        raise e


@router.delete(
    "/",
    response_model=BaseResponse[ICDCodeResponse],
    description="Delete an existing ICD code",
)
@format_response(
    response_model=ICDCodeResponse, message="ICD code deleted successfully"
)
async def delete_icd_code(
    icd_code_id: str, current_user=Depends(require_superadmin)
) -> ICDCodeResponse:
    """
    Delete an existing ICD code
    """
    try:
        icd_code = await icd_code_service.delete_icd_code(icd_code_id, current_user)
        return icd_code
    except Exception as e:
        raise e


@router.get(
    "",
    response_model=BaseResponse[PaginationResponse[ICDCodeResponse]],
    description="Get all ICD codes",
)
@format_response(
    response_model=PaginationResponse[ICDCodeResponse],
    message="ICD codes retrieved successfully",
)
async def get_icd_codes(
    params: ICDCodeFilterParams = Depends(),
    current_user=Depends(get_current_user),
) -> PaginationResponse[ICDCodeResponse]:
    """
    Get all ICD codes
    """
    try:
        icd_codes = await icd_code_service.get_all_icd_codes(params)
        return icd_codes
    except Exception as e:
        raise e


@router.post(
    "/bulk",
    response_model=BaseResponse[ICDCodeBulkCreateResponse],
    description="Bulk create ICD codes",
)
@format_response(
    response_model=ICDCodeBulkCreateResponse,
    message="ICD codes bulk created successfully",
)
async def bulk_create_icd_codes(
    request: ICDCodeBulkCreateRequest,
    current_user=Depends(require_superadmin),
) -> ICDCodeBulkCreateResponse:
    """
    Bulk create ICD codes with validation and error handling

    Features:
    - Accept list of ICD code objects in request payload
    - Pre-validation of all items
    - Duplicate detection (both in DB and within batch)
    - Transactional processing
    - Detailed error reporting per item
    - Performance optimized with batch inserts
    - stop_on_error flag to control processing behavior
    - validate_only flag for dry runs

    Request Example:
    ```json
    {
        "items": [
            {
                "code": "A01.0",
                "description": "Typhoid fever",
            },
            {
                "code": "A01.1",
                "description": "Paratyphoid fever A",
            }
        ],
        "stop_on_error": false,
        "validate_only": false
    }
    ```

    Response Example:
    ```json
    {
        "data": {
            "total": 2,
            "successful": 2,
            "failed": 0,
            "errors": [],
            "created_ids": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
            "processing_time_ms": 125.5
        },
        "message": "Bulk ICD codes creation completed"
    }
    ```
    """
    try:
        items_data = [item.model_dump(exclude_none=True) for item in request.items]
        result = await icd_code_service.bulk_create_icd_codes(
            items=items_data,
            current_user=current_user,
            stop_on_error=request.stop_on_error,
            validate_only=request.validate_only,
        )
        return result
    except Exception as e:
        raise e
