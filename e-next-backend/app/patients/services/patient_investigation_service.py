from app.base.models import DuplicateError, NotFoundError

from ..enums import (RADIOLOGY_SUBTYPES, ArterialAnalysis, BloodAnalysis,
                     Microbiology, Radiology)
from ..models import PatientInvestigation


class PatientInvestigationService:
    """Patient investigation service"""

    @staticmethod
    def build_investigation_response(
        patient_investigation: PatientInvestigation,
    ) -> dict:
        """Build investigation response"""
        return {
            "blood_analysis": {
                "options": [e.value for e in BloodAnalysis],
                "selected": [
                    e.value
                    for e in getattr(patient_investigation, "blood_analysis", [])
                ],
            },
            "radiology": {
                "options": [
                    {"type": r.value, "subtypes": RADIOLOGY_SUBTYPES[r]}
                    for r in Radiology
                ],
                "selected": [
                    {"type": r.type.value, "subtypes": r.subtypes}
                    for r in getattr(patient_investigation, "radiology", [])
                ],
            },
            "microbiology": {
                "options": [e.value for e in Microbiology],
                "selected": [
                    e.value for e in getattr(patient_investigation, "microbiology", [])
                ],
            },
            "arterial_analysis": {
                "options": [e.value for e in ArterialAnalysis],
                "selected": [
                    e.value
                    for e in getattr(patient_investigation, "arterial_analysis", [])
                ],
            },
        }

    @staticmethod
    async def get_patient_investigation(patient_id: str) -> dict:
        """Get patient investigation by ID"""
        patient_investigation = await PatientInvestigation.find_one(
            {
                "patient_id": patient_id,
                "is_active": True,
                "is_deleted": False,
            }
        )

        if not patient_investigation:
            raise NotFoundError("Patient investigation not found")

        return patient_investigation

    @staticmethod
    async def create_patient_investigation(
        patient_investigation_data: dict, current_user: dict
    ) -> PatientInvestigation:
        """Create patient investigation"""
        async with await PatientInvestigation.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = patient_investigation_data["organisation_id"]

                    # Check for existing patient investigation
                    existing = await PatientInvestigation.find_one(
                        {
                            "patient_id": patient_investigation_data["patient_id"],
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing:
                        raise DuplicateError("Patient investigation already exists")

                    patient_investigation = await PatientInvestigation.create(
                        **patient_investigation_data,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                    )

                    await session.commit_transaction()
                    return patient_investigation
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def update_patient_investigation(
        patient_id: str, patient_investigation_data: dict, current_user: dict
    ) -> PatientInvestigation:
        """Update patient investigation"""
        async with await PatientInvestigation.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    update_data = {
                        **patient_investigation_data,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }
                    update_data = {
                        k: v for k, v in update_data.items() if v is not None
                    }

                    # Check for existing patient investigation
                    existing = await PatientInvestigation.find_one(
                        {
                            "patient_id": patient_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Patient investigation not found")

                    await existing.update(update_data)

                    await session.commit_transaction()
                    return existing
                except Exception as e:
                    await session.abort_transaction()
                    raise e


patient_investigation_service = PatientInvestigationService()
