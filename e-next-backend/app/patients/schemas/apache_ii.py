from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class AdmissionClassification(str, Enum):
    """Admission classification for APACHE II"""
    MEDICAL = "medical"
    EMERGENCY_POST_OPERATIVE = "emergency_post_operative"
    ELECTIVE_POST_OPERATIVE = "elective_post_operative"


class ICUAdmissionReason(str, Enum):
    """ICU admission reasons for APACHE II mortality calculation"""
    ASTHMA_ALLERGY = "asthma_allergy"
    COPD = "copd"
    PULMONARY_EDEMA_NON_CARDIAC = "pulmonary_edema_non_cardiogenic"
    POST_RESPIRATORY_ARREST = "postrespiratory_arrest"
    ASPIRATION_POISONING_TOXIC = "aspiration_poisoning_toxic"
    PULMONARY_EMBOLUS = "pulmonary_embolus"
    INFECTION = "infection"
    NEOPLASM = "neoplasm"
    HYPERTENSION = "hypertension"
    RHYTHM_DISTURBANCE = "rhythm_disturbance"
    CONGESTIVE_HEART_FAILURE = "congestive_heart_failure"
    HEMORRHAGIC_SHOCK_HYPOVOLEMIA = "hemorrhagic_shock_hypovolemia"
    CORONARY_ARTERY_DISEASE = "coronary_artery_disease"
    CABG = "cabg"
    SEPSIS = "sepsis"
    POST_CARDIAC_ARREST = "postcardiac_arrest"
    CARDIOGENIC_SHOCK = "cardiogenic_shock"
    DISSECTING_THORACIC_ABDOMINAL_ANEURYSM = "dissecting_thoracic_abdominal_aneurysm"
    MULTIPLE_TRAUMA = "multiple_trauma"
    HEAD_TRAUMA = "head_trauma"
    SEIZURE_DISORDER = "seizure_disorder"
    ICH_SDH_SAH = "ich_sdh_sah"
    DRUG_OVERDOSE = "drug_overdose"
    DIABETIC_KETOACIDOSIS = "diabetic_ketoacidosis"
    GI_BLEEDING = "gi_bleeding"
    METABOLIC_RENAL = "metabolic_renal"
    RESPIRATORY = "respiratory"
    NEUROLOGIC = "neurologic"
    CARDIOVASCULAR = "cardiovascular"
    GASTROINTESTINAL = "gastrointestinal"
    CHRONIC_CARDIOVASCULAR_DISEASE = "chronic_cardiovascular_disease"
    PERIPHERAL_VASCULAR_SURGERY = "peripheral_vascular_surgery"
    HEART_VALVE_SURGERY = "heart_valve_surgery"
    CRANIOTOMY_FOR_NEOPLASM = "craniotomy_for_neoplasm"
    RENAL_SURGERY_FOR_NEOPLASM = "renal_surgery_for_neoplasm"
    RENAL_TRANSPLANT = "renal_transplant"
    THORACIC_SURGERY_FOR_NEOPLASM = "thoracic_surgery_for_neoplasm"
    CRANIOTOMY_FOR_ICH_SDH_SAH = "craniotomy_for_ich_sdh_sah"
    LAMINECTOMY_AND_OTHER_SPINAL_SURGERY = "laminectomy_and_other_spinal_surgery"
    RESPIRATORY_INSUFFICIENCY_AFTER_OR = "respiratory_insufficiency_after_or"
    GI_PERFORATION_OBSTRUCTION = "gi_perforation_obstruction"
    POST_OP_SEPSIS = "post_op_sepsis"
    POST_OP_POSTARREST = "post_op_postarrest"


