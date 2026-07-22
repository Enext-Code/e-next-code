import logging
from typing import List

from fastapi import APIRouter, Body, Depends, Query, status

from app.accounts.api.v1.dependencies import get_current_user
from app.base.models import (BaseResponse, ErrorResponse, InternalServerError,
                             NotFoundError, PaginationResponse, ValidationError)
from app.patients.filters import PatientCatheterFilterParams
from app.patients.schemas import (PatientCatheterBulkCreateResponse,
                                   PatientCatheterCreate, PatientCatheterListResponse,
                                   PatientCatheterResponse, PatientCatheterUpdate)
from app.patients.services import PatientCatheterService
from app.utils import format_response

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=BaseResponse[PatientCatheterResponse],
    responses={
        201: {
            "model": BaseResponse[PatientCatheterResponse],
            "description": "Catheter created successfully",
        },
        400: {"model": ErrorResponse, "description": "Bad request"},
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(
    response_model=PatientCatheterResponse, message="Catheter created successfully"
)
async def create_catheter(
    request: PatientCatheterCreate = Body(...),
    current_user=Depends(get_current_user),
) -> PatientCatheterResponse:
    """Create a new patient catheter"""
    try:
        return await PatientCatheterService.create_catheter(
            request,
            current_user.get("oid", "default_org"),
            str(current_user["sub"]),
            str(current_user["pid"]),
        )
    except Exception as e:
        logger.error(f"Error creating catheter: {str(e)}")
        raise InternalServerError(
            message="Failed to create catheter", error_code="FAILED_TO_CREATE_CATHETER"
        )


@router.get(
    "/{catheter_id}",
    response_model=BaseResponse[PatientCatheterResponse],
    responses={
        200: {
            "model": BaseResponse[PatientCatheterResponse],
            "description": "Catheter retrieved successfully",
        },
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "Catheter not found"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(
    response_model=PatientCatheterResponse, message="Catheter retrieved successfully"
)
async def get_catheter(
    catheter_id: str, current_user=Depends(get_current_user)
) -> PatientCatheterResponse:
    """Get a patient catheter by ID"""
    try:
        return await PatientCatheterService.get_catheter(catheter_id)
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error retrieving catheter: {str(e)}")
        raise InternalServerError(
            message="Failed to retrieve catheter", error_code="FAILED_TO_RETRIEVE_CATHETER"
        )


@router.put(
    "/{catheter_id}",
    response_model=BaseResponse[PatientCatheterResponse],
    responses={
        200: {
            "model": BaseResponse[PatientCatheterResponse],
            "description": "Catheter updated successfully",
        },
        400: {"model": ErrorResponse, "description": "Bad request"},
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "Catheter not found"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(
    response_model=PatientCatheterResponse, message="Catheter updated successfully"
)
async def update_catheter(
    catheter_id: str,
    request: PatientCatheterUpdate = Body(...),
    current_user=Depends(get_current_user),
) -> PatientCatheterResponse:
    """Update a patient catheter"""
    try:
        return await PatientCatheterService.update_catheter(
            catheter_id, request, str(current_user["sub"]), str(current_user["pid"])
        )
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error updating catheter: {str(e)}")
        raise InternalServerError(
            message="Failed to update catheter", error_code="FAILED_TO_UPDATE_CATHETER"
        )


@router.delete(
    "/{catheter_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        204: {"description": "Catheter deleted successfully"},
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "Catheter not found"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def delete_catheter(
    catheter_id: str, current_user=Depends(get_current_user)
) -> None:
    """Delete a patient catheter"""
    try:
        await PatientCatheterService.delete_catheter(
            catheter_id, str(current_user["sub"]), str(current_user["pid"])
        )
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error deleting catheter: {str(e)}")
        raise InternalServerError(
            message="Failed to delete catheter", error_code="FAILED_TO_DELETE_CATHETER"
        )


@router.get(
    "",
    response_model=BaseResponse[PaginationResponse[PatientCatheterResponse]],
    responses={
        200: {
            "model": BaseResponse[PaginationResponse[PatientCatheterResponse]],
            "description": "Catheters retrieved successfully",
        },
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(
    response_model=PaginationResponse[PatientCatheterResponse],
    message="Catheters retrieved successfully",
)
async def get_catheters(
    params: PatientCatheterFilterParams = Depends(),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Number of items per page"),
    current_user=Depends(get_current_user),
) -> PaginationResponse[PatientCatheterResponse]:
    """Get list of patient catheters with pagination and filtering"""
    try:
        return await PatientCatheterService.get_catheters(
            params, current_user.get("oid", "default_org"), page, page_size
        )
    except Exception as e:
        logger.error(f"Error retrieving catheters: {str(e)}")
        raise InternalServerError(
            message="Failed to retrieve catheters", error_code="FAILED_TO_RETRIEVE_CATHETERS"
        )


@router.get(
    "/patient/{patient_id}",
    response_model=BaseResponse[List[PatientCatheterResponse]],
    responses={
        200: {
            "model": BaseResponse[List[PatientCatheterResponse]],
            "description": "Patient catheters retrieved successfully",
        },
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(
    response_model=List[PatientCatheterResponse],
    message="Patient catheters retrieved successfully",
)
async def get_patient_catheters(
    patient_id: str,
    current_user=Depends(get_current_user),
) -> List[PatientCatheterResponse]:
    """Get all catheters for a specific patient"""
    try:
        return await PatientCatheterService.get_patient_catheters(
            patient_id, current_user.get("oid", "default_org")
        )
    except Exception as e:
        logger.error(f"Error retrieving patient catheters: {str(e)}")
        raise InternalServerError(
            message="Failed to retrieve patient catheters",
            error_code="FAILED_TO_RETRIEVE_PATIENT_CATHETERS",
        )


@router.get(
    "/patient/{patient_id}/active",
    response_model=BaseResponse[List[PatientCatheterResponse]],
    responses={
        200: {
            "model": BaseResponse[List[PatientCatheterResponse]],
            "description": "Active patient catheters retrieved successfully",
        },
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(
    response_model=List[PatientCatheterResponse],
    message="Active patient catheters retrieved successfully",
)
async def get_active_patient_catheters(
    patient_id: str,
    current_user=Depends(get_current_user),
) -> List[PatientCatheterResponse]:
    """Get active catheters for a specific patient (inserted but not removed)"""
    try:
        return await PatientCatheterService.get_active_catheters(
            patient_id, current_user.get("oid", "default_org")
        )
    except Exception as e:
        logger.error(f"Error retrieving active patient catheters: {str(e)}")
        raise InternalServerError(
            message="Failed to retrieve active patient catheters",
            error_code="FAILED_TO_RETRIEVE_ACTIVE_PATIENT_CATHETERS",
        )


@router.post(
    "/patient-catheters",
    status_code=status.HTTP_201_CREATED,
    response_model=BaseResponse[PatientCatheterBulkCreateResponse],
    responses={
        201: {
            "model": BaseResponse[PatientCatheterBulkCreateResponse],
            "description": "Patient catheters created successfully",
        },
        400: {"model": ErrorResponse, "description": "Bad request"},
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@format_response(
    response_model=PatientCatheterBulkCreateResponse,
    message="Patient catheters created successfully",
)
async def create_patient_catheters(
    patient_id: str = Query(..., description="Patient ID"),
    request_data: dict = Body(..., description="JSON object containing catheter entries"),
    current_user=Depends(get_current_user),
) -> PatientCatheterBulkCreateResponse:
    """Create multiple catheters for a single patient"""
    try:
        # Validate the structure
        if "entries" not in request_data:
            raise ValidationError(
                message="Missing 'entries' field in request data",
                error_code="MISSING_ENTRIES_FIELD"
            )
        
        if not isinstance(request_data["entries"], list):
            raise ValidationError(
                message="'entries' must be a list",
                error_code="ENTRIES_MUST_BE_LIST"
            )
        
        # Create catheter objects with patient_id
        catheters = []
        for entry in request_data["entries"]:
            # Add patient_id to each entry
            entry["patient_id"] = patient_id
            catheters.append(PatientCatheterCreate(**entry))
        
        return await PatientCatheterService.bulk_create_catheters(
            catheters,
            current_user.get("oid", "default_org"),
            str(current_user["sub"]),
            str(current_user["pid"]),
        )
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Error creating patient catheters: {str(e)}")
        raise InternalServerError(
            message="Failed to create patient catheters",
            error_code="FAILED_TO_CREATE_PATIENT_CATHETERS",
        )
