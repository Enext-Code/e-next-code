import logging
from datetime import date, datetime, timezone
from typing import List, Optional

from bson import ObjectId

from app.accounts.models import UserProfile
from app.base.models import InternalServerError
from app.core import cache
from app.organisations.models import OrganisationICU, OrganisationICUBed, OrganisationMember
from app.patients.models import Patient
from app.patients.enums import PatientStatus

from ..schemas import (
    DashboardResponse,
    DashboardStats,
    DateFilterParams,
    DetailedCounts,
    DetailedCountsResponse,
    DropdownData,
    DropdownResponse,
    PatientCount,
    PatientDropdown,
    RemoteCenterDropdown,
    RemoteCenterStats,
    StaffCount,
    StaffDropdown,
)

logger = logging.getLogger(__name__)


class DashboardService:
    """Dashboard service for statistics and data"""

    CACHE_KEY_PREFIX = "dashboard"
    CACHE_TIMEOUT = 300  # 5 minutes

    @staticmethod
    async def _count_patients_by_status(
        collection,
        base_filter: dict,
        status: PatientStatus,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> int:
        """Count patients by status, optionally filtered by status_change_datetime."""
        status_filter = {**base_filter, "status": status}
        if start_date or end_date:
            if start_date:
                start_datetime = datetime.combine(start_date, datetime.min.time()).replace(
                    tzinfo=timezone.utc
                )
                status_filter["status_change_datetime"] = {"$gte": start_datetime}
            if end_date:
                end_datetime = datetime.combine(end_date, datetime.max.time()).replace(
                    tzinfo=timezone.utc
                )
                if "status_change_datetime" in status_filter:
                    status_filter["status_change_datetime"]["$lte"] = end_datetime
                else:
                    status_filter["status_change_datetime"] = {"$lte": end_datetime}
        return await collection.count_documents(status_filter)

    @staticmethod
    async def _count_unique_patients_for_period(
        collection,
        base_filter: dict,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> int:
        """
        Unique patients relevant to a date range (never sum of status cards).

        Includes a patient once if any of:
        - admitted in range
        - status changed in range (step down / discharge / lama / etc.)
        - present during range (admitted on/before end, and still admission
          or left on/after start)
        """
        if not start_date and not end_date:
            return await collection.count_documents(base_filter)

        start_datetime = (
            datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            if start_date
            else None
        )
        end_datetime = (
            datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
            if end_date
            else None
        )

        or_clauses: list[dict] = []

        admission_in_range: dict = {}
        if start_datetime:
            admission_in_range["$gte"] = start_datetime
        if end_datetime:
            admission_in_range["$lte"] = end_datetime
        if admission_in_range:
            or_clauses.append({"admission_date": admission_in_range})

        status_change_in_range: dict = {}
        if start_datetime:
            status_change_in_range["$gte"] = start_datetime
        if end_datetime:
            status_change_in_range["$lte"] = end_datetime
        if status_change_in_range:
            or_clauses.append({"status_change_datetime": status_change_in_range})

        # Present during the period (still admitted, or left after period start)
        present_during: dict = {}
        if end_datetime:
            present_during["admission_date"] = {"$lte": end_datetime}
        present_or: list[dict] = [{"status": PatientStatus.ADMISSION}]
        if start_datetime:
            present_or.append({"status_change_datetime": {"$gte": start_datetime}})
        present_during["$or"] = present_or
        or_clauses.append(present_during)

        return await collection.count_documents({**base_filter, "$or": or_clauses})

    @staticmethod
    async def _invalidate_cache():
        """Invalidate dashboard cache"""
        try:
            await cache.delete_pattern(f"{DashboardService.CACHE_KEY_PREFIX}:*")
        except Exception as e:
            logger.warning(f"Failed to invalidate dashboard cache: {e}")

    @staticmethod
    async def get_dashboard_stats(organisation_id: str = None) -> DashboardResponse:
        """Get comprehensive dashboard statistics"""
        cache_key = f"{DashboardService.CACHE_KEY_PREFIX}:stats_v2:{organisation_id or 'all'}"
        
        async def fetch_stats():
            try:
                # Get staff counts
                staff_count = await DashboardService._get_staff_count(organisation_id)
                
                # Get patient counts
                patient_count = await DashboardService._get_patient_count(organisation_id)
                
                # Get remote center stats
                remote_centers = await DashboardService._get_remote_center_stats(organisation_id)
                
                stats = DashboardStats(
                    staff_count=staff_count,
                    patient_count=patient_count,
                    remote_centers=remote_centers,
                    last_updated=datetime.now(timezone.utc)
                )
                
                return DashboardResponse(
                    stats=stats,
                    generated_at=datetime.now(timezone.utc)
                )
                
            except Exception as e:
                logger.error(f"Error fetching dashboard stats: {e}")
                raise InternalServerError(
                    message="Failed to fetch dashboard statistics",
                    error_code="DASHBOARD_STATS_ERROR"
                )

        # Try to get from cache first
        try:
            cached_data = await cache.get(cache_key)
            if cached_data:
                return DashboardResponse.model_validate(cached_data)
        except Exception as e:
            logger.warning(f"Failed to get dashboard stats from cache: {e}")

        # Fetch fresh data
        result = await fetch_stats()
        
        # Cache the result
        try:
            await cache.set(
                cache_key, 
                result.model_dump(), 
                timeout=DashboardService.CACHE_TIMEOUT
            )
        except Exception as e:
            logger.warning(f"Failed to cache dashboard stats: {e}")

        return result

    @staticmethod
    async def _get_staff_count(organisation_id: str = None) -> StaffCount:
        """Get staff count by type"""
        try:
            # Build filter for organisation members
            member_filter = {"is_active": True, "is_deleted": False}
            if organisation_id and organisation_id != "None":
                member_filter["organisation_id"] = organisation_id

            # Get all active organisation members
            members = await OrganisationMember.find(member_filter)
            member_user_ids = [member.user_id for member in members]

            if not member_user_ids:
                return StaffCount(total_doctors=0, total_nurses=0, total_staff=0)

            # Get user profiles for these members
            profile_filter = {
                "user_id": {"$in": member_user_ids},
                "is_active": True,
                "is_deleted": False
            }
            
            profiles = await UserProfile.find(profile_filter)
            
            # Count by user type
            doctors = sum(1 for profile in profiles if profile.user_type == "doctor")
            nurses = sum(1 for profile in profiles if profile.user_type == "nurse")
            total_staff = len(profiles)

            return StaffCount(
                total_doctors=doctors,
                total_nurses=nurses,
                total_staff=total_staff
            )
            
        except Exception as e:
            logger.error(f"Error getting staff count: {e}")
            return StaffCount(total_doctors=0, total_nurses=0, total_staff=0)

    @staticmethod
    async def _get_patient_count(organisation_id: str = None) -> PatientCount:
        """Get patient count by status"""
        try:
            # Build filter
            filter_dict = {"is_active": True, "is_deleted": False}
            if organisation_id and organisation_id != "None":
                filter_dict["organisation_id"] = organisation_id

            # Get collection for direct count operations
            collection = Patient.get_collection()

            # Get total patients
            total_patients = await collection.count_documents(filter_dict)

            # Get active patients (admitted)
            active_filter = {**filter_dict, "status": PatientStatus.ADMISSION}
            active_patients = await collection.count_documents(active_filter)

            # Get new admissions today
            today = date.today()
            today_str = today.strftime("%Y-%m-%d")
            new_admissions_filter = {
                **filter_dict,
                "admission_date": today_str
            }
            new_admissions_today = await collection.count_documents(new_admissions_filter)

            # Get discharged today
            discharged_filter = {
                **filter_dict,
                "status": PatientStatus.DISCHARGE,
                "updated_at": {
                    "$gte": datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc),
                    "$lt": datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
                }
            }
            discharged_today = await collection.count_documents(discharged_filter)

            lama_patients = await DashboardService._count_patients_by_status(
                collection, filter_dict, PatientStatus.LAMA
            )
            step_down_patients = await DashboardService._count_patients_by_status(
                collection, filter_dict, PatientStatus.INACTIVE
            )
            referred_patients = await DashboardService._count_patients_by_status(
                collection, filter_dict, PatientStatus.REFERRED
            )
            deceased_patients = await DashboardService._count_patients_by_status(
                collection, filter_dict, PatientStatus.DECEASED
            )

            # Get total discharged patients
            discharged_filter = {**filter_dict, "status": PatientStatus.DISCHARGE}
            discharged_patients = await collection.count_documents(discharged_filter)

            return PatientCount(
                total_patients=total_patients,
                active_patients=active_patients,
                new_admissions_today=new_admissions_today,
                discharged_today=discharged_today,
                discharged_patients=discharged_patients,
                lama_patients=lama_patients,
                step_down_patients=step_down_patients,
                referred_patients=referred_patients,
                deceased_patients=deceased_patients,
            )
            
        except Exception as e:
            logger.error(f"Error getting patient count: {e}")
            return PatientCount(
                total_patients=0,
                active_patients=0,
                new_admissions_today=0,
                discharged_today=0,
                discharged_patients=0,
                lama_patients=0,
                step_down_patients=0,
                referred_patients=0,
                deceased_patients=0,
            )

    @staticmethod
    async def _get_remote_center_stats(organisation_id: str = None) -> List[RemoteCenterStats]:
        """Get remote center statistics"""
        try:
            # Build filter for ICUs
            icu_filter = {"is_active": True, "is_deleted": False}
            if organisation_id and organisation_id != "None":
                icu_filter["organisation_id"] = organisation_id

            # Get all ICUs (remote centers)
            icus = await OrganisationICU.find(icu_filter)
            
            stats_list = []
            
            for icu in icus:
                # Get beds for this ICU
                bed_filter = {
                    "organisation_icu_id": icu.id,
                    "is_active": True,
                    "is_deleted": False
                }
                beds = await OrganisationICUBed.find(bed_filter)
                total_beds = len(beds)
                
                # Get occupied beds (patients in this ICU)
                patient_filter = {
                    "organisation_icu_id": icu.id,
                    "is_active": True,
                    "is_deleted": False
                }
                patients = await Patient.find(patient_filter)
                total_patients = len(patients)
                
                # Get active patients
                active_patients = sum(1 for patient in patients if patient.status == PatientStatus.ADMISSION)
                occupied_beds = active_patients
                
                # Get staff for this organisation
                member_filter = {
                    "organisation_id": icu.organisation_id,
                    "is_active": True,
                    "is_deleted": False
                }
                members = await OrganisationMember.find(member_filter)
                member_user_ids = [member.user_id for member in members]
                
                if member_user_ids:
                    profile_filter = {
                        "user_id": {"$in": member_user_ids},
                        "is_active": True,
                        "is_deleted": False
                    }
                    profiles = await UserProfile.find(profile_filter)
                    
                    doctors = sum(1 for profile in profiles if profile.user_type == "doctor")
                    nurses = sum(1 for profile in profiles if profile.user_type == "nurse")
                    total_staff = len(profiles)
                else:
                    doctors = nurses = total_staff = 0
                
                stats = RemoteCenterStats(
                    center_id=icu.id,
                    center_name=icu.name,
                    total_patients=total_patients,
                    active_patients=active_patients,
                    total_staff=total_staff,
                    doctors=doctors,
                    nurses=nurses,
                    occupied_beds=occupied_beds,
                    total_beds=total_beds
                )
                
                stats_list.append(stats)
            
            return stats_list
            
        except Exception as e:
            logger.error(f"Error getting remote center stats: {e}")
            return []

    @staticmethod
    async def get_dropdown_data(organisation_id: str = None) -> DropdownResponse:
        """Get dropdown data for dashboard"""
        cache_key = f"{DashboardService.CACHE_KEY_PREFIX}:dropdown:{organisation_id or 'all'}"
        
        async def fetch_dropdown_data():
            try:
                # Get remote centers
                remote_centers = await DashboardService._get_remote_centers_dropdown(organisation_id)
                
                # Get staff
                staff = await DashboardService._get_staff_dropdown(organisation_id)
                
                # Get patients
                patients = await DashboardService._get_patients_dropdown(organisation_id)
                
                data = DropdownData(
                    remote_centers=remote_centers,
                    staff=staff,
                    patients=patients
                )
                
                return DropdownResponse(
                    data=data,
                    generated_at=datetime.now(timezone.utc)
                )
                
            except Exception as e:
                logger.error(f"Error fetching dropdown data: {e}")
                raise InternalServerError(
                    message="Failed to fetch dropdown data",
                    error_code="DROPDOWN_DATA_ERROR"
                )

        # Try to get from cache first
        try:
            cached_data = await cache.get(cache_key)
            if cached_data:
                return DropdownResponse.model_validate(cached_data)
        except Exception as e:
            logger.warning(f"Failed to get dropdown data from cache: {e}")

        # Fetch fresh data
        result = await fetch_dropdown_data()
        
        # Cache the result
        try:
            await cache.set(
                cache_key, 
                result.model_dump(), 
                timeout=DashboardService.CACHE_TIMEOUT
            )
        except Exception as e:
            logger.warning(f"Failed to cache dropdown data: {e}")

        return result

    @staticmethod
    async def _get_remote_centers_dropdown(organisation_id: str = None) -> List[RemoteCenterDropdown]:
        """Get remote centers for dropdown"""
        try:
            icu_filter = {"is_active": True, "is_deleted": False}
            if organisation_id and organisation_id != "None":
                icu_filter["organisation_id"] = organisation_id

            icus = await OrganisationICU.find(icu_filter)
            
            dropdown_items = []
            for icu in icus:
                # Get patient count for this ICU
                patient_count = await Patient.count({
                    "organisation_icu_id": icu.id,
                    "is_active": True,
                    "is_deleted": False
                })
                
                # Get staff count for this organisation
                member_filter = {
                    "organisation_id": icu.organisation_id,
                    "is_active": True,
                    "is_deleted": False
                }
                staff_count = await OrganisationMember.count(member_filter)
                
                dropdown_items.append(RemoteCenterDropdown(
                    center_id=icu.id,
                    center_name=icu.name,
                    organisation_id=icu.organisation_id,
                    patient_count=patient_count,
                    staff_count=staff_count
                ))
            
            return dropdown_items
            
        except Exception as e:
            logger.error(f"Error getting remote centers dropdown: {e}")
            return []

    @staticmethod
    async def _get_staff_dropdown(organisation_id: str = None) -> List[StaffDropdown]:
        """Get staff for dropdown"""
        try:
            # Get organisation members
            member_filter = {"is_active": True, "is_deleted": False}
            if organisation_id and organisation_id != "None":
                member_filter["organisation_id"] = organisation_id

            members = await OrganisationMember.find(member_filter)
            member_user_ids = [member.user_id for member in members]

            if not member_user_ids:
                return []

            # Get user profiles
            profile_filter = {
                "user_id": {"$in": member_user_ids},
                "is_active": True,
                "is_deleted": False
            }
            
            profiles = await UserProfile.find(profile_filter)
            
            dropdown_items = []
            for profile in profiles:
                # Find the organisation_id for this user
                user_member = next((m for m in members if m.user_id == profile.user_id), None)
                org_id = user_member.organisation_id if user_member else None
                
                dropdown_items.append(StaffDropdown(
                    user_id=profile.user_id,
                    profile_id=profile.id,
                    name=profile.full_name,
                    user_type=profile.user_type,
                    organisation_id=org_id or ""
                ))
            
            return dropdown_items
            
        except Exception as e:
            logger.error(f"Error getting staff dropdown: {e}")
            return []

    @staticmethod
    async def _get_patients_dropdown(organisation_id: str = None) -> List[PatientDropdown]:
        """Get patients for dropdown"""
        try:
            filter_dict = {"is_active": True, "is_deleted": False}
            if organisation_id and organisation_id != "None":
                filter_dict["organisation_id"] = organisation_id

            patients = await Patient.find(filter_dict, limit=100, sort=[("created_at", -1)])
            
            dropdown_items = []
            for patient in patients:
                # Get ICU name
                icu = await OrganisationICU.find_one({
                    "_id": ObjectId(patient.organisation_icu_id),
                    "is_active": True,
                    "is_deleted": False
                })
                centre_name = icu.name if icu else "Unknown"
                
                dropdown_items.append(PatientDropdown(
                    patient_id=patient.id,
                    unique_id=patient.unique_id,
                    name=patient.full_name,
                    age=patient.age,
                    gender=patient.gender.value,
                    status=patient.status.value if patient.status else "unknown",
                    admission_date=patient.admission_date,
                    centre_name=centre_name
                ))
            
            return dropdown_items
            
        except Exception as e:
            logger.error(f"Error getting patients dropdown: {e}")
            return []

    @staticmethod
    async def get_detailed_counts(
        organisation_id: str = None,
        start_date: date = None,
        end_date: date = None
    ) -> DetailedCountsResponse:
        """Get detailed counts with date filtering"""
        # v5: Active = status admission only; Total = date-wise unique
        cache_key = f"{DashboardService.CACHE_KEY_PREFIX}:detailed_counts_v5:{organisation_id or 'all'}:{start_date or 'all'}:{end_date or 'all'}"
        
        async def fetch_detailed_counts():
            try:
                # Build base filter
                base_filter = {"is_active": True, "is_deleted": False}
                if organisation_id and organisation_id != "None":
                    base_filter["organisation_id"] = organisation_id

                # Get collection for direct count operations
                collection = Patient.get_collection()

                # Active = currently admitted only (never Step Down / Lama / Discharge / etc.)
                active_patients = await collection.count_documents(
                    {**base_filter, "status": PatientStatus.ADMISSION}
                )

                # Get discharged patients - with date filter if provided
                if start_date or end_date:
                    # Get patients discharged within the date range using status_change_datetime field
                    discharged_date_filter = {
                        **base_filter,
                        "status": PatientStatus.DISCHARGE
                    }
                    if start_date:
                        start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                        discharged_date_filter["status_change_datetime"] = {"$gte": start_datetime}
                    if end_date:
                        end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
                        if "status_change_datetime" in discharged_date_filter:
                            discharged_date_filter["status_change_datetime"]["$lte"] = end_datetime
                        else:
                            discharged_date_filter["status_change_datetime"] = {"$lte": end_datetime}
                    discharged_patients = await collection.count_documents(discharged_date_filter)
                else:
                    # If no date filter, get total discharged patients
                    discharged_filter = {**base_filter, "status": PatientStatus.DISCHARGE}
                    discharged_patients = await collection.count_documents(discharged_filter)

                lama_patients = await DashboardService._count_patients_by_status(
                    collection, base_filter, PatientStatus.LAMA, start_date, end_date
                )
                step_down_patients = await DashboardService._count_patients_by_status(
                    collection, base_filter, PatientStatus.INACTIVE, start_date, end_date
                )
                referred_patients = await DashboardService._count_patients_by_status(
                    collection, base_filter, PatientStatus.REFERRED, start_date, end_date
                )
                deceased_patients = await DashboardService._count_patients_by_status(
                    collection, base_filter, PatientStatus.DECEASED, start_date, end_date
                )

                # Total = unique patients for the period (date-wise, not sum of cards)
                total_patients = await DashboardService._count_unique_patients_for_period(
                    collection, base_filter, start_date, end_date
                )

                # Get new admissions count
                if start_date or end_date:
                    # Get patients admitted within the date range
                    # admission_date is stored as datetime in MongoDB, so convert dates to datetime
                    admission_date_filter = {**base_filter}
                    if start_date:
                        start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                        admission_date_filter["admission_date"] = {"$gte": start_datetime}
                    if end_date:
                        end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
                        if "admission_date" in admission_date_filter:
                            admission_date_filter["admission_date"]["$lte"] = end_datetime
                        else:
                            admission_date_filter["admission_date"] = {"$lte": end_datetime}
                    new_admissions = await collection.count_documents(admission_date_filter)
                else:
                    # If no date range, get today's admissions
                    today = date.today()
                    today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
                    today_end = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
                    today_filter = {
                        **base_filter,
                        "admission_date": {"$gte": today_start, "$lte": today_end}
                    }
                    new_admissions = await collection.count_documents(today_filter)

                # Get staff counts
                staff_count = await DashboardService._get_staff_count(organisation_id)

                # Get remote centers count
                icu_filter = {"is_active": True, "is_deleted": False}
                if organisation_id and organisation_id != "None":
                    icu_filter["organisation_id"] = organisation_id
                icu_collection = OrganisationICU.get_collection()
                remote_centers_count = await icu_collection.count_documents(icu_filter)

                # Get bed statistics
                bed_filter = {"is_active": True, "is_deleted": False}
                if organisation_id and organisation_id != "None":
                    # Get ICUs for this organisation first
                    icus = await OrganisationICU.find(icu_filter)
                    icu_ids = [icu.id for icu in icus]
                    if icu_ids:
                        bed_filter["organisation_icu_id"] = {"$in": icu_ids}
                    else:
                        bed_filter["organisation_icu_id"] = {"$in": []}  # No ICUs, so no beds

                bed_collection = OrganisationICUBed.get_collection()
                total_beds = await bed_collection.count_documents(bed_filter)
                occupied_beds = active_patients  # Active patients = occupied beds

                # Calculate bed occupancy rate
                bed_occupancy_rate = (occupied_beds / total_beds * 100) if total_beds > 0 else 0.0

                # Create date range string
                date_range = None
                if start_date and end_date:
                    date_range = f"{start_date} to {end_date}"
                elif start_date:
                    date_range = f"From {start_date}"
                elif end_date:
                    date_range = f"Until {end_date}"

                counts = DetailedCounts(
                    total_patients=total_patients,
                    active_patients=active_patients,
                    discharged_patients=discharged_patients,
                    lama_patients=lama_patients,
                    step_down_patients=step_down_patients,
                    referred_patients=referred_patients,
                    deceased_patients=deceased_patients,
                    new_admissions=new_admissions,
                    total_doctors=staff_count.total_doctors,
                    total_nurses=staff_count.total_nurses,
                    total_staff=staff_count.total_staff,
                    remote_centers_count=remote_centers_count,
                    occupied_beds=occupied_beds,
                    total_beds=total_beds,
                    bed_occupancy_rate=round(bed_occupancy_rate, 2),
                    date_range=date_range
                )

                return DetailedCountsResponse(
                    counts=counts,
                    generated_at=datetime.now(timezone.utc)
                )

            except Exception as e:
                logger.error(f"Error fetching detailed counts: {e}")
                raise InternalServerError(
                    message="Failed to fetch detailed counts",
                    error_code="DETAILED_COUNTS_ERROR"
                )

        # Try to get from cache first
        try:
            cached_data = await cache.get(cache_key)
            if cached_data:
                return DetailedCountsResponse.model_validate(cached_data)
        except Exception as e:
            logger.warning(f"Failed to get detailed counts from cache: {e}")

        # Fetch fresh data
        result = await fetch_detailed_counts()
        
        # Cache the result
        try:
            await cache.set(
                cache_key, 
                result.model_dump(), 
                timeout=DashboardService.CACHE_TIMEOUT
            )
        except Exception as e:
            logger.warning(f"Failed to cache detailed counts: {e}")

        return result
