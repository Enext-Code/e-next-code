import logging
from datetime import date, datetime
from typing import Any, Dict, Optional

from app.base.models import NotFoundError, ValidationError
from app.organisations.models import Organisation, OrganisationICU, OrganisationICUBed
from app.patients.enums import PatientStatus
from app.patients.models import Patient

from .hl7.parser import decode_hl7, parse_hl7_datetime, resolve_progress_sheet_slot
from .models import MonitorBedSnapshot

logger = logging.getLogger(__name__)


def _norm(value: str) -> str:
    return " ".join((value or "").strip().split()).casefold()


class MonitorIngestService:
    @staticmethod
    async def ingest(raw_hl7: str, current_user: dict) -> MonitorBedSnapshot:
        decoded = decode_hl7(raw_hl7)
        message = decoded["messages"][0]
        location = message.get("location") or {}
        hospital_name = (location.get("hospital") or "").strip()
        icu_name = (location.get("icu") or "").strip()
        bed_number = location.get("bed_number")

        if not hospital_name or bed_number is None:
            raise ValidationError(
                message="HL7 has no hospital or bed (need PV1 ICU^^bed^hospital)",
                error_code="HL7_LOCATION_MISSING",
                details=location,
            )

        organisation = await MonitorIngestService._find_organisation(hospital_name)
        if not organisation:
            raise NotFoundError(
                message=f"No remote center named '{hospital_name}'. Create it first.",
                error_code="HOSPITAL_NOT_FOUND",
            )

        icu = await MonitorIngestService._find_icu(organisation.id, icu_name or "ICU")
        if not icu:
            raise NotFoundError(
                message=f"No ICU named '{icu_name or 'ICU'}' in {hospital_name}.",
                error_code="ICU_NOT_FOUND",
            )

        bed = await OrganisationICUBed.find_one(
            {
                "organisation_icu_id": icu.id,
                "bed_number": int(bed_number),
                "is_deleted": False,
            }
        )
        if not bed:
            raise NotFoundError(
                message=f"No bed {bed_number} in {hospital_name} / {icu.name}.",
                error_code="BED_NOT_FOUND",
            )

        patient = await Patient.find_one(
            {
                "organisation_icu_bed_id": bed.id,
                "status": PatientStatus.ADMISSION,
                "is_deleted": False,
                "is_active": True,
            }
        )

        observed_at = message.get("observed_at") or message.get("sent_at")
        progress_sheet_vitals = message.get("progress_sheet_vitals") or {}
        sheet_fields = {
            "progress_sheet_id": None,
            "progress_sheet_date": None,
            "progress_sheet_time": None,
            "progress_sheet_note": None,
        }
        if patient:
            sheet_fields = await MonitorIngestService._write_progress_sheet(
                patient=patient,
                progress_sheet_vitals=progress_sheet_vitals,
                observed_at=observed_at,
                current_user=current_user,
            )
        else:
            sheet_fields["progress_sheet_note"] = (
                "No admitted patient on this bed, so Progress Sheet was not updated"
            )

        payload = {
            "organisation_id": organisation.id,
            "organisation_icu_id": icu.id,
            "organisation_icu_bed_id": bed.id,
            "hospital_name": organisation.name,
            "icu_name": icu.name,
            "bed_number": bed.bed_number,
            "patient_id": patient.id if patient else None,
            "patient_unique_id": patient.unique_id if patient else None,
            "vendor": message.get("vendor") or "mindray",
            "device_mac": message.get("device_mac") or None,
            "device_id": message.get("device_id") or None,
            "message_control_id": message.get("control_id") or None,
            "observed_at": observed_at,
            "vitals": message.get("vitals") or {},
            "progress_sheet_vitals": progress_sheet_vitals,
            "raw_hl7": raw_hl7,
            "updated_by": str(current_user.get("sub") or ""),
            "updated_by_profile": str(current_user.get("pid") or ""),
            **sheet_fields,
        }

        existing = await MonitorBedSnapshot.find_one(
            {
                "organisation_icu_bed_id": bed.id,
                "is_deleted": False,
            }
        )
        if existing:
            await existing.update(payload)
            logger.info(
                "Updated monitor snapshot bed=%s hospital=%s hr=%s spo2=%s",
                bed.bed_number,
                organisation.name,
                (payload["progress_sheet_vitals"] or {}).get("Heart Rate"),
                (payload["progress_sheet_vitals"] or {}).get("SpO2"),
            )
            return existing

        payload["created_by"] = str(current_user.get("sub") or "")
        payload["created_by_profile"] = str(current_user.get("pid") or "")
        snapshot = await MonitorBedSnapshot.create(**payload)
        logger.info(
            "Created monitor snapshot bed=%s hospital=%s",
            bed.bed_number,
            organisation.name,
        )
        return snapshot

    @staticmethod
    async def get_latest_for_patient(patient_id: str) -> Optional[MonitorBedSnapshot]:
        from bson import ObjectId

        patient = None
        try:
            patient = await Patient.find_one(
                {"_id": ObjectId(patient_id), "is_deleted": False}
            )
        except Exception:
            patient = None
        if not patient:
            patient = await Patient.find_one(
                {"unique_id": patient_id, "is_deleted": False}
            )
        if not patient:
            return None
        if patient.organisation_icu_bed_id:
            snapshot = await MonitorBedSnapshot.find_one(
                {
                    "organisation_icu_bed_id": patient.organisation_icu_bed_id,
                    "is_deleted": False,
                }
            )
            if snapshot:
                return snapshot
        return await MonitorBedSnapshot.find_one(
            {"patient_id": str(patient.id), "is_deleted": False}
        )

    @staticmethod
    async def _find_organisation(hospital_name: str) -> Optional[Organisation]:
        wanted = _norm(hospital_name)
        orgs = await Organisation.find({"is_deleted": False}, limit=500)
        for org in orgs:
            if _norm(org.name) == wanted or _norm(org.unique_id) == wanted:
                return org
        return None

    @staticmethod
    async def _find_icu(organisation_id: str, icu_name: str) -> Optional[OrganisationICU]:
        wanted = _norm(icu_name)
        icus = await OrganisationICU.find(
            {"organisation_id": organisation_id, "is_deleted": False},
            limit=200,
        )
        for icu in icus:
            if _norm(icu.name) == wanted:
                return icu
        if len(icus) == 1:
            return icus[0]
        return None

    @staticmethod
    def _admission_date(patient: Patient) -> date:
        value = patient.admission_date
        if isinstance(value, datetime):
            return value.date()
        return value

    @staticmethod
    def _as_vital_value(value: str):
        try:
            number = float(value)
            return int(number) if number.is_integer() else number
        except (TypeError, ValueError):
            return value

    @staticmethod
    async def _write_progress_sheet(
        patient: Patient,
        progress_sheet_vitals: Dict[str, str],
        observed_at: Optional[str],
        current_user: dict,
    ) -> Dict[str, Optional[str]]:
        from app.investigation_reports.enums import VitalParameter
        from app.investigation_reports.schemas.progress_sheet import VitalsSectionSchema
        from app.investigation_reports.services.progress_sheet_service import (
            ProgressSheetService,
        )

        empty = {
            "progress_sheet_id": None,
            "progress_sheet_date": None,
            "progress_sheet_time": None,
            "progress_sheet_note": None,
        }
        if not progress_sheet_vitals:
            empty["progress_sheet_note"] = "No mapped vitals to write on Progress Sheet"
            return empty

        try:
            observed = parse_hl7_datetime(observed_at or "")
            sheet_date, slot, note = resolve_progress_sheet_slot(
                observed, MonitorIngestService._admission_date(patient)
            )
            sheet = await ProgressSheetService.get_or_create_progress_sheet(
                patient_id=str(patient.id),
                date=sheet_date.isoformat(),
                organisation_id=patient.organisation_id,
                current_user=current_user,
            )

            preserve = {VitalParameter.RYTHM, VitalParameter.RBS}
            merged: Dict[Any, Any] = {}
            for entry in sheet.entries or []:
                if entry.time != slot or not entry.vitals or not entry.vitals.values:
                    continue
                for key, value in entry.vitals.values.items():
                    try:
                        param = (
                            key
                            if isinstance(key, VitalParameter)
                            else VitalParameter(str(key))
                        )
                    except ValueError:
                        continue
                    merged[param] = value
                break

            for label, value in progress_sheet_vitals.items():
                try:
                    param = VitalParameter(label)
                except ValueError:
                    continue
                if param in preserve:
                    continue
                merged[param] = MonitorIngestService._as_vital_value(value)

            await ProgressSheetService.add_vitals_entry(
                sheet_id=sheet.sheet_id,
                time=slot,
                vitals_data=VitalsSectionSchema(values=merged),
                current_user=current_user,
            )
            logger.info(
                "Wrote monitor vitals to progress sheet %s date=%s time=%s patient=%s",
                sheet.sheet_id,
                sheet_date.isoformat(),
                slot,
                patient.unique_id,
            )
            return {
                "progress_sheet_id": sheet.sheet_id,
                "progress_sheet_date": sheet_date.isoformat(),
                "progress_sheet_time": slot,
                "progress_sheet_note": note,
            }
        except Exception as exc:
            logger.exception("Failed to write monitor vitals to progress sheet")
            empty["progress_sheet_note"] = f"Progress Sheet was not updated: {exc}"
            return empty
