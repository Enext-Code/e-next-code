from .apache_ii import router as apache_ii_router
from .opd_patient import router as opd_patient_router
from .patient import router as patient_router
from .patient_catheter import router as patient_catheter_router
from .patient_heent import router as patient_heent_router
from .patient_investigation import router as patient_investigation_router
from .patient_past_medical_history import \
    router as patient_past_medical_history_router

__all__ = [
    "apache_ii_router",
    "opd_patient_router",
    "patient_router",
    "patient_catheter_router",
    "patient_heent_router",
    "patient_investigation_router",
    "patient_past_medical_history_router",
]
