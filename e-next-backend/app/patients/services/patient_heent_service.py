from app.base.models import DuplicateError, NotFoundError

from ..models import PatientHeent


class PatientHeentService:
    """Patient heent service"""

    @staticmethod
    async def get_patient_heent(patient_id: str) -> PatientHeent:
        """Get patient heent by ID"""
        patient_heent = await PatientHeent.find_one(
            {
                "patient_id": patient_id,
                "is_active": True,
                "is_deleted": False,
            }
        )

        if not patient_heent:
            raise NotFoundError("Patient heent not found")

        return patient_heent

    @staticmethod
    async def create_patient_heent(
        patient_heent_data: dict, current_user: dict
    ) -> PatientHeent:
        """Create patient heent"""
        async with await PatientHeent.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])
                    organisation_id = patient_heent_data["organisation_id"]

                    # Check for existing patient heent
                    existing = await PatientHeent.find_one(
                        {
                            "patient_id": patient_heent_data["patient_id"],
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if existing:
                        raise DuplicateError("Patient heent already exists")

                    patient_heent = await PatientHeent.create(
                        **patient_heent_data,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        session=session,
                    )

                    await session.commit_transaction()
                    return patient_heent
                except Exception as e:
                    await session.abort_transaction()
                    raise e

    @staticmethod
    async def update_patient_heent(
        patient_id: str, patient_heent_data: dict, current_user: dict
    ) -> PatientHeent:
        """Update patient heent"""
        async with await PatientHeent.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    update_data = {
                        **patient_heent_data,
                        "updated_by": updated_by,
                        "updated_by_profile": updated_by_profile,
                    }
                    update_data = {
                        k: v for k, v in update_data.items() if v is not None
                    }

                    # Check for existing patient heent
                    existing = await PatientHeent.find_one(
                        {
                            "patient_id": patient_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not existing:
                        raise NotFoundError("Patient heent not found")

                    # Update patient heent
                    await existing.update(update_data)

                    # Commit transaction
                    await session.commit_transaction()
                    return existing
                except Exception as e:
                    await session.abort_transaction()
                    raise e


patient_heent_service = PatientHeentService()
