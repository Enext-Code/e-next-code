import logging
from datetime import UTC, datetime, timedelta
from typing import List, Optional

from bson import ObjectId

from app.accounts.enums import UserType
from app.base.models import NotFoundError, ValidationError
from app.core import cache
from app.patients.models import Patient
from app.utils import decrypt_user_type

from ..filters import ProgressSheetFilterParams
from ..models import (CatheterEntry, ColloidEntry, CrystalloidEntry,
                      DrainageEntry, FluidParametersModel, InfusionEntry,
                      IntakeEntry, OralIntakeEntry, OtherInfusionEntry,
                      OutputEntry, PatientProgressSheet, ProgressEntry,
                      ProgressParameterGroup, RylesTubeEntry, UrinesEntry)
from ..schemas import (BloodGasSectionSchema, CatheterEntrySchema,
                       CatheterSectionSchema, ColloidEntrySchema,
                       CreatePatientProgressSheetSchema,
                       CrystalloidEntrySchema, DrainageEntrySchema,
                       FluidDataByDateResponse, FluidEntryWithTimeSchema,
                       FluidSectionSchema, GCSSectionSchema,
                       InfusionEntrySchema, IntakeEntrySchema,
                       OralIntakeEntrySchema, OtherInfusionEntrySchema,
                       OutputEntrySchema, PatientProgressSheetDetailSchema,
                       ProgressEntrySchema, RespiratorySectionSchema,
                       RylesTubeEntrySchema, UrinesEntrySchema,
                       VitalsSectionSchema)

logger = logging.getLogger(__name__)


