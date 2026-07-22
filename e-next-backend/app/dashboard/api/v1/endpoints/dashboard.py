import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, status

from app.accounts.api.v1.dependencies import get_current_user
from app.base.models import BaseResponse, ErrorResponse, InternalServerError
from app.dashboard.schemas import DashboardResponse, DetailedCountsResponse, DropdownResponse
from app.dashboard.services import DashboardService
from app.utils import format_response

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/stats",
    response_model=BaseResponse[DashboardResponse],
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "Dashboard statistics retrieved successfully"},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
    summary="Get Dashboard Statistics",
    description="Retrieve comprehensive dashboard statistics including staff counts, patient counts, and remote center statistics",
)
@format_response(
    response_model=DashboardResponse, message="Dashboard statistics retrieved successfully"
)
async def get_dashboard_stats(
    organisation_id: Optional[str] = Query(
        None, description="Filter by organisation ID (optional)"
    ),
    current_user=Depends(get_current_user),
) -> DashboardResponse:
    """
    Get comprehensive dashboard statistics
    
    Returns:
    - Total active patients
    - Total doctors and nurses
    - New admission patients
    - Remote center wise statistics
    - Staff and patient counts per center
    """
    try:
        # Use organisation_id from query param or fallback to user's organisation
        org_id = organisation_id or current_user.get("oid", "default_org")
        
        return await DashboardService.get_dashboard_stats(org_id)
    except Exception as e:
        logger.error(f"Error retrieving dashboard stats: {str(e)}")
        raise InternalServerError(
            message="Failed to retrieve dashboard statistics",
            error_code="FAILED_TO_RETRIEVE_DASHBOARD_STATS"
        )


@router.get(
    "/dropdown",
    response_model=BaseResponse[DropdownResponse],
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "Dropdown data retrieved successfully"},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
    summary="Get Dashboard Dropdown Data",
    description="Retrieve dropdown data for dashboard including remote centers, staff, and patients",
)
@format_response(
    response_model=DropdownResponse, message="Dropdown data retrieved successfully"
)
async def get_dashboard_dropdown(
    organisation_id: Optional[str] = Query(
        None, description="Filter by organisation ID (optional)"
    ),
    current_user=Depends(get_current_user),
) -> DropdownResponse:
    """
    Get dropdown data for dashboard
    
    Returns:
    - Remote centers with patient and staff counts
    - Staff members with their details
    - Patients with their details
    """
    try:
        # Use organisation_id from query param or fallback to user's organisation
        org_id = organisation_id or current_user.get("oid", "default_org")
        
        return await DashboardService.get_dropdown_data(org_id)
    except Exception as e:
        logger.error(f"Error retrieving dropdown data: {str(e)}")
        raise InternalServerError(
            message="Failed to retrieve dropdown data",
            error_code="FAILED_TO_RETRIEVE_DROPDOWN_DATA"
        )


@router.get(
    "/summary",
    response_model=BaseResponse[DashboardResponse],
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "Dashboard summary retrieved successfully"},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
    summary="Get Dashboard Summary",
    description="Get a quick summary of key dashboard metrics",
)
@format_response(
    response_model=DashboardResponse, message="Dashboard summary retrieved successfully"
)
async def get_dashboard_summary(
    organisation_id: Optional[str] = Query(
        None, description="Filter by organisation ID (optional)"
    ),
    current_user=Depends(get_current_user),
) -> DashboardResponse:
    """
    Get a quick summary of key dashboard metrics
    
    This endpoint provides the same data as /stats but is optimized for quick loading
    and can be used for summary widgets or quick overviews.
    """
    try:
        # Use organisation_id from query param or fallback to user's organisation
        org_id = organisation_id or current_user.get("oid", "default_org")
        
        return await DashboardService.get_dashboard_stats(org_id)
    except Exception as e:
        logger.error(f"Error retrieving dashboard summary: {str(e)}")
        raise InternalServerError(
            message="Failed to retrieve dashboard summary",
            error_code="FAILED_TO_RETRIEVE_DASHBOARD_SUMMARY"
        )


@router.get(
    "/counts",
    response_model=BaseResponse[DetailedCountsResponse],
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "Detailed counts retrieved successfully"},
        500: {"description": "Internal server error", "model": ErrorResponse},
    },
    summary="Get Detailed Counts with Date Filter",
    description="Get comprehensive counts of all dashboard metrics with optional date filtering",
)
@format_response(
    response_model=DetailedCountsResponse, message="Detailed counts retrieved successfully"
)
async def get_detailed_counts(
    organisation_id: Optional[str] = Query(
        None, description="Filter by organisation ID (optional)"
    ),
    start_date: Optional[str] = Query(
        None, description="Start date for filtering (YYYY-MM-DD format)"
    ),
    end_date: Optional[str] = Query(
        None, description="End date for filtering (YYYY-MM-DD format)"
    ),
    current_user=Depends(get_current_user),
) -> DetailedCountsResponse:
    """
    Get detailed counts with date filtering
    
    Returns comprehensive counts including:
    - Total patients, active patients, discharged patients
    - New admissions in date range
    - Total doctors, nurses, and staff
    - Remote centers count
    - Bed occupancy statistics
    
    Query Parameters:
    - organisation_id: Filter by specific organisation
    - start_date: Start date for admission filtering (YYYY-MM-DD)
    - end_date: End date for admission filtering (YYYY-MM-DD)
    """
    try:
        from datetime import datetime
        
        # Use organisation_id from query param or fallback to user's organisation
        org_id = organisation_id or current_user.get("oid", "default_org")
        
        # Parse dates if provided
        parsed_start_date = None
        parsed_end_date = None
        
        if start_date:
            try:
                parsed_start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError("Invalid start_date format. Use YYYY-MM-DD")
        
        if end_date:
            try:
                parsed_end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError("Invalid end_date format. Use YYYY-MM-DD")
        
        return await DashboardService.get_detailed_counts(
            organisation_id=org_id,
            start_date=parsed_start_date,
            end_date=parsed_end_date
        )
    except ValueError as e:
        raise InternalServerError(
            message=str(e),
            error_code="INVALID_DATE_FORMAT"
        )
    except Exception as e:
        logger.error(f"Error retrieving detailed counts: {str(e)}")
        raise InternalServerError(
            message="Failed to retrieve detailed counts",
            error_code="FAILED_TO_RETRIEVE_DETAILED_COUNTS"
        )
