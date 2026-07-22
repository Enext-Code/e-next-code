from app.base.models import DuplicateError, NotFoundError

from ..models import PatientPastMedicalHistory


class PatientPastMedicalHistoryService:
    """Patient past medical history service"""

    @staticmethod
    async def get_patient_past_medical_history(
        patient_id: str,
    ) -> PatientPastMedicalHistory:
        """Get patient past medical history by ID"""
        patient_past_medical_history = await PatientPastMedicalHistory.find_one(
            {
                "patient_id": patient_id,
                "is_active": True,
                "is_deleted": False,
            }
        )

        if not patient_past_medical_history:
            raise NotFoundError("Patient past medical history not found")

        return patient_past_medical_history

    @staticmethod
    async def create_patient_past_medical_history(
        patient_past_medical_history_data: dict, current_user: dict
    ) -> PatientPastMedicalHistory:
        """Create patient past medical history"""
        async with await PatientPastMedicalHistory.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = patient_past_medical_history_data[
                        "organisation_id"
                    ]

                    # Check for existing patient past medical history
                    existing = await PatientPastMedicalHistory.find_one(
                        {
                            "patient_id": patient_past_medical_history_data[
                                "patient_id"
                            ],
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing:
                        raise DuplicateError(
                            "Patient past medical history already exists"
                        )

                    patient_past_medical_history = (
                        await PatientPastMedicalHistory.create(
                            **patient_past_medical_history_data,
                            created_by=created_by,
                            created_by_profile=created_by_profile,
                            updated_by=updated_by,
                            updated_by_profile=updated_by_profile,
                            session=session,
                        )
                    )

                    await session.commit_transaction()
                    return patient_past_medical_history
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def update_patient_past_medical_history(
        patient_id: str, patient_past_medical_history_data: dict, current_user: dict
    ) -> PatientPastMedicalHistory:
        """Update patient past medical history"""
        async with await PatientPastMedicalHistory.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    # Build update data - only exclude None values, keep all other values including empty strings
                    # This ensures all provided fields (including new ones) are saved
                    update_data = {
                        k: v 
                        for k, v in patient_past_medical_history_data.items() 
                        if v is not None
                    }
                    # Add audit fields
                    update_data["updated_by"] = updated_by
                    update_data["updated_by_profile"] = updated_by_profile

                    # Check for existing patient past medical history
                    existing = await PatientPastMedicalHistory.find_one(
                        {
                            "patient_id": patient_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Patient past medical history not found")

                    # Update patient past medical history - $set will add new fields to existing documents
                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    
                    # Reload the updated document to ensure we have the latest data
                    updated = await PatientPastMedicalHistory.find_one(
                        {
                            "patient_id": patient_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    
                    return updated
                except Exception as e:
                    await session.abort_transaction()
                    raise e


patient_past_medical_history_service = PatientPastMedicalHistoryService()