class ProgressSheetService:
    """Progress Sheet Service"""

    CACHE_KEY_PREFIX = "progress_sheet"
    LIST_CACHE_KEY_PREFIX = "progress_sheet_list"
    PATIENT_SHEETS_CACHE_KEY_PREFIX = "patient_progress_sheets"
    CACHE_TIMEOUT = timedelta(minutes=30)

    @staticmethod
    async def _invalidate_cache(sheet_id: str = None, patient_id: str = None) -> None:
        """Invalidate cache"""
        if sheet_id:
            await cache.delete(f"{ProgressSheetService.CACHE_KEY_PREFIX}:{sheet_id}")
        if patient_id:
            await cache.delete_pattern(
                f"{ProgressSheetService.PATIENT_SHEETS_CACHE_KEY_PREFIX}:{patient_id}:*"
            )
        await cache.delete_pattern(f"{ProgressSheetService.LIST_CACHE_KEY_PREFIX}:*")

    @staticmethod
    async def _validate_and_get_entry(
        sheet_id: str,
        time: str,
    ) -> tuple[PatientProgressSheet, Optional[ProgressEntry]]:
        """Validate and get entry"""

        # Get progress sheet
        progress_sheet = await PatientProgressSheet.find_one(
            {
                "sheet_id": sheet_id,
                "is_active": True,
                "is_deleted": False,
            }
        )
        if not progress_sheet:
            raise NotFoundError("Progress sheet not found")

        # Ensure date is in the correct format
        if isinstance(progress_sheet.date, str):
            # If date is already a string in the correct format, keep it
            pass
        else:
            # Convert datetime to string in the desired format
            progress_sheet.date = progress_sheet.date.strftime("%Y-%m-%dT%H:%M:%SZ")

        # Find existing entry for this time
        existing_entry = None
        for entry in progress_sheet.entries:
            if entry.time == time:
                existing_entry = entry
                break

        # If no existing entry, check if we can add a new one
        if not existing_entry:
            entries_for_date = [
                entry
                for entry in progress_sheet.entries
                if entry.time.startswith(time.split(":")[0])
            ]

            if len(entries_for_date) >= 24:
                raise ValidationError(
                    message="Cannot add more than 24 entries per day",
                    error_code="MAX_ENTRIES_PER_DAY",
                )

        return progress_sheet, existing_entry

    @staticmethod
    async def _convert_entries_to_schema(
        entries: List[ProgressEntry],
    ) -> List[ProgressEntrySchema]:
        """Convert entries to schema objects"""
        entries_schema = []
        for entry in entries:
            entry_dict = {
                "time": entry.time,
                "gcs": (
                    GCSSectionSchema(values=entry.parameters.gcs)
                    if entry.parameters.gcs
                    else None
                ),
                "fluid": (
                    FluidSectionSchema(
                        infusions=(
                            [
                                InfusionEntrySchema(
                                    name=infusion.name, quantity=infusion.quantity
                                )
                                for infusion in entry.parameters.fluid.infusions
                            ]
                            if entry.parameters.fluid.infusions
                            else []
                        ),
                        intakes=(
                            [
                                IntakeEntrySchema(
                                    name=intake.name, quantity=intake.quantity
                                )
                                for intake in entry.parameters.fluid.intakes
                            ]
                            if entry.parameters.fluid.intakes
                            else []
                        ),
                        outputs=(
                            [
                                OutputEntrySchema(
                                    name=output.name, quantity=output.quantity
                                )
                                for output in entry.parameters.fluid.outputs
                            ]
                            if entry.parameters.fluid.outputs
                            else []
                        ),
                        other_infusions=(
                            [
                                OtherInfusionEntrySchema(
                                    name=infusion.name, quantity=infusion.quantity
                                )
                                for infusion in entry.parameters.fluid.other_infusions
                            ]
                            if entry.parameters.fluid.other_infusions
                            else []
                        ),
                        colloids=(
                            [
                                ColloidEntrySchema(
                                    name=colloid.name, quantity=colloid.quantity
                                )
                                for colloid in entry.parameters.fluid.colloids
                            ]
                            if entry.parameters.fluid.colloids
                            else []
                        ),
                        crystalloids=(
                            [
                                CrystalloidEntrySchema(
                                    name=crystalloid.name, quantity=crystalloid.quantity
                                )
                                for crystalloid in entry.parameters.fluid.crystalloids
                            ]
                            if entry.parameters.fluid.crystalloids
                            else []
                        ),
                        oral_intakes=(
                            [
                                OralIntakeEntrySchema(
                                    name=intake.name, quantity=intake.quantity
                                )
                                for intake in entry.parameters.fluid.oral_intakes
                            ]
                            if entry.parameters.fluid.oral_intakes
                            else []
                        ),
                        ryles_tubes=(
                            [
                                RylesTubeEntrySchema(
                                    name=tube.name, quantity=tube.quantity
                                )
                                for tube in entry.parameters.fluid.ryles_tubes
                            ]
                            if entry.parameters.fluid.ryles_tubes
                            else []
                        ),
                        urines=(
                            [
                                UrinesEntrySchema(
                                    name=urine.name, quantity=urine.quantity
                                )
                                for urine in entry.parameters.fluid.urines
                            ]
                            if entry.parameters.fluid.urines
                            else []
                        ),
                        drainages=(
                            [
                                DrainageEntrySchema(
                                    name=drainage.name, quantity=drainage.quantity
                                )
                                for drainage in entry.parameters.fluid.drainages
                            ]
                            if entry.parameters.fluid.drainages
                            else []
                        ),
                        total_input=entry.parameters.fluid.total_input,
                        total_output=entry.parameters.fluid.total_output,
                        cumulative_balance=entry.parameters.fluid.cumulative_balance,
                    )
                    if entry.parameters.fluid
                    else None
                ),
                "vitals": (
                    VitalsSectionSchema(values=entry.parameters.vitals)
                    if entry.parameters.vitals
                    else None
                ),
                "blood_gas": (
                    BloodGasSectionSchema(values=entry.parameters.blood_gas)
                    if entry.parameters.blood_gas
                    else None
                ),
                "respiratory": (
                    RespiratorySectionSchema(values=entry.parameters.respiratory)
                    if entry.parameters.respiratory
                    else None
                ),
                "catheter": (
                    CatheterSectionSchema(
                        entries=(
                            [
                                CatheterEntrySchema(
                                    type=catheter.type,
                                    size=catheter.size,
                                    site=catheter.site,
                                    date_of_insertion=catheter.date_of_insertion,
                                    date_of_removal=catheter.date_of_removal,
                                    days_in_use=catheter.days_in_use,
                                )
                                for catheter in entry.parameters.catheter
                            ]
                            if entry.parameters.catheter
                            else []
                        )
                    )
                    if entry.parameters.catheter
                    else None
                ),
            }
            entries_schema.append(entry_dict)
        entries_schema.sort(key=lambda e: e.get("time") or "")
        return entries_schema

    @staticmethod
    async def create_progress_sheet(
        request: CreatePatientProgressSheetSchema,
        current_user: dict,
    ) -> dict:
        """Create a new progress sheet"""
        async with await PatientProgressSheet.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = request.organisation_id

                    # Validate patient exists
                    patient = await Patient.find_one(
                        {
                            "_id": ObjectId(request.patient_id),
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not patient:
                        raise NotFoundError("Patient not found")

                    normalized_date = request.date.replace(
                        hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC
                    )
                    
                    # Validate progress sheet date: must be on admission_date or after (not before)
                    progress_sheet_date = normalized_date.date()
                    if progress_sheet_date < patient.admission_date:
                        raise ValidationError(
                            message=f"Progress sheet date ({progress_sheet_date}) cannot be before patient admission date ({patient.admission_date})",
                            error_code="INVALID_PROGRESS_SHEET_DATE",
                        )
                    
                    # Convert datetime to string format: YYYY-MM-DDTHH:MM:SS
                    date_string = normalized_date.strftime("%Y-%m-%dT%H:%M:%S")

                    # Check if sheet already exists for this date
                    existing_sheet = await PatientProgressSheet.find_one(
                        {
                            "patient_id": request.patient_id,
                            "date": date_string,
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing_sheet:
                        raise ValidationError(
                            message="Progress sheet already exists for this date and patient",
                            error_code="SHEET_ALREADY_EXISTS",
                        )

                    # Generate unique sheet ID
                    sheet_id = await PatientProgressSheet.generate_sheet_id()

                    # Create progress sheet
                    progress_sheet = await PatientProgressSheet.create(
                        sheet_id=sheet_id,
                        patient_id=request.patient_id,
                        date=date_string,
                        entries=request.entries or [],
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        organisation_id=organisation_id,
                        session=session,
                    )

                    # Commit transaction
                    await session.commit_transaction()
                    await ProgressSheetService._invalidate_cache(
                        patient_id=request.patient_id
                    )
                    logger.info(
                        f"Created progress sheet {sheet_id} for patient {request.patient_id}"
                    )
                    entries_schema = await ProgressSheetService._convert_entries_to_schema(
                        progress_sheet.entries
                    )
                    return PatientProgressSheetDetailSchema(
                        id=progress_sheet.id,
                        sheet_id=progress_sheet.sheet_id,
                        patient_id=progress_sheet.patient_id,
                        date=progress_sheet.date,
                        entries=entries_schema,
                        created_at=progress_sheet.created_at,
                        updated_at=progress_sheet.updated_at,
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error creating progress sheet: {e}")
                    raise e

    @staticmethod
    async def get_progress_sheet(
        sheet_id: str,
        current_user: dict,
    ) -> PatientProgressSheetDetailSchema:
        """Get a progress sheet by ID"""
        cache_key = f"{ProgressSheetService.CACHE_KEY_PREFIX}:{sheet_id}"
        cached_data = await cache.get(cache_key)
        if cached_data:
            return PatientProgressSheetDetailSchema.model_validate(cached_data)

        # Get progress sheet from database
        progress_sheet = await PatientProgressSheet.find_one(
            {
                "sheet_id": sheet_id,
                "is_active": True,
                "is_deleted": False,
            }
        )
        if not progress_sheet:
            raise NotFoundError("Progress sheet not found")

        # Convert entries to schema objects
        entries_schema = await ProgressSheetService._convert_entries_to_schema(
            progress_sheet.entries
        )

        response = PatientProgressSheetDetailSchema(
            id=str(progress_sheet.id),
            sheet_id=progress_sheet.sheet_id,
            patient_id=progress_sheet.patient_id,
            date=progress_sheet.date,
            entries=entries_schema,
            created_at=progress_sheet.created_at,
            updated_at=progress_sheet.updated_at,
        )

        await cache.set(
            cache_key, response.model_dump(), ProgressSheetService.CACHE_TIMEOUT
        )
        return response

    @staticmethod
    async def get_progress_sheet_by_patient_id_and_date(
        patient_id: str,
        date: datetime,
        current_user: dict,
    ) -> PatientProgressSheetDetailSchema:
        """Get a progress sheet by patient ID and date"""
        if isinstance(date, str):
            try:
                parsed_date = datetime.strptime(date, "%Y-%m-%d")
            except ValueError:
                raise ValidationError(
                    message="Invalid date format. Please use YYYY-MM-DD format.",
                    error_code="INVALID_DATE_FORMAT",
                )
        else:
            parsed_date = date

        # Convert to UTC and set time to 00:00:00
        # If parsed_date is naive (no timezone), assume it's in UTC
        if parsed_date.tzinfo is None:
            parsed_date = parsed_date.replace(tzinfo=UTC)
        
        start_of_day = parsed_date.replace(
            hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC
        )

        # Convert to string format for query (YYYY-MM-DDTHH:MM:SS)
        # Since we always store dates normalized to 00:00:00, we can query for exact match
        date_string = start_of_day.strftime("%Y-%m-%dT%H:%M:%S")

        cache_key = f"{ProgressSheetService.PATIENT_SHEETS_CACHE_KEY_PREFIX}:{patient_id}:{parsed_date.strftime('%Y-%m-%d')}"
        cached_data = await cache.get(cache_key)
        if cached_data:
            return PatientProgressSheetDetailSchema.model_validate(cached_data)

        # Get progress sheet from database using exact match
        # Since dates are stored as "YYYY-MM-DDTHH:MM:SS" with time always 00:00:00,
        # we can use exact match
        progress_sheet = await PatientProgressSheet.find_one(
            {
                "patient_id": patient_id,
                "date": date_string,
                "is_active": True,
                "is_deleted": False,
            }
        )
        
        # If exact match doesn't work, try range query as fallback
        if not progress_sheet:
            end_of_day = start_of_day.replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
            end_of_day_str = end_of_day.strftime("%Y-%m-%dT%H:%M:%S")
            progress_sheet = await PatientProgressSheet.find_one(
                {
                    "patient_id": patient_id,
                    "date": {"$gte": date_string, "$lte": end_of_day_str},
                    "is_active": True,
                    "is_deleted": False,
                }
            )

        if not progress_sheet:
            raise NotFoundError("Progress sheet not found")

        # Convert entries to schema objects
        entries_schema = await ProgressSheetService._convert_entries_to_schema(
            progress_sheet.entries
        )

        response = PatientProgressSheetDetailSchema(
            id=str(progress_sheet.id),
            sheet_id=progress_sheet.sheet_id,
            patient_id=progress_sheet.patient_id,
            date=progress_sheet.date,
            entries=entries_schema,
            created_at=progress_sheet.created_at,
            updated_at=progress_sheet.updated_at,
        )

        await cache.set(
            cache_key, response.model_dump(), ProgressSheetService.CACHE_TIMEOUT
        )
        return response

    @staticmethod
    async def get_fluid_data_by_date(
        patient_id: str,
        date: str,
        current_user: dict,
        final_only: bool = True,
    ) -> FluidDataByDateResponse:
        """Get all fluid data from a progress sheet for a patient on a given date"""
        # Parse date
        if isinstance(date, str):
            try:
                parsed_date = datetime.strptime(date, "%Y-%m-%d")
            except ValueError:
                raise ValidationError(
                    message="Invalid date format. Please use YYYY-MM-DD format.",
                    error_code="INVALID_DATE_FORMAT",
                )
        else:
            parsed_date = date

        if parsed_date.tzinfo is None:
            parsed_date = parsed_date.replace(tzinfo=UTC)

        start_of_day = parsed_date.replace(
            hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC
        )
        date_string = start_of_day.strftime("%Y-%m-%dT%H:%M:%S")

        # Find progress sheet
        progress_sheet = await PatientProgressSheet.find_one(
            {
                "patient_id": patient_id,
                "date": date_string,
                "is_active": True,
                "is_deleted": False,
            }
        )

        # Fallback: range query
        if not progress_sheet:
            end_of_day = start_of_day.replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
            end_of_day_str = end_of_day.strftime("%Y-%m-%dT%H:%M:%S")
            progress_sheet = await PatientProgressSheet.find_one(
                {
                    "patient_id": patient_id,
                    "date": {"$gte": date_string, "$lte": end_of_day_str},
                    "is_active": True,
                    "is_deleted": False,
                }
            )

        if not progress_sheet:
            raise NotFoundError("Progress sheet not found for this date")

        # Extract fluid data from each entry
        fluid_entries = []
        grand_total_input = 0.0
        grand_total_output = 0.0

        for entry in progress_sheet.entries:
            if entry.parameters and entry.parameters.fluid:
                fluid = entry.parameters.fluid

                if fluid.total_input is not None:
                    grand_total_input += fluid.total_input
                if fluid.total_output is not None:
                    grand_total_output += fluid.total_output

                # Skip building detailed entries when final_only is requested
                if not final_only:
                    fluid_schema = FluidSectionSchema(
                        infusions=[
                            InfusionEntrySchema(name=i.name, quantity=i.quantity)
                            for i in fluid.infusions
                        ] if fluid.infusions else [],
                        intakes=[
                            IntakeEntrySchema(name=i.name, quantity=i.quantity)
                            for i in fluid.intakes
                        ] if fluid.intakes else [],
                        outputs=[
                            OutputEntrySchema(name=o.name, quantity=o.quantity)
                            for o in fluid.outputs
                        ] if fluid.outputs else [],
                        other_infusions=[
                            OtherInfusionEntrySchema(name=i.name, quantity=i.quantity)
                            for i in fluid.other_infusions
                        ] if fluid.other_infusions else [],
                        colloids=[
                            ColloidEntrySchema(name=c.name, quantity=c.quantity)
                            for c in fluid.colloids
                        ] if fluid.colloids else [],
                        crystalloids=[
                            CrystalloidEntrySchema(name=c.name, quantity=c.quantity)
                            for c in fluid.crystalloids
                        ] if fluid.crystalloids else [],
                        oral_intakes=[
                            OralIntakeEntrySchema(name=i.name, quantity=i.quantity)
                            for i in fluid.oral_intakes
                        ] if fluid.oral_intakes else [],
                        ryles_tubes=[
                            RylesTubeEntrySchema(name=r.name, quantity=r.quantity)
                            for r in fluid.ryles_tubes
                        ] if fluid.ryles_tubes else [],
                        urines=[
                            UrinesEntrySchema(name=u.name, quantity=u.quantity)
                            for u in fluid.urines
                        ] if fluid.urines else [],
                        drainages=[
                            DrainageEntrySchema(name=d.name, quantity=d.quantity)
                            for d in fluid.drainages
                        ] if fluid.drainages else [],
                        total_input=fluid.total_input,
                        total_output=fluid.total_output,
                        cumulative_balance=fluid.cumulative_balance,
                    )

                    fluid_entries.append(
                        FluidEntryWithTimeSchema(
                            time=entry.time,
                            fluid=fluid_schema,
                        )
                    )

        # Sort entries by time (only relevant when not final_only)
        if not final_only:
            fluid_entries.sort(key=lambda x: x.time)

        return FluidDataByDateResponse(
            patient_id=progress_sheet.patient_id,
            date=parsed_date.strftime("%Y-%m-%d"),
            sheet_id=None if final_only else progress_sheet.sheet_id,
            entries=None if final_only else fluid_entries,
            total_input=grand_total_input if grand_total_input > 0 else None,
            total_output=grand_total_output if grand_total_output > 0 else None,
            cumulative_balance=(grand_total_input - grand_total_output)
            if (grand_total_input > 0 or grand_total_output > 0)
            else None,
        )

    @staticmethod
    async def get_or_create_progress_sheet(
        patient_id: str,
        date: datetime,
        organisation_id: str,
        current_user: dict,
    ) -> PatientProgressSheetDetailSchema:
        """Get or create a progress sheet by patient ID and date"""
        async with await PatientProgressSheet.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Parse date if it's a string
                    if isinstance(date, str):
                        try:
                            parsed_date = datetime.strptime(date, "%Y-%m-%d")
                        except ValueError:
                            raise ValidationError(
                                message="Invalid date format. Please use YYYY-MM-DD format.",
                                error_code="INVALID_DATE_FORMAT",
                            )
                    else:
                        parsed_date = date

                    # Convert to UTC and set time to 00:00:00
                    if parsed_date.tzinfo is None:
                        parsed_date = parsed_date.replace(tzinfo=UTC)
                    
                    start_of_day = parsed_date.replace(
                        hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC
                    )
                    date_string = start_of_day.strftime("%Y-%m-%dT%H:%M:%S")

                    # Check cache first
                    cache_key = f"{ProgressSheetService.PATIENT_SHEETS_CACHE_KEY_PREFIX}:{patient_id}:{parsed_date.strftime('%Y-%m-%d')}"
                    cached_data = await cache.get(cache_key)
                    if cached_data:
                        return PatientProgressSheetDetailSchema.model_validate(cached_data)

                    # Normalize organisation_id - handle string "None" case
                    effective_organisation_id = None if organisation_id in (None, "None", "null") else organisation_id
                    
                    # Validate patient exists
                    patient_query = {
                        "_id": ObjectId(patient_id),
                        "is_active": True,
                        "is_deleted": False,
                    }
                    # Only filter by organisation_id if it's not None
                    if effective_organisation_id is not None:
                        patient_query["organisation_id"] = effective_organisation_id
                    
                    patient = await Patient.find_one(patient_query)
                    if not patient:
                        raise NotFoundError("Patient not found")
                    
                    # Validate progress sheet date: must be on admission_date or after (not before)
                    progress_sheet_date = start_of_day.date()
                    if progress_sheet_date < patient.admission_date:
                        raise ValidationError(
                            message=f"Progress sheet date ({progress_sheet_date}) cannot be before patient admission date ({patient.admission_date})",
                            error_code="INVALID_PROGRESS_SHEET_DATE",
                        )

                    # Try to get existing sheet within transaction
                    sheet_query = {
                        "patient_id": patient_id,
                        "date": date_string,
                        "is_active": True,
                        "is_deleted": False,
                    }
                    # Only filter by organisation_id if it's not None
                    if effective_organisation_id is not None:
                        sheet_query["organisation_id"] = effective_organisation_id
                    
                    progress_sheet = await PatientProgressSheet.find_one(sheet_query)

                    # If sheet exists, return it
                    if progress_sheet:
                        # Convert entries to schema objects
                        entries_schema = await ProgressSheetService._convert_entries_to_schema(
                            progress_sheet.entries
                        )

                        response = PatientProgressSheetDetailSchema(
                            id=str(progress_sheet.id),
                            sheet_id=progress_sheet.sheet_id,
                            patient_id=progress_sheet.patient_id,
                            date=progress_sheet.date,
                            entries=entries_schema,
                            created_at=progress_sheet.created_at,
                            updated_at=progress_sheet.updated_at,
                        )

                        await session.commit_transaction()
                        await cache.set(
                            cache_key,
                            response.model_dump(),
                            ProgressSheetService.CACHE_TIMEOUT,
                        )
                        return response

                    # Sheet doesn't exist, create it
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    # Generate unique sheet ID
                    sheet_id = await PatientProgressSheet.generate_sheet_id()

                    # Create progress sheet (use effective_organisation_id)
                    progress_sheet = await PatientProgressSheet.create(
                        sheet_id=sheet_id,
                        patient_id=patient_id,
                        date=date_string,
                        entries=[],
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        organisation_id=effective_organisation_id,
                        session=session,
                    )

                    # Commit transaction
                    await session.commit_transaction()
                    
                    # Invalidate cache
                    await ProgressSheetService._invalidate_cache(
                        patient_id=patient_id
                    )

                    logger.info(
                        f"Created progress sheet {sheet_id} for patient {patient_id} (get_or_create)"
                    )

                    # Convert entries to schema objects
                    entries_schema = await ProgressSheetService._convert_entries_to_schema(
                        progress_sheet.entries
                    )

                    response = PatientProgressSheetDetailSchema(
                        id=str(progress_sheet.id),
                        sheet_id=progress_sheet.sheet_id,
                        patient_id=progress_sheet.patient_id,
                        date=progress_sheet.date,
                        entries=entries_schema,
                        created_at=progress_sheet.created_at,
                        updated_at=progress_sheet.updated_at,
                    )

                    # Cache the response
                    await cache.set(
                        cache_key,
                        response.model_dump(),
                        ProgressSheetService.CACHE_TIMEOUT,
                    )

                    return response

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error in get_or_create_progress_sheet: {e}")
                    raise e

    @staticmethod
    async def get_progress_sheets(
        filter_params: ProgressSheetFilterParams,
        current_user: dict,
    ) -> dict:
        """Get progress sheets with filters"""
        encrypted_user_type = current_user["ut"]
        user_type = UserType(decrypt_user_type(encrypted_user_type))

        cache_key_parts = [
            ProgressSheetService.LIST_CACHE_KEY_PREFIX,
            str(filter_params.page),
            str(filter_params.limit),
            filter_params.patient_id or "all",
            str(filter_params.from_date) if filter_params.from_date else "none",
            str(filter_params.to_date) if filter_params.to_date else "none",
            filter_params.organisation_id or "all",
        ]
        cache_key = ":".join(cache_key_parts)

        cached_result = await cache.get(cache_key)
        if cached_result:
            return cached_result

        # Build filter query
        filter_query = {
            "is_active": True,
            "is_deleted": False,
        }

        if UserType.requires_organisation_id(user_type):
            if (
                hasattr(filter_params, "organisation_id")
                and filter_params.organisation_id
            ):
                filter_query["organisation_id"] = filter_params.organisation_id
        else:
            filter_query["organisation_id"] = current_user["oid"]

        if filter_params.patient_id:
            filter_query["patient_id"] = filter_params.patient_id

        if filter_params.from_date or filter_params.to_date:
            date_filter = {}
            if filter_params.from_date:
                # Convert datetime to string format: YYYY-MM-DDTHH:MM:SS
                from_date_normalized = filter_params.from_date.replace(
                    hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC
                )
                date_filter["$gte"] = from_date_normalized.strftime("%Y-%m-%dT%H:%M:%S")
            if filter_params.to_date:
                # Convert datetime to string format: YYYY-MM-DDTHH:MM:SS
                to_date_normalized = filter_params.to_date.replace(
                    hour=23, minute=59, second=59, microsecond=999999, tzinfo=UTC
                )
                date_filter["$lte"] = to_date_normalized.strftime("%Y-%m-%dT%H:%M:%S")
            filter_query["date"] = date_filter

        skip = (filter_params.page - 1) * filter_params.limit
        sort_field = filter_params.sort_by or "created_at"
        sort_order = 1 if filter_params.sort_order == "asc" else -1

        pipeline = [
            {"$match": filter_query},
            {"$sort": {sort_field: sort_order}},
            {
                "$facet": {
                    "metadata": [{"$count": "total"}],
                    "data": [
                        {"$skip": skip},
                        {"$limit": filter_params.limit},
                    ],
                }
            },
        ]

        result = (
            await PatientProgressSheet.get_collection()
            .aggregate(pipeline)
            .to_list(length=1)
        )

        result = result[0] if result else {"metadata": [{"total": 0}], "data": []}

        total = result["metadata"][0]["total"] if result["metadata"] else 0

        sheets = []

        for sheet in result["data"]:
            # Convert entries to schema objects
            entries_schema = await ProgressSheetService._convert_entries_to_schema(
                PatientProgressSheet.model_validate(sheet).entries
            )

            sheet_data = PatientProgressSheetDetailSchema(
                id=str(sheet["_id"]),
                sheet_id=sheet["sheet_id"],
                patient_id=sheet["patient_id"],
                date=sheet["date"],
                entries=entries_schema,
                created_at=sheet["created_at"],
                updated_at=sheet["updated_at"],
            ).model_dump(mode="json")

            sheets.append(sheet_data)

        pages = (total + filter_params.limit - 1) // filter_params.limit
        has_next = filter_params.page < pages
        has_prev = filter_params.page > 1

        response = {
            "items": sheets,
            "total": total,
            "page": filter_params.page,
            "limit": filter_params.limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }

        await cache.set(cache_key, response, ProgressSheetService.CACHE_TIMEOUT)
        return response

    @staticmethod
    async def add_gcs_entry(
        sheet_id: str,
        time: str,
        gcs_data: GCSSectionSchema,
        current_user: dict,
    ) -> PatientProgressSheetDetailSchema:
        """Add a GCS entry to a progress sheet"""
        async with await PatientProgressSheet.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:

                    # Validate and get existing entry if any
                    progress_sheet_obj, existing_entry = (
                        await ProgressSheetService._validate_and_get_entry(
                            sheet_id=sheet_id,
                            time=time,
                        )
                    )

                    # Create or update query
                    if existing_entry:
                        # Update existing entry
                        existing_entry.parameters.gcs = gcs_data.values
                        existing_entry.recorded_by = str(current_user["sub"])
                        existing_entry.recorded_at = datetime.now(UTC)
                    else:
                        new_entry = ProgressEntry(
                            time=time,
                            parameters=ProgressParameterGroup(gcs=gcs_data.values),
                            recorded_by=str(current_user["sub"]),
                            recorded_at=datetime.now(UTC),
                        )
                        progress_sheet_obj.entries.append(new_entry)

                    # Update audit fields
                    progress_sheet_obj.updated_by = str(current_user["sub"])
                    progress_sheet_obj.updated_by_profile = str(current_user["pid"])
                    await progress_sheet_obj.save()

                    # Commit transaction
                    await session.commit_transaction()
                    await ProgressSheetService._invalidate_cache(sheet_id=sheet_id)

                    # Convert entries to schema objects
                    entries_schema = (
                        await ProgressSheetService._convert_entries_to_schema(
                            progress_sheet_obj.entries
                        )
                    )

                    return PatientProgressSheetDetailSchema(
                        id=str(progress_sheet_obj.id),
                        sheet_id=progress_sheet_obj.sheet_id,
                        patient_id=progress_sheet_obj.patient_id,
                        date=progress_sheet_obj.date,
                        entries=entries_schema,
                        created_at=progress_sheet_obj.created_at,
                        updated_at=progress_sheet_obj.updated_at,
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error adding GCS entry: {e}")
                    raise e

    @staticmethod
    async def add_fluid_entry(
        sheet_id: str,
        time: str,
        fluid_data: FluidSectionSchema,
        current_user: dict,
    ) -> PatientProgressSheetDetailSchema:
        """Add a fluid entry to a progress sheet"""
        async with await PatientProgressSheet.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Validate and get existing entry if any
                    progress_sheet, existing_entry = (
                        await ProgressSheetService._validate_and_get_entry(
                            sheet_id=sheet_id,
                            time=time,
                        )
                    )

                    # Convert schema objects to model objects
                    infusions = (
                        [
                            InfusionEntry(
                                name=infusion.name,
                                quantity=infusion.quantity,
                            )
                            for infusion in fluid_data.infusions
                        ]
                        if fluid_data.infusions
                        else []
                    )

                    intakes = (
                        [
                            IntakeEntry(name=intake.name, quantity=intake.quantity)
                            for intake in fluid_data.intakes
                        ]
                        if fluid_data.intakes
                        else []
                    )

                    outputs = (
                        [
                            OutputEntry(name=output.name, quantity=output.quantity)
                            for output in fluid_data.outputs
                        ]
                        if fluid_data.outputs
                        else []
                    )

                    other_infusions = (
                        [
                            OtherInfusionEntry(
                                name=infusion.name, quantity=infusion.quantity
                            )
                            for infusion in fluid_data.other_infusions
                        ]
                        if fluid_data.other_infusions
                        else []
                    )

                    colloids = (
                        [
                            ColloidEntry(name=colloid.name, quantity=colloid.quantity)
                            for colloid in fluid_data.colloids
                        ]
                        if fluid_data.colloids
                        else []
                    )

                    crystalloids = (
                        [
                            CrystalloidEntry(
                                name=crystalloid.name, quantity=crystalloid.quantity
                            )
                            for crystalloid in fluid_data.crystalloids
                        ]
                        if fluid_data.crystalloids
                        else []
                    )

                    oral_intakes = (
                        [
                            OralIntakeEntry(name=intake.name, quantity=intake.quantity)
                            for intake in fluid_data.oral_intakes
                        ]
                        if fluid_data.oral_intakes
                        else []
                    )

                    ryles_tubes = (
                        [
                            RylesTubeEntry(name=tube.name, quantity=tube.quantity)
                            for tube in fluid_data.ryles_tubes
                        ]
                        if fluid_data.ryles_tubes
                        else []
                    )

                    urines = (
                        [
                            UrinesEntry(name=urine.name, quantity=urine.quantity)
                            for urine in fluid_data.urines
                        ]
                        if fluid_data.urines
                        else []
                    )

                    drainages = (
                        [
                            DrainageEntry(
                                name=drainage.name, quantity=drainage.quantity
                            )
                            for drainage in fluid_data.drainages
                        ]
                        if fluid_data.drainages
                        else []
                    )

                    # Create or update query
                    if existing_entry:
                        # Update existing entry
                        existing_entry.parameters.fluid = FluidParametersModel(
                            infusions=infusions,
                            intakes=intakes,
                            outputs=outputs,
                            other_infusions=other_infusions,
                            colloids=colloids,
                            crystalloids=crystalloids,
                            oral_intakes=oral_intakes,
                            ryles_tubes=ryles_tubes,
                            urines=urines,
                            drainages=drainages,
                            total_input=fluid_data.total_input,
                            total_output=fluid_data.total_output,
                            cumulative_balance=fluid_data.cumulative_balance,
                        )
                        existing_entry.recorded_by = str(current_user["sub"])
                        existing_entry.recorded_at = datetime.now(UTC)
                    else:
                        new_entry = ProgressEntry(
                            time=time,
                            parameters=ProgressParameterGroup(
                                fluid=FluidParametersModel(
                                    infusions=infusions,
                                    intakes=intakes,
                                    outputs=outputs,
                                    other_infusions=other_infusions,
                                    colloids=colloids,
                                    crystalloids=crystalloids,
                                    oral_intakes=oral_intakes,
                                    ryles_tubes=ryles_tubes,
                                    urines=urines,
                                    drainages=drainages,
                                    total_input=fluid_data.total_input,
                                    total_output=fluid_data.total_output,
                                    cumulative_balance=fluid_data.cumulative_balance,
                                )
                            ),
                            recorded_by=str(current_user["sub"]),
                            recorded_at=datetime.now(UTC),
                        )
                        progress_sheet.entries.append(new_entry)

                    # Update audit fields
                    progress_sheet.updated_by = str(current_user["sub"])
                    progress_sheet.updated_by_profile = str(current_user["pid"])
                    await progress_sheet.save()

                    # Commit transaction
                    await session.commit_transaction()
                    await ProgressSheetService._invalidate_cache(sheet_id=sheet_id)

                    # Convert entries to schema objects
                    entries_schema = (
                        await ProgressSheetService._convert_entries_to_schema(
                            progress_sheet.entries
                        )
                    )

                    # Ensure date is in UTC and format it consistently
                    return PatientProgressSheetDetailSchema(
                        id=str(progress_sheet.id),
                        sheet_id=progress_sheet.sheet_id,
                        patient_id=progress_sheet.patient_id,
                        date=progress_sheet.date,
                        entries=entries_schema,
                        created_at=progress_sheet.created_at,
                        updated_at=progress_sheet.updated_at,
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error adding fluid entry: {e}")
                    raise e

    @staticmethod
    async def add_vitals_entry(
        sheet_id: str,
        time: str,
        vitals_data: VitalsSectionSchema,
        current_user: dict,
    ) -> PatientProgressSheetDetailSchema:
        """Add a vitals entry to a progress sheet"""
        async with await PatientProgressSheet.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Validate and get existing entry if any
                    progress_sheet, existing_entry = (
                        await ProgressSheetService._validate_and_get_entry(
                            sheet_id=sheet_id,
                            time=time,
                        )
                    )

                    # Create or update query
                    if existing_entry:
                        # Update existing entry
                        existing_entry.parameters.vitals = vitals_data.values
                        existing_entry.recorded_by = str(current_user["sub"])
                        existing_entry.recorded_at = datetime.now(UTC)
                    else:
                        new_entry = ProgressEntry(
                            time=time,
                            parameters=ProgressParameterGroup(
                                vitals=vitals_data.values
                            ),
                            recorded_by=str(current_user["sub"]),
                            recorded_at=datetime.now(UTC),
                        )
                        progress_sheet.entries.append(new_entry)

                    # Update audit fields
                    progress_sheet.updated_by = str(current_user["sub"])
                    progress_sheet.updated_by_profile = str(current_user["pid"])
                    await progress_sheet.save()

                    # Commit transaction
                    await session.commit_transaction()
                    await ProgressSheetService._invalidate_cache(sheet_id=sheet_id)

                    # Convert entries to schema objects
                    entries_schema = (
                        await ProgressSheetService._convert_entries_to_schema(
                            progress_sheet.entries
                        )
                    )

                    return PatientProgressSheetDetailSchema(
                        id=str(progress_sheet.id),
                        sheet_id=progress_sheet.sheet_id,
                        patient_id=progress_sheet.patient_id,
                        date=progress_sheet.date,
                        entries=entries_schema,
                        created_at=progress_sheet.created_at,
                        updated_at=progress_sheet.updated_at,
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error adding vitals entry: {e}")
                    raise e

    @staticmethod
    async def add_blood_gas_entry(
        sheet_id: str,
        time: str,
        blood_gas_data: BloodGasSectionSchema,
        current_user: dict,
    ) -> PatientProgressSheetDetailSchema:
        """Add a blood gas entry to a progress sheet"""
        async with await PatientProgressSheet.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Validate and get existing entry if any
                    progress_sheet, existing_entry = (
                        await ProgressSheetService._validate_and_get_entry(
                            sheet_id=sheet_id,
                            time=time,
                        )
                    )

                    # Create or update query
                    if existing_entry:
                        # Update existing entry
                        existing_entry.parameters.blood_gas = blood_gas_data.values
                        existing_entry.recorded_by = str(current_user["sub"])
                        existing_entry.recorded_at = datetime.now(UTC)
                    else:
                        new_entry = ProgressEntry(
                            time=time,
                            parameters=ProgressParameterGroup(
                                blood_gas=blood_gas_data.values
                            ),
                            recorded_by=str(current_user["sub"]),
                            recorded_at=datetime.now(UTC),
                        )
                        progress_sheet.entries.append(new_entry)

                    # Update audit fields
                    progress_sheet.updated_by = str(current_user["sub"])
                    progress_sheet.updated_by_profile = str(current_user["pid"])
                    await progress_sheet.save()

                    # Commit transaction
                    await session.commit_transaction()
                    await ProgressSheetService._invalidate_cache(sheet_id=sheet_id)

                    # Convert entries to schema objects
                    entries_schema = (
                        await ProgressSheetService._convert_entries_to_schema(
                            progress_sheet.entries
                        )
                    )

                    return PatientProgressSheetDetailSchema(
                        id=str(progress_sheet.id),
                        sheet_id=progress_sheet.sheet_id,
                        patient_id=progress_sheet.patient_id,
                        date=progress_sheet.date,
                        entries=entries_schema,
                        created_at=progress_sheet.created_at,
                        updated_at=progress_sheet.updated_at,
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error adding blood gas entry: {e}")
                    raise e

    @staticmethod
    async def add_respiratory_entry(
        sheet_id: str,
        time: str,
        respiratory_data: RespiratorySectionSchema,
        current_user: dict,
    ) -> PatientProgressSheetDetailSchema:
        """Add a respiratory entry to a progress sheet"""
        async with await PatientProgressSheet.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Validate and get existing entry if any
                    progress_sheet, existing_entry = (
                        await ProgressSheetService._validate_and_get_entry(
                            sheet_id=sheet_id,
                            time=time,
                        )
                    )

                    # Create or update query
                    if existing_entry:
                        # Update existing entry
                        existing_entry.parameters.respiratory = respiratory_data.values
                        existing_entry.recorded_by = str(current_user["sub"])
                        existing_entry.recorded_at = datetime.now(UTC)
                    else:
                        new_entry = ProgressEntry(
                            time=time,
                            parameters=ProgressParameterGroup(
                                respiratory=respiratory_data.values
                            ),
                            recorded_by=str(current_user["sub"]),
                            recorded_at=datetime.now(UTC),
                        )
                        progress_sheet.entries.append(new_entry)

                    # Update audit fields
                    progress_sheet.updated_by = str(current_user["sub"])
                    progress_sheet.updated_by_profile = str(current_user["pid"])
                    await progress_sheet.save()

                    # Commit transaction
                    await session.commit_transaction()
                    await ProgressSheetService._invalidate_cache(sheet_id=sheet_id)

                    # Convert entries to schema objects
                    entries_schema = (
                        await ProgressSheetService._convert_entries_to_schema(
                            progress_sheet.entries
                        )
                    )

                    return PatientProgressSheetDetailSchema(
                        id=str(progress_sheet.id),
                        sheet_id=progress_sheet.sheet_id,
                        patient_id=progress_sheet.patient_id,
                        date=progress_sheet.date,
                        entries=entries_schema,
                        created_at=progress_sheet.created_at,
                        updated_at=progress_sheet.updated_at,
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error adding respiratory entry: {e}")
                    raise e

    @staticmethod
    async def add_catheter_entry(
        sheet_id: str,
        time: str,
        catheter_data: CatheterSectionSchema,
        current_user: dict,
    ) -> PatientProgressSheetDetailSchema:
        """Add a catheter entry to a progress sheet"""
        async with await PatientProgressSheet.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Validate and get existing entry if any
                    progress_sheet, existing_entry = (
                        await ProgressSheetService._validate_and_get_entry(
                            sheet_id=sheet_id,
                            time=time,
                        )
                    )

                    # Create or update query
                    if existing_entry:
                        # Update existing entry
                        existing_entry.parameters.catheter = [
                            CatheterEntry(
                                type=entry.type,
                                size=entry.size,
                                site=entry.site,
                                date_of_insertion=entry.date_of_insertion,
                                date_of_removal=entry.date_of_removal,
                                days_in_use=entry.days_in_use,
                            )
                            for entry in catheter_data.entries
                        ]
                        existing_entry.recorded_by = str(current_user["sub"])
                        existing_entry.recorded_at = datetime.now(UTC)
                    else:
                        new_entry = ProgressEntry(
                            time=time,
                            parameters=ProgressParameterGroup(
                                catheter=[
                                    CatheterEntry(
                                        type=entry.type,
                                        size=entry.size,
                                        site=entry.site,
                                        date_of_insertion=entry.date_of_insertion,
                                        date_of_removal=entry.date_of_removal,
                                        days_in_use=entry.days_in_use,
                                    )
                                    for entry in catheter_data.entries
                                ]
                            ),
                            recorded_by=str(current_user["sub"]),
                            recorded_at=datetime.now(UTC),
                        )
                        progress_sheet.entries.append(new_entry)

                    # Update audit fields
                    progress_sheet.updated_by = str(current_user["sub"])
                    progress_sheet.updated_by_profile = str(current_user["pid"])
                    await progress_sheet.save()

                    # Commit transaction
                    await session.commit_transaction()
                    await ProgressSheetService._invalidate_cache(sheet_id=sheet_id)

                    # Convert entries to schema objects
                    entries_schema = (
                        await ProgressSheetService._convert_entries_to_schema(
                            progress_sheet.entries
                        )
                    )

                    return PatientProgressSheetDetailSchema(
                        id=str(progress_sheet.id),
                        sheet_id=progress_sheet.sheet_id,
                        patient_id=progress_sheet.patient_id,
                        date=progress_sheet.date,
                        entries=entries_schema,
                        created_at=progress_sheet.created_at,
                        updated_at=progress_sheet.updated_at,
                    )

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error adding catheter entry: {e}")
                    raise e


progress_sheet_service = ProgressSheetService()
