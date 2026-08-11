import logging
import random
from datetime import timedelta, UTC, datetime, timezone

from bson import ObjectId

from app.accounts.enums import UserType

logger = logging.getLogger(__name__)
from app.accounts.models import User, UserProfile
from app.base.models import NotFoundError
from app.masters.models import ICDCode
from app.masters.schemas import ICDCodeResponse
from app.organisations.models import OrganisationICU, OrganisationICUBed
from app.organisations.services.organisation_icu_bed_service import OrganisationICUBedService
from app.utils import decrypt_user_type

from ..enums import PatientStatus
from ..filters import PatientFilterParams
from ..models import Patient
from ..schemas import PatientResponse

# IST timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))


class PatientService:
    """Patient service"""

    @staticmethod
    def _convert_datetime_to_ist_date(dt):
        """
        Convert UTC datetime to IST date.
        MongoDB stores dates as datetime (e.g., 2025-11-29T18:30:00Z UTC).
        This converts to IST first, then extracts the date.
        """
        if dt is None:
            return None
        if isinstance(dt, datetime):
            # If datetime is naive, assume it's UTC
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            # Convert to IST and extract date
            dt_ist = dt.astimezone(IST)
            return dt_ist.date()
        return dt

    @staticmethod
    async def get_patient(patient_id: str) -> Patient:
        """Get patient by ID"""
        pipeline = [
            {
                "$match": {
                    "_id": ObjectId(patient_id),
                    "is_active": True,
                    "is_deleted": False,
                }
            },
            {
                "$addFields": {
                    "organisation_icu_bed_id_obj": {
                        "$cond": {
                            "if": {"$ne": ["$organisation_icu_bed_id", None]},
                            "then": {"$toObjectId": "$organisation_icu_bed_id"},
                            "else": None
                        }
                    },
                    "organisation_icu_id_obj": {"$toObjectId": "$organisation_icu_id"},
                    "icd_code_ids_obj": {
                        "$cond": {
                            "if": {"$isArray": "$icd_code_ids"},
                            "then": {
                                "$map": {
                                    "input": "$icd_code_ids",
                                    "as": "id",
                                    "in": {"$toObjectId": "$$id"},
                                }
                            },
                            "else": [],
                        }
                    },
                }
            },
            # Add ICU lookup
            {
                "$lookup": {
                    "from": "organisation_icus",
                    "localField": "organisation_icu_id_obj",
                    "foreignField": "_id",
                    "as": "icu_data",
                }
            },
            {"$unwind": {"path": "$icu_data", "preserveNullAndEmptyArrays": True}},
            {
                "$lookup": {
                    "from": "organisation_icu_beds",
                    "localField": "organisation_icu_bed_id_obj",
                    "foreignField": "_id",
                    "as": "icu_bed",
                }
            },
            {"$unwind": {"path": "$icu_bed", "preserveNullAndEmptyArrays": True}},
            # ICD Code lookup
            {
                "$lookup": {
                    "from": "icd_codes",
                    "localField": "icd_code_ids_obj",
                    "foreignField": "_id",
                    "as": "icd_code_data",
                }
            },
            # Doctor profile lookup
            {
                "$lookup": {
                    "from": "user_profiles",
                    "let": {"doctor_id": "$doctor_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {
                                            "$eq": [
                                                "$user_id",
                                                {"$toString": "$$doctor_id"},
                                            ]
                                        },
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "doctor_profile",
                }
            },
            {
                "$unwind": {
                    "path": "$doctor_profile",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            # Consultant profile lookup
            {
                "$lookup": {
                    "from": "user_profiles",
                    "let": {"consultant_id": "$consultant_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {
                                            "$eq": [
                                                "$user_id",
                                                {"$toString": "$$consultant_id"},
                                            ]
                                        },
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "consultant_profile",
                }
            },
            {
                "$unwind": {
                    "path": "$consultant_profile",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            # Check for patient past medical history
            {
                "$lookup": {
                    "from": "patient_past_medical_history",
                    "let": {"patient_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$patient_id", "$$patient_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        },
                        {"$limit": 1},
                        {"$project": {"_id": 1}},
                    ],
                    "as": "past_medical_history_exists",
                }
            },
            # Check for patient HEENT
            {
                "$lookup": {
                    "from": "patient_heent",
                    "let": {"patient_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$patient_id", "$$patient_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        },
                        {"$limit": 1},
                        {"$project": {"_id": 1}},
                    ],
                    "as": "heent_exists",
                }
            },
            # Check for patient investigation
            {
                "$lookup": {
                    "from": "patient_investigation",
                    "let": {"patient_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$patient_id", "$$patient_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        },
                        {"$limit": 1},
                        {"$project": {"_id": 1}},
                    ],
                    "as": "investigation_exists",
                }
            },
            # Add boolean fields
            {
                "$addFields": {
                    "is_patient_past_medical_history": {
                        "$gt": [{"$size": "$past_medical_history_exists"}, 0]
                    },
                    "is_patient_heent": {"$gt": [{"$size": "$heent_exists"}, 0]},
                    "is_patient_investigation": {
                        "$gt": [{"$size": "$investigation_exists"}, 0]
                    },
                }
            },
        ]

        result = await Patient.get_collection().aggregate(pipeline).to_list(length=1)
        if not result:
            raise NotFoundError("Patient not found")
        patient = result[0]

        # Prepare ICD Code data if exists
        icd_code_info = []
        if patient.get("icd_code_data"):
            for icd_code in patient["icd_code_data"]:
                icd_code_info.append(
                    ICDCodeResponse(
                        id=str(icd_code["_id"]),
                        code=icd_code.get("code", ""),
                        description=icd_code.get("description", ""),
                        created_at=icd_code.get("created_at", ""),
                        updated_at=icd_code.get("updated_at", ""),
                    ).model_dump(mode="json")
                )

        # Convert datetime fields to IST dates
        admission_date = PatientService._convert_datetime_to_ist_date(patient.get("admission_date"))
        tele_icu_date = PatientService._convert_datetime_to_ist_date(patient.get("tele_icu_date"))
        
        patient_response = PatientResponse(
            id=str(patient["_id"]),
            unique_id=patient.get("unique_id", ""),
            first_name=patient.get("first_name", ""),
            last_name=patient.get("last_name", ""),
            gender=patient.get("gender", ""),
            age=patient.get("age", ""),
            height=patient.get("height"),
            weight=patient.get("weight"),
            criticality=patient.get("criticality", ""),
            triage=patient.get("triage", ""),
            uid_number=patient.get("uid_number", ""),
            ipid_number=patient.get("ipid_number", ""),
            admission_date=admission_date,
            admission_time=patient.get("admission_time", ""),
            tele_icu_date=tele_icu_date,
            mlc_or_non_mlc_number=patient.get("mlc_or_non_mlc_number", ""),
            status=patient.get("status", PatientStatus.ADMISSION),
            organisation_icu_id=patient.get("organisation_icu_id", ""),
            organisation_icu_bed_id=patient.get("organisation_icu_bed_id", ""),
            doctor_id=patient.get("doctor_id", ""),
            organisation_id=patient.get("organisation_id", ""),
            icd_code_ids=patient.get("icd_code_ids", ""),
            created_at=patient.get("created_at", ""),
            updated_at=patient.get("updated_at", ""),
            organisation_icu_bed_number=(
                patient.get("icu_bed", {}).get("bed_number")
                if patient.get("icu_bed", {}) and patient.get("status") == PatientStatus.ADMISSION
                else None
            ),
            organisation_icu_name=(
                patient.get("icu_data", {}).get("name", "")
                if patient.get("icu_data", {})
                else None
            ),
            doctor_full_name=(
                f'{patient["doctor_profile"].get("first_name", "")} {patient["doctor_profile"].get("last_name", "")}'.strip()
                if patient.get("doctor_profile")
                else None
            ),
            consultant_full_name=(
                f'{patient["consultant_profile"].get("first_name", "")} {patient["consultant_profile"].get("last_name", "")}'.strip()
                if patient.get("consultant_profile")
                else None
            ),
            icd_codes=icd_code_info,
            is_patient_past_medical_history=patient.get(
                "is_patient_past_medical_history", False
            ),
            is_patient_heent=patient.get("is_patient_heent", False),
            is_patient_investigation=patient.get("is_patient_investigation", False),
            remark=patient.get("remark") or None,
            remark_datetime=patient.get("remark_datetime") or None,
            report_generated=patient.get("report_generated", False),
            status_change_datetime=patient.get("status_change_datetime") or None,
            address=patient.get("address") or None,
            consultant_id=patient.get("consultant_id") or None,
        ).model_dump(mode="json")

        return patient_response

    @staticmethod
    async def create_patient(patient_data: dict, current_user: dict) -> Patient:
        """Create a new patient"""
        async with await Patient.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = patient_data["organisation_id"]

                    # Check organisation icu exists
                    organisation_icu = await OrganisationICU.find_one(
                        {
                            "_id": ObjectId(patient_data["organisation_icu_id"]),
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not organisation_icu:
                        raise NotFoundError("Organisation ICU not found")

                    # Check organisation icu bed exists (only required if status is ADMISSION)
                    patient_status = patient_data.get("status", PatientStatus.ADMISSION)
                    if patient_status == PatientStatus.ADMISSION:
                        if not patient_data.get("organisation_icu_bed_id"):
                            raise NotFoundError("Bed assignment is required when patient status is ADMISSION")
                        
                        organisation_icu_bed = await OrganisationICUBed.find_one(
                            {
                                "_id": ObjectId(patient_data["organisation_icu_bed_id"]),
                                "organisation_icu_id": patient_data["organisation_icu_id"],
                                "is_available": True,
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )
                        if not organisation_icu_bed:
                            raise NotFoundError("Organisation ICU bed not found")
                    else:
                        # For non-ADMISSION status, bed is optional
                        organisation_icu_bed = None
                        if patient_data.get("organisation_icu_bed_id"):
                            organisation_icu_bed = await OrganisationICUBed.find_one(
                                {
                                    "_id": ObjectId(patient_data["organisation_icu_bed_id"]),
                                    "organisation_icu_id": patient_data["organisation_icu_id"],
                                    "is_active": True,
                                    "is_deleted": False,
                                }
                            )
                        # Clear bed_id if status is not ADMISSION
                        patient_data["organisation_icu_bed_id"] = None

                    # Check if doctor is valid user
                    doctor = await User.find_one(
                        {
                            "_id": ObjectId(patient_data["doctor_id"]),
                            "current_organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not doctor:
                        raise NotFoundError("Doctor not found")

                    # Check if doctor has valid user_type
                    doctor_profile = await UserProfile.find_one(
                        {
                            "_id": ObjectId(doctor.current_profile_id),
                            "user_type": UserType.DOCTOR,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not doctor_profile:
                        raise NotFoundError("Doctor profile not found")

                    # Check if consultant_id is provided and validate it
                    # Consultants are universal and not associated with any organisation
                    if patient_data.get("consultant_id"):
                        consultant = await User.find_one(
                            {
                                "_id": ObjectId(patient_data["consultant_id"]),
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )
                        if not consultant:
                            raise NotFoundError("Consultant not found")

                        # Check if consultant has valid profile
                        consultant_profile = await UserProfile.find_one(
                            {
                                "_id": ObjectId(consultant.current_profile_id),
                                # "user_type": UserType.DOCTOR,
                                # "role_type": RoleType.CONSULTANT,
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )
                        if not consultant_profile:
                            raise NotFoundError("Consultant profile not found")

                    # Convert string ids to ObjectIds safely
                    icd_code_object_ids = [
                        ObjectId(id) for id in patient_data["icd_code_ids"]
                    ]

                    # Query all matching ICD codes
                    icd_codes_cursor = ICDCode.get_collection().find(
                        {
                            "_id": {"$in": icd_code_object_ids},
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    icd_codes = await icd_codes_cursor.to_list(length=None)

                    # Validate all IDs are found
                    if len(icd_codes) != len(icd_code_object_ids):
                        raise NotFoundError(
                            "One or more ICD codes not found or inactive"
                        )

                    patient_data["unique_id"] = (
                        await Patient.generate_patient_unique_id()
                    )

                    # Create patient
                    patient = await Patient.create(
                        **patient_data,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        session=session,
                    )

                    # Update organisation icu bed availability based on patient status
                    # Only update bed if status is ADMISSION (bed should be unavailable)
                    patient_status = patient_data.get("status", PatientStatus.ADMISSION)
                    if patient_status == PatientStatus.ADMISSION and organisation_icu_bed:
                        await organisation_icu_bed.update(
                            {
                                "is_available": False,
                                "updated_by": updated_by,
                                "updated_by_profile": updated_by_profile,
                            }
                        )
                    
                    # Commit transaction
                    await session.commit_transaction()

                    return patient

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    raise e

    @staticmethod
    async def update_patient(
        patient_id: str, patient_data: dict, current_user: dict
    ) -> Patient:
        """Update a patient"""
        async with await Patient.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    update_data = {
                        **patient_data,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }
                    update_data = {
                        k: v for k, v in update_data.items() if v is not None
                    }

                    # Check for existing patient
                    existing = await Patient.find_one(
                        {
                            "_id": ObjectId(patient_id),
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Patient not found")

                    # Check if status is being changed and set status_change_datetime
                    if "status" in update_data and update_data["status"] != existing.status:
                        new_status = update_data["status"]
                        update_data["status_change_datetime"] = datetime.now(UTC)
                        
                        # If status changes to non-ADMISSION, clear bed assignment and release bed
                        if new_status != PatientStatus.ADMISSION:
                            bed_id = existing.organisation_icu_bed_id
                            if bed_id:
                                # Release the bed
                                await OrganisationICUBed.get_collection().update_one(
                                    {
                                        "_id": ObjectId(bed_id),
                                        "is_active": True,
                                        "is_deleted": False,
                                    },
                                    {
                                        "$set": {
                                            "is_available": True,
                                            "updated_by": updated_by,
                                            "updated_by_profile": updated_by_profile,
                                        }
                                    },
                                )
                            # Clear bed assignment
                            update_data["organisation_icu_bed_id"] = None
                        # If status changes to ADMISSION, bed_id required (or auto-assign from same ICU)
                        elif new_status == PatientStatus.ADMISSION:
                            if "organisation_icu_bed_id" not in update_data or not update_data.get("organisation_icu_bed_id"):
                                icu_id = update_data.get("organisation_icu_id") or existing.organisation_icu_id
                                if not icu_id:
                                    raise NotFoundError(
                                        "Organisation ICU is required to activate patient"
                                    )

                                available_beds = await OrganisationICUBed.find(
                                    {
                                        "organisation_icu_id": icu_id,
                                        "is_available": True,
                                        "is_active": True,
                                        "is_deleted": False,
                                    },
                                    limit=100,
                                    sort=[("bed_number", 1)],
                                )
                                if not available_beds:
                                    raise NotFoundError(
                                        "No available bed in the patient's ICU"
                                    )

                                selected_bed = random.choice(available_beds)
                                update_data["organisation_icu_bed_id"] = selected_bed.id

                    if "organisation_icu_id" in update_data:
                        # Check organisation icu exists
                        organisation_icu = await OrganisationICU.find_one(
                            {
                                "_id": ObjectId(update_data["organisation_icu_id"]),
                                "organisation_id": existing.organisation_id,
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )
                        if not organisation_icu:
                            raise NotFoundError("Organisation ICU not found")

                    if "organisation_icu_bed_id" in update_data:
                        # Determine the effective patient status (use new status if being updated, otherwise current status)
                        effective_status = update_data.get("status", existing.status)
                        new_bed_id = update_data["organisation_icu_bed_id"]
                        old_bed_id = existing.organisation_icu_bed_id
                        
                        # If status is ADMISSION, bed_id is required
                        if effective_status == PatientStatus.ADMISSION:
                            if not new_bed_id:
                                raise NotFoundError("Bed assignment is required when patient status is ADMISSION")
                            
                            # Check organisation icu bed exists and is available
                            bed_filter = {
                                "_id": ObjectId(new_bed_id),
                                "organisation_icu_id": existing.organisation_icu_id,
                                "is_available": True,
                                "is_active": True,
                                "is_deleted": False,
                            }
                            
                            organisation_icu_bed = await OrganisationICUBed.find_one(bed_filter)
                            if not organisation_icu_bed:
                                raise NotFoundError("Organisation ICU bed not found or not available")

                            # Update new bed if it's different from old bed
                            if new_bed_id != old_bed_id:
                                await OrganisationICUBed.get_collection().update_one(
                                    {
                                        "_id": ObjectId(new_bed_id),
                                        "is_active": True,
                                        "is_deleted": False,
                                    },
                                    {
                                        "$set": {
                                            "is_available": False,
                                            "updated_by": updated_by,
                                            "updated_by_profile": updated_by_profile,
                                        }
                                    },
                                )
                                
                                # Release old bed
                                if old_bed_id:
                                    old_bed = await OrganisationICUBed.find_one(
                                        {
                                            "_id": ObjectId(old_bed_id),
                                            "is_active": True,
                                            "is_deleted": False,
                                        }
                                    )
                                    if old_bed:
                                        await old_bed.update(
                                            {
                                                "is_available": True,
                                                "updated_by": updated_by,
                                                "updated_by_profile": updated_by_profile,
                                            }
                                        )
                        else:
                            # If status is not ADMISSION, clear bed assignment and release bed
                            if new_bed_id:
                                # If someone tries to assign a bed when status is not ADMISSION, clear it
                                update_data["organisation_icu_bed_id"] = None
                            
                            # Release old bed if it exists
                            if old_bed_id:
                                old_bed = await OrganisationICUBed.find_one(
                                    {
                                        "_id": ObjectId(old_bed_id),
                                        "is_active": True,
                                        "is_deleted": False,
                                    }
                                )
                                if old_bed:
                                    await old_bed.update(
                                        {
                                            "is_available": True,
                                            "updated_by": updated_by,
                                            "updated_by_profile": updated_by_profile,
                                        }
                                    )
                    if "doctor_id" in update_data:
                        # Check if doctor is valid user
                        doctor = await User.find_one(
                            {
                                "_id": ObjectId(update_data["doctor_id"]),
                                "current_organisation_id": existing.organisation_id,
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )
                        if not doctor:
                            raise NotFoundError("Doctor not found")

                        # Check if doctor has valid user_type
                        doctor_profile = await UserProfile.find_one(
                            {
                                "_id": ObjectId(doctor.current_profile_id),
                                "user_type": UserType.DOCTOR,
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )
                        if not doctor_profile:
                            raise NotFoundError("Doctor profile not found")

                    if "consultant_id" in update_data and update_data.get("consultant_id"):
                        # Check if consultant is valid user
                        # Consultants are universal and not associated with any organisation
                        consultant = await User.find_one(
                            {
                                "_id": ObjectId(update_data["consultant_id"]),
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )
                        if not consultant:
                            raise NotFoundError("Consultant not found")

                        # Check if consultant has valid profile
                        consultant_profile = await UserProfile.find_one(
                            {
                                "_id": ObjectId(consultant.current_profile_id),
                                # "user_type": UserType.DOCTOR,
                                # "role_type": RoleType.CONSULTANT,
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )
                        if not consultant_profile:
                            raise NotFoundError("Consultant profile not found")

                    if "icd_code_id" in update_data:
                        # Check if icd code exists
                        icd_code = await ICDCode.find_one(
                            {
                                "_id": ObjectId(update_data["icd_code_id"]),
                                "is_active": True,
                                "is_deleted": False,
                            }
                        )
                        if not icd_code:
                            raise NotFoundError("ICD code not found")

                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    return existing
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def delete_patient(patient_id: str, current_user: dict) -> None:
        """Delete a patient"""
        async with await Patient.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = str(current_user["oid"])

                    update_data = {
                        "is_active": False,
                        "is_deleted": True,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }

                    # Check for existing patient
                    existing = await Patient.find_one(
                        {
                            "_id": ObjectId(patient_id),
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Patient not found")

                    bed_id = getattr(existing, "organisation_icu_bed_id", None)

                    await existing.update(update_data)

                    if bed_id:
                        await OrganisationICUBed.get_collection().update_one(
                            {
                                "_id": ObjectId(bed_id),
                                "is_active": True,
                                "is_deleted": False,
                            },
                            {
                                "$set": {
                                    "is_available": True,
                                    "updated_by": updated_by,
                                    "updated_by_profile": updated_by_profile,
                                }
                            },
                        )

                    # Commit transaction
                    await session.commit_transaction()
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def get_all_patients(params: PatientFilterParams, current_user: dict) -> dict:
        """Get all patients"""
        encrypted_user_type = current_user["ut"]
        user_type = UserType(decrypt_user_type(encrypted_user_type))

        filter_query = {"is_active": True, "is_deleted": False}

        if UserType.requires_organisation_id(user_type):
            if hasattr(params, "organisation_id") and params.organisation_id:
                filter_query["organisation_id"] = params.organisation_id
        else:
            filter_query["organisation_id"] = current_user["oid"]

        # Handle search field - searches across multiple patient fields
        if params.search:
            search_term = params.search.strip()
            if search_term:
                # Search across: unique_id, first_name, last_name, uid_number, ipid_number, mlc_or_non_mlc_number
                search_conditions = [
                    {"unique_id": {"$regex": search_term, "$options": "i"}},
                    {"first_name": {"$regex": search_term, "$options": "i"}},
                    {"last_name": {"$regex": search_term, "$options": "i"}},
                    {"uid_number": {"$regex": search_term, "$options": "i"}},
                    {"ipid_number": {"$regex": search_term, "$options": "i"}},
                    {"mlc_or_non_mlc_number": {"$regex": search_term, "$options": "i"}},
                ]
                filter_query["$or"] = search_conditions

        if params.unique_id:
            filter_query["unique_id"] = {"$regex": params.unique_id, "$options": "i"}
        if params.first_name:
            filter_query["first_name"] = {"$regex": params.first_name, "$options": "i"}
        if params.last_name:
            filter_query["last_name"] = {"$regex": params.last_name, "$options": "i"}
        if params.gender:
            filter_query["gender"] = params.gender
        if params.criticality:
            filter_query["criticality"] = params.criticality
        if params.triage:
            filter_query["triage"] = params.triage
        if params.organisation_icu_id:
            filter_query["organisation_icu_id"] = params.organisation_icu_id
        if params.organisation_icu_bed_id:
            filter_query["organisation_icu_bed_id"] = params.organisation_icu_bed_id
        if params.doctor_id:
            filter_query["doctor_id"] = params.doctor_id
        if params.statuses:
            # Multiple statuses filter takes priority
            filter_query["status"] = {"$in": [s.value for s in params.statuses]}
        elif params.status:
            filter_query["status"] = params.status

        skip = (params.page - 1) * params.limit
        # Default: bed number ascending (1, 2, 3...). Explicit sort_by still respected.
        if params.sort_by:
            sort_field = params.sort_by
            sort_order = 1 if params.sort_order == "asc" else -1
        else:
            sort_field = "sort_bed_number"
            sort_order = 1

        pipeline = [
            {"$match": filter_query},
            {
                "$addFields": {
                    "organisation_icu_bed_id_obj": {
                        "$cond": {
                            "if": {"$ne": ["$organisation_icu_bed_id", None]},
                            "then": {"$toObjectId": "$organisation_icu_bed_id"},
                            "else": None
                        }
                    },
                    "organisation_icu_id_obj": {"$toObjectId": "$organisation_icu_id"},
                    "icd_code_ids_obj": {
                        "$cond": {
                            "if": {"$isArray": "$icd_code_ids"},
                            "then": {
                                "$map": {
                                    "input": "$icd_code_ids",
                                    "as": "id",
                                    "in": {"$toObjectId": "$$id"},
                                }
                            },
                            "else": [],
                        }
                    },
                }
            },
            # ICU lookup
            {
                "$lookup": {
                    "from": "organisation_icus",
                    "localField": "organisation_icu_id_obj",
                    "foreignField": "_id",
                    "as": "icu_data",
                }
            },
            {"$unwind": {"path": "$icu_data", "preserveNullAndEmptyArrays": True}},
            # ICU Bed lookup
            {
                "$lookup": {
                    "from": "organisation_icu_beds",
                    "localField": "organisation_icu_bed_id_obj",
                    "foreignField": "_id",
                    "as": "icu_bed",
                }
            },
            {"$unwind": {"path": "$icu_bed", "preserveNullAndEmptyArrays": True}},
            # ICD Code lookup
            {
                "$lookup": {
                    "from": "icd_codes",
                    "localField": "icd_code_ids_obj",
                    "foreignField": "_id",
                    "as": "icd_code_data",
                }
            },
            # Doctor profile lookup
            {
                "$lookup": {
                    "from": "user_profiles",
                    "let": {"doctor_id": "$doctor_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {
                                            "$eq": [
                                                "$user_id",
                                                {"$toString": "$$doctor_id"},
                                            ]
                                        },
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "doctor_profile",
                }
            },
            {
                "$unwind": {
                    "path": "$doctor_profile",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            # Consultant profile lookup
            {
                "$lookup": {
                    "from": "user_profiles",
                    "let": {"consultant_id": "$consultant_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {
                                            "$eq": [
                                                "$user_id",
                                                {"$toString": "$$consultant_id"},
                                            ]
                                        },
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "consultant_profile",
                }
            },
            {
                "$unwind": {
                    "path": "$consultant_profile",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            # Check for patient past medical history
            {
                "$lookup": {
                    "from": "patient_past_medical_history",
                    "let": {"patient_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$patient_id", "$$patient_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        },
                        {"$limit": 1},
                        {"$project": {"_id": 1}},
                    ],
                    "as": "past_medical_history_exists",
                }
            },
            # Check for patient HEENT
            {
                "$lookup": {
                    "from": "patient_heent",
                    "let": {"patient_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$patient_id", "$$patient_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        },
                        {"$limit": 1},
                        {"$project": {"_id": 1}},
                    ],
                    "as": "heent_exists",
                }
            },
            # Check for patient investigation
            {
                "$lookup": {
                    "from": "patient_investigation",
                    "let": {"patient_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$patient_id", "$$patient_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        },
                        {"$limit": 1},
                        {"$project": {"_id": 1}},
                    ],
                    "as": "investigation_exists",
                }
            },
            # Add boolean fields + bed sort key (null beds last)
            {
                "$addFields": {
                    "is_patient_past_medical_history": {
                        "$gt": [{"$size": "$past_medical_history_exists"}, 0]
                    },
                    "is_patient_heent": {"$gt": [{"$size": "$heent_exists"}, 0]},
                    "is_patient_investigation": {
                        "$gt": [{"$size": "$investigation_exists"}, 0]
                    },
                    "sort_bed_number": {
                        "$ifNull": ["$icu_bed.bed_number", 999999]
                    },
                }
            },
            {"$sort": {sort_field: sort_order}},
            {
                "$facet": {
                    "metadata": [
                        {"$count": "total"},
                    ],
                    "data": [
                        {"$skip": skip},
                        {"$limit": params.limit},
                    ],
                }
            },
        ]

        result = await Patient.get_collection().aggregate(pipeline).to_list(length=1)
        result = result[0] if result else {"metadata": {"total": 0}, "data": []}

        total = result["metadata"][0]["total"] if result["metadata"] else 0
        patients = []
        for patient in result["data"]:
            # Convert datetime fields to IST dates
            admission_date = PatientService._convert_datetime_to_ist_date(patient.get("admission_date"))
            tele_icu_date = PatientService._convert_datetime_to_ist_date(patient.get("tele_icu_date"))
            
            patients.append(
                PatientResponse(
                    id=str(patient["_id"]),
                    unique_id=patient.get("unique_id", ""),
                    first_name=patient.get("first_name", ""),
                    last_name=patient.get("last_name", ""),
                    gender=patient.get("gender", ""),
                    age=patient.get("age", ""),
                    height=patient.get("height"),
                    weight=patient.get("weight"),
                    criticality=patient.get("criticality", ""),
                    triage=patient.get("triage", ""),
                    uid_number=patient.get("uid_number", ""),
                    ipid_number=patient.get("ipid_number", ""),
                    admission_date=admission_date,
                    admission_time=patient.get("admission_time", ""),
                    tele_icu_date=tele_icu_date,
                    mlc_or_non_mlc_number=patient.get("mlc_or_non_mlc_number", ""),
                    status=patient.get("status", PatientStatus.ADMISSION),
                    organisation_icu_id=patient.get("organisation_icu_id", ""),
                    organisation_icu_bed_id=patient.get("organisation_icu_bed_id", ""),
                    doctor_id=patient.get("doctor_id", ""),
                    organisation_id=patient.get("organisation_id", ""),
                    icd_code_ids=patient.get("icd_code_ids", ""),
                    created_at=patient.get("created_at", ""),
                    updated_at=patient.get("updated_at", ""),
                    organisation_icu_bed_number=(
                        patient.get("icu_bed", {}).get("bed_number")
                        if patient.get("icu_bed", {}) and patient.get("status") == PatientStatus.ADMISSION
                        else None
                    ),
                    organisation_icu_name=(
                        patient.get("icu_data", {}).get("name", "")
                        if patient.get("icu_data", {})
                        else None
                    ),
                    doctor_full_name=(
                        f'{patient["doctor_profile"].get("first_name", "")} {patient["doctor_profile"].get("last_name", "")}'.strip()
                        if patient.get("doctor_profile")
                        else None
                    ),
                    consultant_full_name=(
                        f'{patient["consultant_profile"].get("first_name", "")} {patient["consultant_profile"].get("last_name", "")}'.strip()
                        if patient.get("consultant_profile")
                        else None
                    ),
                    icd_codes=(
                        [
                            ICDCodeResponse(
                                id=str(code["_id"]),
                                code=code.get("code", ""),
                                description=code.get("description", ""),
                                created_at=code.get("created_at", ""),
                                updated_at=code.get("updated_at", ""),
                            ).model_dump()
                            for code in patient.get("icd_code_data", [])
                        ]
                        if patient.get("icd_code_data")
                        else []
                    ),
                    is_patient_past_medical_history=patient.get(
                        "is_patient_past_medical_history", False
                    ),
                    is_patient_heent=patient.get("is_patient_heent", False),
                    is_patient_investigation=patient.get("is_patient_investigation", False),
                    remark=patient.get("remark") or None,
                    remark_datetime=patient.get("remark_datetime") or None,
                    report_generated=patient.get("report_generated", False),
                    status_change_datetime=patient.get("status_change_datetime") or None,
                    address=patient.get("address") or None,
                    consultant_id=patient.get("consultant_id") or None,
                ).model_dump(mode="json")
            )

        pages = (total + params.limit - 1) // params.limit
        has_next = params.page < pages
        has_prev = params.page > 1

        response = {
            "items": patients,
            "total": total,
            "page": params.page,
            "limit": params.limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }

        return response

    @staticmethod
    async def get_patient_info(patient_id: str) -> dict:
        """Get complete patient information including basic details, HEENT, investigation, and past medical history"""
        # Create a pipeline to fetch all patient-related data in a single aggregation
        pipeline = [
            # Match the patient
            {
                "$match": {
                    "_id": ObjectId(patient_id),
                    "is_active": True,
                    "is_deleted": False,
                }
            },
            # Add fields for object ID conversions
            {
                "$addFields": {
                    "organisation_icu_bed_id_obj": {
                        "$cond": {
                            "if": {"$ne": ["$organisation_icu_bed_id", None]},
                            "then": {"$toObjectId": "$organisation_icu_bed_id"},
                            "else": None
                        }
                    },
                    "organisation_icu_id_obj": {"$toObjectId": "$organisation_icu_id"},
                    "icd_code_ids_obj": {
                        "$cond": {
                            "if": {"$isArray": "$icd_code_ids"},
                            "then": {
                                "$map": {
                                    "input": "$icd_code_ids",
                                    "as": "id",
                                    "in": {"$toObjectId": "$$id"},
                                }
                            },
                            "else": [],
                        }
                    },
                }
            },
            # Lookup ICU information
            {
                "$lookup": {
                    "from": "organisation_icus",
                    "localField": "organisation_icu_id_obj",
                    "foreignField": "_id",
                    "as": "icu_data",
                }
            },
            {"$unwind": {"path": "$icu_data", "preserveNullAndEmptyArrays": True}},
            # Lookup ICU bed information
            {
                "$lookup": {
                    "from": "organisation_icu_beds",
                    "localField": "organisation_icu_bed_id_obj",
                    "foreignField": "_id",
                    "as": "icu_bed",
                }
            },
            {"$unwind": {"path": "$icu_bed", "preserveNullAndEmptyArrays": True}},
            # Lookup ICD code information
            {
                "$lookup": {
                    "from": "icd_codes",
                    "localField": "icd_code_ids_obj",
                    "foreignField": "_id",
                    "as": "icd_code_data",
                }
            },
            # Lookup doctor profile
            {
                "$lookup": {
                    "from": "user_profiles",
                    "let": {"doctor_id": "$doctor_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {
                                            "$eq": [
                                                "$user_id",
                                                {"$toString": "$$doctor_id"},
                                            ]
                                        },
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "doctor_profile",
                }
            },
            {
                "$unwind": {
                    "path": "$doctor_profile",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            # Lookup consultant profile
            {
                "$lookup": {
                    "from": "user_profiles",
                    "let": {"consultant_id": "$consultant_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {
                                            "$eq": [
                                                "$user_id",
                                                {"$toString": "$$consultant_id"},
                                            ]
                                        },
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "consultant_profile",
                }
            },
            {
                "$unwind": {
                    "path": "$consultant_profile",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            # Lookup HEENT data
            {
                "$lookup": {
                    "from": "patient_heent",
                    "let": {"patient_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$patient_id", "$$patient_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "heent_data",
                }
            },
            {"$unwind": {"path": "$heent_data", "preserveNullAndEmptyArrays": True}},
            # Lookup investigation data
            {
                "$lookup": {
                    "from": "patient_investigation",
                    "let": {"patient_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$patient_id", "$$patient_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "investigation_data",
                }
            },
            {
                "$unwind": {
                    "path": "$investigation_data",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            # Lookup past medical history data
            {
                "$lookup": {
                    "from": "patient_past_medical_history",
                    "let": {"patient_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$eq": ["$patient_id", "$$patient_id"]},
                                        {"$eq": ["$is_active", True]},
                                        {"$eq": ["$is_deleted", False]},
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "past_medical_history_data",
                }
            },
            {
                "$unwind": {
                    "path": "$past_medical_history_data",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            # Convert ObjectIds to strings
            {
                "$addFields": {
                    "heent_data._id": {"$toString": "$heent_data._id"},
                    "investigation_data._id": {"$toString": "$investigation_data._id"},
                    "past_medical_history_data._id": {
                        "$toString": "$past_medical_history_data._id"
                    },
                    "doctor_profile._id": {"$toString": "$doctor_profile._id"},
                    "icu_bed._id": {"$toString": "$icu_bed._id"},
                    "icu_data._id": {"$toString": "$icu_data._id"},
                    "icd_code_data": {
                        "$map": {
                            "input": "$icd_code_data",
                            "as": "icd",
                            "in": {
                                "$mergeObjects": [
                                    "$$icd",
                                    {"_id": {"$toString": "$$icd._id"}},
                                ]
                            },
                        }
                    },
                }
            },
        ]

        result = await Patient.get_collection().aggregate(pipeline).to_list(length=1)
        if not result:
            raise NotFoundError("Patient not found")

        patient_data = result[0]

        # Prepare ICD Code data if exists
        icd_code_info = []
        if patient_data.get("icd_code_data"):
            for icd_code in patient_data["icd_code_data"]:
                icd_code_info.append(
                    ICDCodeResponse(
                        id=str(icd_code["_id"]),
                        code=icd_code.get("code", ""),
                        description=icd_code.get("description", ""),
                        created_at=icd_code.get("created_at", ""),
                        updated_at=icd_code.get("updated_at", ""),
                    ).model_dump(mode="json")
                )

        # Build the complete response
        response = {
            "basic_details": {
                "id": str(patient_data["_id"]),
                "unique_id": patient_data.get("unique_id", ""),
                "first_name": patient_data.get("first_name", ""),
                "last_name": patient_data.get("last_name", ""),
                "gender": patient_data.get("gender", ""),
                "age": patient_data.get("age", ""),
                "height": patient_data.get("height"),
                "weight": patient_data.get("weight"),
                "criticality": patient_data.get("criticality", ""),
                "triage": patient_data.get("triage", ""),
                "uid_number": patient_data.get("uid_number", ""),
                "ipid_number": patient_data.get("ipid_number", ""),
                "admission_date": patient_data.get("admission_date", ""),
                "admission_time": patient_data.get("admission_time", ""),
                "tele_icu_date": patient_data.get("tele_icu_date", ""),
                "mlc_or_non_mlc_number": patient_data.get("mlc_or_non_mlc_number", ""),
                "status": patient_data.get("status", PatientStatus.ADMISSION),
                "organisation_icu_id": patient_data.get("organisation_icu_id", ""),
                "organisation_icu_bed_id": patient_data.get(
                    "organisation_icu_bed_id", ""
                ),
                "doctor_id": patient_data.get("doctor_id", ""),
                "organisation_id": patient_data.get("organisation_id", ""),
                "icd_code_ids": patient_data.get("icd_code_ids", ""),
                "created_at": patient_data.get("created_at", ""),
                "updated_at": patient_data.get("updated_at", ""),
                "organisation_icu_bed_number": (
                    patient_data.get("icu_bed", {}).get("bed_number")
                    if patient_data.get("icu_bed", {}) and patient_data.get("status") == PatientStatus.ADMISSION
                    else None
                ),
                "organisation_icu_name": (
                    patient_data.get("icu_data", {}).get("name", "")
                    if patient_data.get("icu_data", {})
                    else None
                ),
                "doctor_full_name": (
                    f'{patient_data["doctor_profile"].get("first_name", "")} {patient_data["doctor_profile"].get("last_name", "")}'.strip()
                    if patient_data.get("doctor_profile")
                    else None
                ),
                "consultant_full_name": (
                    f'{patient_data["consultant_profile"].get("first_name", "")} {patient_data["consultant_profile"].get("last_name", "")}'.strip()
                    if patient_data.get("consultant_profile")
                    else None
                ),
                "icd_codes": icd_code_info,
                "remark": patient_data.get("remark") or None,
                "remark_datetime": patient_data.get("remark_datetime") or None,
                "report_generated": patient_data.get("report_generated", False),
                "status_change_datetime": patient_data.get("status_change_datetime") or None,
                "address": patient_data.get("address") or None,
                "consultant_id": patient_data.get("consultant_id") or None,
            },
            "heent": patient_data.get("heent_data", {}),
            "investigation": patient_data.get("investigation_data", {}),
            "past_medical_history": patient_data.get("past_medical_history_data", {}),
        }

        return response

    @staticmethod
    async def can_create_progress_sheet(patient_id: str) -> bool:
        """Check if a patient can have progress sheets created"""
        try:
            patient = await Patient.find_one(
                {
                    "_id": ObjectId(patient_id),
                    "is_active": True,
                    "is_deleted": False,
                }
            )
            if not patient:
                return False
            
            # Only patients with ADMISSION status can have progress sheets
            return patient.status == PatientStatus.ADMISSION
        except Exception as e:
            logger.error(f"Error checking if patient can create progress sheet: {e}")
            return False

    @staticmethod
    async def is_patient_final_status(patient_id: str) -> bool:
        """Check if a patient has reached a final status (discharge, lama, deceased, referred)"""
        try:
            patient = await Patient.find_one(
                {
                    "_id": ObjectId(patient_id),
                    "is_active": True,
                    "is_deleted": False,
                }
            )
            if not patient:
                return False
            
            # Final statuses — no Active/reactivate from these
            return patient.status in [
                PatientStatus.DISCHARGE,
                PatientStatus.REFERRED,
                PatientStatus.LAMA,
                PatientStatus.DECEASED,
            ]
        except Exception as e:
            logger.error(f"Error checking if patient has final status: {e}")
            return False


patient_service = PatientService()
