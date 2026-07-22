from fastapi import APIRouter

from .endpoints import (apache_ii_router, opd_patient_router,
                        patient_catheter_router, patient_heent_router,
                        patient_investigation_router,
                        patient_past_medical_history_router, patient_router)

router = APIRouter()

router.include_router(patient_router, prefix="/patients", tags=["Patients"])

router.include_router(
    opd_patient_router, prefix="/opd-patients", tags=["OPD Patients"]
)

router.include_router(
    patient_catheter_router,
    prefix="/patient-catheters",
    tags=["Patient Catheters"],
)

router.include_router(
    patient_past_medical_history_router,
    prefix="/patient-past-medical-history",
    tags=["Patient Past Medical History"],
)

router.include_router(
    patient_heent_router, prefix="/patient-heent", tags=["Patient Heent"]
)

router.include_router(
    patient_investigation_router,
    prefix="/patient-investigation",
    tags=["Patient Investigation"],
)

router.include_router(
    apache_ii_router,
    prefix="/apache-ii",
    tags=["APACHE II Score"],
)


__all__ = ["router"]
