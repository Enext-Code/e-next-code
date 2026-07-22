import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from bson import ObjectId

from app.base.models import (BaseResponse, DuplicateError, NotFoundError,
                             PaginationResponse)
from app.patients.filters import PatientCatheterFilterParams
from app.patients.models import PatientCatheter
from app.patients.schemas import (PatientCatheterBulkCreateResponse,
                                   PatientCatheterCreate, PatientCatheterResponse,
                                   PatientCatheterUpdate)

logger = logging.getLogger(__name__)


class PatientCatheterService:
    """Patient Catheter service"""

    @staticmethod
    async def create_catheter(
        catheter_data: PatientCatheterCreate,
        organisation_id: str,
        current_user_id: str,
        current_profile_id: str,
    ) -> PatientCatheterResponse:
        """Create a new patient catheter"""
        try:
            # Calculate days in use if both dates are provided
            days_in_use = None
            if catheter_data.date_of_insertion and catheter_data.date_of_removal:
                # Ensure both datetimes are timezone-aware
                insertion_date = catheter_data.date_of_insertion
                removal_date = catheter_data.date_of_removal
                
                if insertion_date.tzinfo is None:
                    insertion_date = insertion_date.replace(tzinfo=timezone.utc)
                if removal_date.tzinfo is None:
                    removal_date = removal_date.replace(tzinfo=timezone.utc)
                
                delta = removal_date - insertion_date
                days_in_use = delta.days
            elif catheter_data.date_of_insertion and not catheter_data.date_of_removal:
                # Calculate days from insertion to now
                insertion_date = catheter_data.date_of_insertion
                if insertion_date.tzinfo is None:
                    insertion_date = insertion_date.replace(tzinfo=timezone.utc)
                
                now = datetime.now(timezone.utc)
                delta = now - insertion_date
                days_in_use = delta.days

            data = {
                **catheter_data.model_dump(),
                "days_in_use": days_in_use,
                "organisation_id": organisation_id,
                "created_by": current_user_id,
                "updated_by": current_user_id,
                "created_by_profile": current_profile_id,
                "updated_by_profile": current_profile_id,
            }

            catheter = await PatientCatheter.create(**data)
            
            return await PatientCatheterService.get_catheter(str(catheter.id))
        except Exception as e:
            logger.error(f"Error creating catheter: {str(e)}")
            raise

    @staticmethod
    async def get_catheter(catheter_id: str) -> PatientCatheterResponse:
        """Get catheter by ID"""
        catheter = await PatientCatheter.find_one(
            {"_id": ObjectId(catheter_id), "is_active": True, "is_deleted": False}
        )
        if not catheter:
            raise NotFoundError(
                message="Catheter not found", error_code="CATHETER_NOT_FOUND"
            )

        response = PatientCatheterResponse.model_validate(catheter)
        return response

    @staticmethod
    async def update_catheter(
        catheter_id: str,
        catheter_data: PatientCatheterUpdate,
        current_user_id: str,
        current_profile_id: str,
    ) -> PatientCatheterResponse:
        """Update a patient catheter"""
        catheter = await PatientCatheter.find_one(
            {"_id": ObjectId(catheter_id), "is_active": True, "is_deleted": False}
        )
        if not catheter:
            raise NotFoundError(
                message="Catheter not found", error_code="CATHETER_NOT_FOUND"
            )

        # Calculate days in use if dates are updated
        update_data = catheter_data.model_dump(exclude_unset=True)
        
        # Get current dates
        date_of_insertion = update_data.get("date_of_insertion", catheter.date_of_insertion)
        date_of_removal = update_data.get("date_of_removal", catheter.date_of_removal)
        
        # Calculate days in use
        days_in_use = None
        if date_of_insertion and date_of_removal:
            # Ensure both datetimes are timezone-aware
            if date_of_insertion.tzinfo is None:
                date_of_insertion = date_of_insertion.replace(tzinfo=timezone.utc)
            if date_of_removal.tzinfo is None:
                date_of_removal = date_of_removal.replace(tzinfo=timezone.utc)
            
            delta = date_of_removal - date_of_insertion
            days_in_use = delta.days
        elif date_of_insertion and not date_of_removal:
            # Ensure insertion date is timezone-aware
            if date_of_insertion.tzinfo is None:
                date_of_insertion = date_of_insertion.replace(tzinfo=timezone.utc)
            
            now = datetime.now(timezone.utc)
            delta = now - date_of_insertion
            days_in_use = delta.days

        update_data.update({
            "days_in_use": days_in_use,
            "updated_by": current_user_id,
            "updated_by_profile": current_profile_id,
            "updated_at": datetime.now(timezone.utc),
        })

        await catheter.update(update_data)
        
        return await PatientCatheterService.get_catheter(catheter_id)

    @staticmethod
    async def delete_catheter(
        catheter_id: str, current_user_id: str, current_profile_id: str
    ) -> bool:
        """Delete a patient catheter (soft delete)"""
        catheter = await PatientCatheter.find_one(
            {"_id": ObjectId(catheter_id), "is_active": True, "is_deleted": False}
        )
        if not catheter:
            raise NotFoundError(
                message="Catheter not found", error_code="CATHETER_NOT_FOUND"
            )

        await catheter.update({
            "is_deleted": True,
            "is_active": False,
            "updated_by": current_user_id,
            "updated_by_profile": current_profile_id,
            "updated_at": datetime.now(timezone.utc),
        })
        
        return True

    @staticmethod
    async def get_catheters(
        params: PatientCatheterFilterParams,
        organisation_id: str,
        page: int = 1,
        page_size: int = 10,
    ) -> PaginationResponse[PatientCatheterResponse]:
        """Get list of patient catheters with pagination and filtering"""
        try:
            logger.info(f"Getting catheters with params: {params.model_dump()}, org_id: {organisation_id}, page: {page}, page_size: {page_size}")

            # Build filter query
            filter_query = {
                "organisation_id": organisation_id,
                "is_active": True,
                "is_deleted": False,
            }

            if params.patient_id:
                filter_query["patient_id"] = params.patient_id
            if params.type:
                filter_query["type"] = params.type
            if params.catheter_type:
                filter_query["catheter_type"] = params.catheter_type
            if params.site:
                filter_query["site"] = {"$regex": params.site, "$options": "i"}
            if params.inserted_by:
                filter_query["inserted_by"] = params.inserted_by
            if params.removed_by:
                filter_query["removed_by"] = params.removed_by
            if params.is_active_catheter is not None:
                if params.is_active_catheter:
                    filter_query["date_of_insertion"] = {"$ne": None}
                    filter_query["date_of_removal"] = None
                else:
                    filter_query["$or"] = [
                        {"date_of_insertion": None},
                        {"date_of_removal": {"$ne": None}}
                    ]
            if params.insertion_date_from or params.insertion_date_to:
                date_filter = {}
                if params.insertion_date_from:
                    date_filter["$gte"] = params.insertion_date_from
                if params.insertion_date_to:
                    date_filter["$lte"] = params.insertion_date_to
                filter_query["date_of_insertion"] = date_filter
            if params.removal_date_from or params.removal_date_to:
                date_filter = {}
                if params.removal_date_from:
                    date_filter["$gte"] = params.removal_date_from
                if params.removal_date_to:
                    date_filter["$lte"] = params.removal_date_to
                filter_query["date_of_removal"] = date_filter
            if params.days_in_use_min is not None or params.days_in_use_max is not None:
                days_filter = {}
                if params.days_in_use_min is not None:
                    days_filter["$gte"] = params.days_in_use_min
                if params.days_in_use_max is not None:
                    days_filter["$lte"] = params.days_in_use_max
                filter_query["days_in_use"] = days_filter

            # Add date range filters
            if params.start_date or params.end_date:
                date_filter = {}
                if params.start_date:
                    date_filter["$gte"] = params.start_date
                if params.end_date:
                    date_filter["$lte"] = params.end_date
                filter_query["created_at"] = date_filter

            logger.info(f"Filter query: {filter_query}")

            # Calculate pagination
            skip = (page - 1) * page_size
            logger.info(f"Calculating count with filter: {filter_query}")
            total_count = await PatientCatheter.count(filter_query)
            total_pages = (total_count + page_size - 1) // page_size
            
            logger.info(f"Total count: {total_count}, Total pages: {total_pages}")

            # Get catheters
            logger.info(f"Finding catheters with skip: {skip}, limit: {page_size}")
            catheters = await PatientCatheter.find(
                filter_query,
                skip=skip,
                limit=page_size,
                sort=[("created_at", -1)],
            )
            
            logger.info(f"Found {len(catheters)} catheters")

            catheter_responses = [
                PatientCatheterResponse.model_validate(catheter) for catheter in catheters
            ]

            result = PaginationResponse[PatientCatheterResponse](
                items=catheter_responses,
                total=total_count,
                page=page,
                limit=page_size,
                pages=total_pages,
                has_next=page < total_pages,
                has_prev=page > 1,
            )

            return result
        except Exception as e:
            logger.error(f"Error in get_catheters: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

    @staticmethod
    async def get_patient_catheters(
        patient_id: str, organisation_id: str
    ) -> List[PatientCatheterResponse]:
        """Get all catheters for a specific patient"""
        catheters = await PatientCatheter.find(
            {
                "patient_id": patient_id,
                "organisation_id": organisation_id,
                "is_active": True,
                "is_deleted": False,
            },
            sort=[("created_at", -1)],
        )

        catheter_responses = [
            PatientCatheterResponse.model_validate(catheter) for catheter in catheters
        ]

        return catheter_responses

    @staticmethod
    async def bulk_create_catheters(
        request_data: List[PatientCatheterCreate],
        organisation_id: str,
        current_user_id: str,
        current_profile_id: str,
    ) -> PatientCatheterBulkCreateResponse:
        """Bulk create patient catheters"""
        created_catheters = []
        errors = []
        created_count = 0
        failed_count = 0

        for i, catheter_data in enumerate(request_data):
            try:
                catheter = await PatientCatheterService.create_catheter(
                    catheter_data, organisation_id, current_user_id, current_profile_id
                )
                created_catheters.append(catheter)
                created_count += 1
            except Exception as e:
                error_msg = f"Failed to create catheter {i+1}: {str(e)}"
                errors.append(error_msg)
                failed_count += 1
                logger.error(error_msg)

        return PatientCatheterBulkCreateResponse(
            created_count=created_count,
            failed_count=failed_count,
            created_catheters=created_catheters,
            errors=errors,
        )

    @staticmethod
    async def get_active_catheters(
        patient_id: str, organisation_id: str
    ) -> List[PatientCatheterResponse]:
        """Get active catheters for a patient (inserted but not removed)"""
        catheters = await PatientCatheter.find(
            {
                "patient_id": patient_id,
                "organisation_id": organisation_id,
                "date_of_insertion": {"$ne": None},
                "date_of_removal": None,
                "is_active": True,
                "is_deleted": False,
            },
            sort=[("date_of_insertion", -1)],
        )

        return [PatientCatheterResponse.model_validate(catheter) for catheter in catheters]
