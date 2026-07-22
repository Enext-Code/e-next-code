import logging
from datetime import date, datetime, timezone
from typing import List

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
    async def _invalidate_cache():
        """Invalidate dashboard cache"""
        try:
            await cache.delete_pattern(f"{DashboardService.CACHE_KEY_PREFIX}:*")
        except Exception as e:
            logger.warning(f"Failed to invalidate dashboard cache: {e}")

    @staticmethod
    async def get_dashboard_stats(organisation_id: str = None) -> DashboardResponse:
        """Get comprehensive dashboard statistics"""
        cache_key = f"{DashboardService.CACHE_KEY_PREFIX}:stats:{organisation_id or 'all'}"
        
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

            # Get inactive patients
            inactive_filter = {**filter_dict, "status": PatientStatus.INACTIVE}
            inactive_patients = await collection.count_documents(inactive_filter)

            # Get orphan patients
            orphan_filter = {**filter_dict, "status": PatientStatus.ORPHANE}
            orphan_patients = await collection.count_documents(orphan_filter)

            # Get total discharged patients
            discharged_filter = {**filter_dict, "status": PatientStatus.DISCHARGE}
            discharged_patients = await collection.count_documents(discharged_filter)

            return PatientCount(
                total_patients=total_patients,
                active_patients=active_patients,
                new_admissions_today=new_admissions_today,
                discharged_today=discharged_today,
                discharged_patients=discharged_patients,
                inactive_patients=inactive_patients,
                orphan_patients=orphan_patients
            )
            
        except Exception as e:
            logger.error(f"Error getting patient count: {e}")
            return PatientCount(
                total_patients=0,
                active_patients=0,
                new_admissions_today=0,
                discharged_today=0,
                discharged_patients=0,
                inactive_patients=0,
                orphan_patients=0
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
        cache_key = f"{DashboardService.CACHE_KEY_PREFIX}:detailed_counts:{organisation_id or 'all'}:{start_date or 'all'}:{end_date or 'all'}"
        
        async def fetch_detailed_counts():
            try:
                # Build base filter
                base_filter = {"is_active": True, "is_deleted": False}
                if organisation_id and organisation_id != "None":
                    base_filter["organisation_id"] = organisation_id

                # Get collection for direct count operations
                collection = Patient.get_collection()

                # Get total patients for the organisation (without date filter)
                total_patients_all = await collection.count_documents(base_filter)

                # Get active patients - with date filter logic
                if start_date or end_date:
                    # Calculate patients who were active during the date range
                    # Logic: Patients admitted before/during the period AND not discharged before start of period
                    
                    # Build filter for patients who were active during the time period
                    active_date_filter = {**base_filter}
                    
                    # Patients must be admitted before or during the end date
                    if end_date:
                        end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
                        active_date_filter["admission_date"] = {"$lte": end_datetime}
                    
                    # For patients discharged, they must be discharged after the start date (or still active)
                    if start_date:
                        start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                        
                        # Use aggregation pipeline to handle complex logic
                        pipeline = [
                            {"$match": active_date_filter},
                            {"$addFields": {
                                "was_active_during_period": {
                                    "$and": [
                                        # Patient was admitted before or during end date
                                        {"$cond": [
                                            {"$ifNull": ["$admission_date", False]},
                                            True,
                                            False
                                        ]},
                                        # Either patient is still active OR was discharged after start date
                                        {"$or": [
                                            {"$eq": ["$status", "admission"]},  # Still active
                                            {"$and": [
                                                {"$eq": ["$status", "discharge"]},
                                                {"$gte": ["$status_change_datetime", start_datetime]}  # Discharged after start
                                            ]},
                                            {"$and": [
                                                {"$eq": ["$status", "inactive"]},
                                                {"$gte": ["$status_change_datetime", start_datetime]}  # Became inactive after start
                                            ]},
                                            {"$and": [
                                                {"$eq": ["$status", "orphane"]},
                                                {"$gte": ["$status_change_datetime", start_datetime]}  # Became orphan after start
                                            ]}
                                        ]}
                                    ]
                                }
                            }},
                            {"$match": {"was_active_during_period": True}},
                            {"$count": "active_patients_count"}
                        ]
                        
                        result = await collection.aggregate(pipeline).to_list(1)
                        active_patients = result[0]["active_patients_count"] if result else 0
                    else:
                        # If only end_date is provided, count patients admitted before or during end date
                        active_patients = await collection.count_documents(active_date_filter)
                else:
                    # If no date filter, show currently active patients
                    active_filter = {**base_filter, "status": PatientStatus.ADMISSION}
                    active_patients = await collection.count_documents(active_filter)

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

                # Get inactive patients - with date filter if provided
                if start_date or end_date:
                    # Get patients who became inactive within the date range using status_change_datetime field
                    inactive_date_filter = {
                        **base_filter,
                        "status": PatientStatus.INACTIVE
                    }
                    if start_date:
                        start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                        inactive_date_filter["status_change_datetime"] = {"$gte": start_datetime}
                    if end_date:
                        end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
                        if "status_change_datetime" in inactive_date_filter:
                            inactive_date_filter["status_change_datetime"]["$lte"] = end_datetime
                        else:
                            inactive_date_filter["status_change_datetime"] = {"$lte": end_datetime}
                    inactive_patients = await collection.count_documents(inactive_date_filter)
                else:
                    # If no date filter, get total inactive patients
                    inactive_filter = {**base_filter, "status": PatientStatus.INACTIVE}
                    inactive_patients = await collection.count_documents(inactive_filter)

                # Get orphan patients - with date filter if provided
                if start_date or end_date:
                    # Get patients who became orphan within the date range using status_change_datetime field
                    orphan_date_filter = {
                        **base_filter,
                        "status": PatientStatus.ORPHANE
                    }
                    if start_date:
                        start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                        orphan_date_filter["status_change_datetime"] = {"$gte": start_datetime}
                    if end_date:
                        end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
                        if "status_change_datetime" in orphan_date_filter:
                            orphan_date_filter["status_change_datetime"]["$lte"] = end_datetime
                        else:
                            orphan_date_filter["status_change_datetime"] = {"$lte": end_datetime}
                    orphan_patients = await collection.count_documents(orphan_date_filter)
                else:
                    # If no date filter, get total orphan patients
                    orphan_filter = {**base_filter, "status": PatientStatus.ORPHANE}
                    orphan_patients = await collection.count_documents(orphan_filter)

                # Calculate total patients based on date filter logic
                if start_date or end_date:
                    # Total patients = active patients + discharged in range + inactive in range + orphan in range
                    total_patients = active_patients + discharged_patients + inactive_patients + orphan_patients
                else:
                    total_patients = total_patients_all

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
                    inactive_patients=inactive_patients,
                    orphan_patients=orphan_patients,
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