class ApacheIIInput(BaseModel):
    """Input schema for APACHE II score calculation"""
    
    # Patient ID (optional - if provided, result will be saved to database)
    patient_id: Optional[str] = Field(None, description="Patient ID (optional - if provided, calculation will be saved)")
    
    # Age
    age: int = Field(..., ge=0, le=150, description="Age in years")
    
    # Glasgow Coma Score
    glasgow_coma_score: int = Field(
        ..., 
        ge=3, 
        le=15, 
        description="Glasgow Coma Score (use lowest value in past 24 hours, if sedated use estimated GCS prior to sedation)"
    )
    
    # Vitals
    temperature: float = Field(
        ..., 
        description="Temperature in Celsius or Fahrenheit (use highest temperature in past 24 hours)"
    )
    temperature_unit: str = Field(
        default="celsius",
        description="Temperature unit: 'celsius' or 'fahrenheit'"
    )
    mean_arterial_pressure: float = Field(
        ..., 
        ge=0, 
        description="Mean Arterial Pressure (MAP) in mmHg"
    )
    heart_rate: int = Field(..., ge=0, description="Heart rate in bpm")
    respiratory_rate: int = Field(..., ge=0, description="Respiratory rate in bpm")
    
    # Oxygenation
    fio2: float = Field(
        ..., 
        ge=21, 
        le=100, 
        description="Fraction of inspired oxygen (FiO2) in percentage. Enter 21% for non-intubated patients"
    )
    pao2: Optional[float] = Field(
        None, 
        ge=0, 
        description="Partial pressure of arterial oxygen (PaO2) in mmHg or kPa"
    )
    pao2_unit: str = Field(
        default="mmHg",
        description="PaO2 unit: 'mmHg' or 'kPa'"
    )
    paco2: Optional[float] = Field(
        None, 
        ge=0, 
        description="Partial pressure of arterial carbon dioxide (PaCO2) in mmHg or kPa"
    )
    paco2_unit: str = Field(
        default="mmHg",
        description="PaCO2 unit: 'mmHg' or 'kPa'"
    )
    atmospheric_pressure: float = Field(
        default=760.0,
        ge=0,
        description="Atmospheric pressure in mmHg or kPa (default 760 mmHg at sea level, required for A-a gradient calculation when FiO2 >= 50%)"
    )
    atmospheric_pressure_unit: str = Field(
        default="mmHg",
        description="Atmospheric pressure unit: 'mmHg' or 'kPa'"
    )
    
    # Arterial pH
    arterial_ph: float = Field(..., ge=6.0, le=8.0, description="Arterial pH")
    
    # Chemistry
    sodium: float = Field(..., ge=0, description="Sodium in mEq/L")
    potassium: float = Field(..., ge=0, description="Potassium in mEq/L")
    creatinine: float = Field(..., ge=0, description="Creatinine in mg/dL or µmol/L")
    creatinine_unit: str = Field(
        default="mg_dl",
        description="Creatinine unit: 'mg_dl' or 'umol_l'"
    )
    acute_renal_failure: bool = Field(
        default=False,
        description="Acute renal failure (Yes/No)"
    )
    
    # Hematology
    hematocrit: float = Field(..., ge=0, le=100, description="Hematocrit in percentage")
    wbc: float = Field(..., ge=0, description="White Blood Cell count in x 10^9/L")
    
    # Chronic health
    severe_organ_insufficiency_or_immunocompromised: bool = Field(
        default=False,
        description="Severe organ system insufficiency or immunocompromised (Yes/No)"
    )
    
    # Admission classification
    admission_classification: AdmissionClassification = Field(
        ...,
        description="Admission classification"
    )
    
    # For mortality calculation
    emergency_surgery: bool = Field(
        default=False,
        description="Patient required emergency surgery (Yes/No)"
    )
    icu_admission_reason: ICUAdmissionReason = Field(
        ...,
        description="Reason for ICU admission (required for mortality calculation)"
    )


class ApacheIIResponse(BaseModel):
    """Response schema for APACHE II score calculation"""
    
    apache_ii_score: int = Field(..., description="APACHE II score (0-71)")
    predicted_mortality_percent: float = Field(
        ..., 
        ge=0, 
        le=100, 
        description="Predicted hospital mortality percentage"
    )
    component_scores: dict = Field(
        ...,
        description="Breakdown of component scores"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "apache_ii_score": 15,
                "predicted_mortality_percent": 12.5,
                "component_scores": {
                    "age_score": 2,
                    "glasgow_coma_score": 0,
                    "temperature_score": 0,
                    "mean_arterial_pressure_score": 0,
                    "heart_rate_score": 0,
                    "respiratory_rate_score": 0,
                    "oxygenation_score": 0,
                    "arterial_ph_score": 0,
                    "sodium_score": 0,
                    "potassium_score": 0,
                    "creatinine_score": 0,
                    "hematocrit_score": 0,
                    "wbc_score": 0,
                    "chronic_health_score": 0
                }
            }
        }


class ApacheIIRecordResponse(ApacheIIResponse):
    """Response schema for saved APACHE II score record"""
    
    id: str = Field(..., description="Record ID")
    patient_id: str = Field(..., description="Patient ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True

