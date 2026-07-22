from .discharge_report_crud_service import DischargeReportCRUDService
from .opd_patient_service import OPDPatientService
from .patient_catheter_service import PatientCatheterService
from .patient_heent_service import patient_heent_service
from .patient_investigation_service import patient_investigation_service
from .patient_past_medical_history_service import \
    patient_past_medical_history_service
from .patient_service import patient_service

opd_patient_service = OPDPatientService()

__all__ = [
    "DischargeReportCRUDService",
    "patient_service",
    "OPDPatientService",
    "opd_patient_service",
    "PatientCatheterService",
    "patient_heent_service",
    "patient_investigation_service",
    "patient_past_medical_history_service",
]
