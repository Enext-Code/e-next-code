from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from app.accounts.models import User
from app.base.models import NotFoundError
from app.accounts.enums import UserType
from app.utils import decrypt_user_type

from ..models import OPDPatient
from ..schemas import OPDPatientCreate, OPDPatientResponse, OPDPatientUpdate


class OPDPatientService:
    """OPD Patient service for CRUD operations"""

    @staticmethod
    async def create_opd_patient(
        opd_patient_data: OPDPatientCreate,
        organisation_id: str,
        current_user: dict,
    ) -> OPDPatientResponse:
        """
        Create a new OPD patient record
        
        Args:
            opd_patient_data: OPD patient creation data
            organisation_id: Organisation ID
            current_user: Current user dict from JWT token
            
        Returns:
            OPDPatientResponse: Created OPD patient
        """
        # Determine effective organisation based on user type:
        # - Admin/Superadmin: can create in any organisation (organisation_id comes from request)
        # - Doctor/Nurse: can create ONLY in their own organisation from token (current_user["oid"])
        encrypted_user_type = current_user.get("ut")
        user_type = UserType(decrypt_user_type(encrypted_user_type)) if encrypted_user_type else None

        if user_type and UserType.requires_organisation_id(user_type):
            # Admin / Superadmin → use organisation_id passed in (already validated upstream)
            effective_organisation_id = organisation_id
        else:
            # Doctor / Nurse (or fallback) → force organisation from token
            effective_organisation_id = str(current_user.get("oid"))

        # Verify consultant user exists (if provided)
        if opd_patient_data.consultant_user_id:
            consultant_user = await User.find_one({"_id": ObjectId(opd_patient_data.consultant_user_id)})
            if not consultant_user:
                raise NotFoundError(f"Consultant user with ID {opd_patient_data.consultant_user_id} not found")

        # Create OPD patient
        opd_patient = await OPDPatient.create(
            **opd_patient_data.model_dump(),
            organisation_id=effective_organisation_id,
            created_by=str(current_user["sub"]),
            updated_by=str(current_user["sub"]),
            created_by_profile=str(current_user["pid"]),
            updated_by_profile=str(current_user["pid"]),
        )

        return OPDPatientResponse(**opd_patient.model_dump())

    @staticmethod
    async def get_opd_patient(
        opd_patient_id: str,
        organisation_id: str,
        current_user: dict,
    ) -> OPDPatientResponse:
        """
        Get OPD patient by ID
        
        Args:
            opd_patient_id: OPD patient ID
            organisation_id: Organisation ID
            
        Returns:
            OPDPatientResponse: OPD patient details
        """
        # Determine effective organisation based on user type (same logic as create):
        # - Admin/Superadmin: can read from any organisation (organisation_id comes from request)
        # - Doctor/Nurse: can read ONLY from their own organisation from token (current_user["oid"])
        encrypted_user_type = current_user.get("ut")
        user_type = UserType(decrypt_user_type(encrypted_user_type)) if encrypted_user_type else None

        if user_type and UserType.requires_organisation_id(user_type):
            effective_organisation_id = organisation_id
        else:
            effective_organisation_id = str(current_user.get("oid"))

        # Fetch from database
        opd_patient = await OPDPatient.find_one({"_id": ObjectId(opd_patient_id)})
        if not opd_patient:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Verify organisation
        if opd_patient.organisation_id != effective_organisation_id:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Check if deleted
        if opd_patient.is_deleted:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        return OPDPatientResponse(**opd_patient.model_dump())

    @staticmethod
    async def get_all_opd_patients(
        organisation_id: str,
        current_user: dict,
        page: int = 1,
        limit: int = 100,
        doc_number: Optional[str] = None,
        patient_name: Optional[str] = None,
        uhid: Optional[str] = None,
        consultant_user_id: Optional[str] = None,
        episode_no: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> dict:
        """
        Get all OPD patients with filters and pagination
        
        Args:
            organisation_id: Organisation ID
            page: Page number (starts from 1)
            limit: Maximum number of records to return per page
            doc_number: Filter by document number
            patient_name: Filter by patient name (partial match)
            uhid: Filter by UHID
            consultant_user_id: Filter by consultant user ID
            episode_no: Filter by episode number
            from_date: Filter from date/time (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
            to_date: Filter to date/time (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
            
        Returns:
            dict: Paginated response with items, total, page, limit, pages, has_next, has_prev
        """
        # Determine effective organisation based on user type (same logic as create):
        encrypted_user_type = current_user.get("ut")
        user_type = UserType(decrypt_user_type(encrypted_user_type)) if encrypted_user_type else None

        if user_type and UserType.requires_organisation_id(user_type):
            effective_organisation_id = organisation_id
        else:
            effective_organisation_id = str(current_user.get("oid"))

        # Build query
        query = {
            "organisation_id": effective_organisation_id,
            "is_deleted": False,
        }

        if doc_number:
            query["doc_number"] = doc_number

        if patient_name:
            query["patient_name"] = {"$regex": patient_name, "$options": "i"}

        if uhid:
            query["uhid"] = uhid

        if consultant_user_id:
            query["consultant_user_id"] = consultant_user_id

        if episode_no:
            query["episode_no"] = episode_no

        if from_date or to_date:
            date_query = {}
            if from_date:
                # Convert string date to datetime (start of day if only date provided)
                try:
                    if "T" in from_date:
                        # Handle ISO format with or without timezone
                        date_str = from_date.replace("Z", "+00:00") if from_date.endswith("Z") else from_date
                        from_dt = datetime.fromisoformat(date_str)
                    else:
                        # Date only - set to start of day
                        from_dt = datetime.fromisoformat(f"{from_date}T00:00:00")
                    date_query["$gte"] = from_dt
                except (ValueError, AttributeError) as e:
                    # Fallback: try parsing as date string YYYY-MM-DD
                    try:
                        from_dt = datetime.strptime(from_date, "%Y-%m-%d")
                        from_dt = from_dt.replace(hour=0, minute=0, second=0, microsecond=0)
                        date_query["$gte"] = from_dt
                    except ValueError:
                        raise ValueError(f"Invalid date format for from_date: {from_date}. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS")
            if to_date:
                # Convert string date to datetime (end of day if only date provided)
                try:
                    if "T" in to_date:
                        # Handle ISO format with or without timezone
                        date_str = to_date.replace("Z", "+00:00") if to_date.endswith("Z") else to_date
                        to_dt = datetime.fromisoformat(date_str)
                    else:
                        # Date only - set to end of day
                        to_dt = datetime.fromisoformat(f"{to_date}T23:59:59")
                        to_dt = to_dt.replace(microsecond=999999)
                    date_query["$lte"] = to_dt
                except (ValueError, AttributeError) as e:
                    # Fallback: try parsing as date string YYYY-MM-DD
                    try:
                        to_dt = datetime.strptime(to_date, "%Y-%m-%d")
                        to_dt = to_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
                        date_query["$lte"] = to_dt
                    except ValueError:
                        raise ValueError(f"Invalid date format for to_date: {to_date}. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS")
            if date_query:
                query["visit_date"] = date_query

        # Calculate skip
        skip = (page - 1) * limit

        # Get total count
        total = await OPDPatient.get_collection().count_documents(query)

        # Get paginated results using Motor cursor directly
        collection = OPDPatient.get_collection()
        cursor = collection.find(query).sort("visit_date", -1).skip(skip).limit(limit)
        
        documents = []
        async for doc in cursor:
            if "_id" in doc:
                doc["id"] = str(doc.pop("_id"))
            documents.append(OPDPatient(**doc))

        # Convert to response schema
        items = [OPDPatientResponse(**opd_patient.model_dump()) for opd_patient in documents]

        # Calculate pagination metadata
        pages = (total + limit - 1) // limit if total > 0 else 1
        has_next = page < pages
        has_prev = page > 1

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }

    @staticmethod
    async def update_opd_patient(
        opd_patient_id: str,
        opd_patient_data: OPDPatientUpdate,
        organisation_id: str,
        current_user: dict,
    ) -> OPDPatientResponse:
        """
        Update OPD patient
        
        Args:
            opd_patient_id: OPD patient ID
            opd_patient_data: OPD patient update data
            organisation_id: Organisation ID
            current_user: Current user dict from JWT token
            
        Returns:
            OPDPatientResponse: Updated OPD patient
        """
        # Fetch existing OPD patient
        opd_patient = await OPDPatient.find_one({"_id": ObjectId(opd_patient_id)})
        if not opd_patient:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Verify organisation
        if opd_patient.organisation_id != organisation_id:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Check if deleted
        if opd_patient.is_deleted:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # If consultant_user_id is being updated, verify the new consultant exists
        if opd_patient_data.consultant_user_id:
            consultant_user = await User.find_one({"_id": ObjectId(opd_patient_data.consultant_user_id)})
            if not consultant_user:
                raise NotFoundError(f"Consultant user with ID {opd_patient_data.consultant_user_id} not found")

        # Update fields
        update_data = opd_patient_data.model_dump(exclude_unset=True)
        if update_data:
            update_data["updated_by"] = str(current_user["sub"])
            update_data["updated_by_profile"] = str(current_user["pid"])
            for field, value in update_data.items():
                setattr(opd_patient, field, value)
            
            await opd_patient.save()

        return OPDPatientResponse(**opd_patient.model_dump())

    @staticmethod
    async def delete_opd_patient(
        opd_patient_id: str,
        organisation_id: str,
        current_user: dict,
    ) -> dict:
        """
        Soft delete OPD patient
        
        Args:
            opd_patient_id: OPD patient ID
            organisation_id: Organisation ID
            current_user: Current user dict from JWT token
            
        Returns:
            dict: Success message
        """
        # Fetch existing OPD patient
        opd_patient = await OPDPatient.find_one({"_id": ObjectId(opd_patient_id)})
        if not opd_patient:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Verify organisation
        if opd_patient.organisation_id != organisation_id:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Check if already deleted
        if opd_patient.is_deleted:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Soft delete
        opd_patient.is_deleted = True
        opd_patient.updated_by = str(current_user["sub"])
        opd_patient.updated_by_profile = str(current_user["pid"])
        await opd_patient.save()

        return {"message": "OPD patient deleted successfully"}
