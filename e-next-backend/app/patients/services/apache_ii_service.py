import logging
import math
from typing import Dict, Optional

from bson import ObjectId

from app.base.models import NotFoundError
from app.patients.models import Patient, PatientApacheII

from ..schemas.apache_ii import (
    AdmissionClassification,
    ApacheIIInput,
    ApacheIIResponse,
    ICUAdmissionReason,
)

logger = logging.getLogger(__name__)


class ApacheIIService:
    """Service for calculating APACHE II score and predicted mortality"""

    # Admission indication weights for mortality calculation
    # Based on the reference: https://clincalc.com/icumortality/apacheii.aspx
    ADMISSION_INDICATION_WEIGHTS = {
        ICUAdmissionReason.ASTHMA_ALLERGY: -2.108,
        ICUAdmissionReason.COPD: -0.367,
        ICUAdmissionReason.PULMONARY_EDEMA_NON_CARDIAC: 0.251,
        ICUAdmissionReason.POST_RESPIRATORY_ARREST: 0.456,
        ICUAdmissionReason.ASPIRATION_POISONING_TOXIC: -0.142,
        ICUAdmissionReason.PULMONARY_EMBOLUS: -0.398,
        ICUAdmissionReason.INFECTION: 0.584,
        ICUAdmissionReason.NEOPLASM: 0.891,
        ICUAdmissionReason.HYPERTENSION: -1.798,
        ICUAdmissionReason.RHYTHM_DISTURBANCE: -1.686,
        ICUAdmissionReason.CONGESTIVE_HEART_FAILURE: -0.261,
        ICUAdmissionReason.HEMORRHAGIC_SHOCK_HYPOVOLEMIA: 0.422,
        ICUAdmissionReason.CORONARY_ARTERY_DISEASE: -0.191,
        ICUAdmissionReason.CABG: -3.353,
        ICUAdmissionReason.SEPSIS: 0.113,
        ICUAdmissionReason.POST_CARDIAC_ARREST: 0.393,
        ICUAdmissionReason.CARDIOGENIC_SHOCK: 0.501,
        ICUAdmissionReason.DISSECTING_THORACIC_ABDOMINAL_ANEURYSM: 1.315,
        ICUAdmissionReason.MULTIPLE_TRAUMA: -0.602,
        ICUAdmissionReason.HEAD_TRAUMA: -0.517,
        ICUAdmissionReason.SEIZURE_DISORDER: -1.150,
        ICUAdmissionReason.ICH_SDH_SAH: 0.723,
        ICUAdmissionReason.DRUG_OVERDOSE: -3.353,
        ICUAdmissionReason.DIABETIC_KETOACIDOSIS: -1.507,
        ICUAdmissionReason.GI_BLEEDING: -0.523,
        ICUAdmissionReason.METABOLIC_RENAL: 0.303,
        ICUAdmissionReason.RESPIRATORY: -0.584,
        ICUAdmissionReason.NEUROLOGIC: -0.143,
        ICUAdmissionReason.CARDIOVASCULAR: -0.329,
        ICUAdmissionReason.GASTROINTESTINAL: 0.060,
        ICUAdmissionReason.CHRONIC_CARDIOVASCULAR_DISEASE: -0.329,
        ICUAdmissionReason.PERIPHERAL_VASCULAR_SURGERY: -1.376,
        ICUAdmissionReason.HEART_VALVE_SURGERY: -1.315,
        ICUAdmissionReason.CRANIOTOMY_FOR_NEOPLASM: -1.119,
        ICUAdmissionReason.RENAL_SURGERY_FOR_NEOPLASM: -1.132,
        ICUAdmissionReason.RENAL_TRANSPLANT: -1.046,
        ICUAdmissionReason.THORACIC_SURGERY_FOR_NEOPLASM: -0.836,
        ICUAdmissionReason.CRANIOTOMY_FOR_ICH_SDH_SAH: 0.454,
        ICUAdmissionReason.LAMINECTOMY_AND_OTHER_SPINAL_SURGERY: -1.602,
        ICUAdmissionReason.RESPIRATORY_INSUFFICIENCY_AFTER_OR: -0.517,
        ICUAdmissionReason.GI_PERFORATION_OBSTRUCTION: 0.315,
        ICUAdmissionReason.POST_OP_SEPSIS: 0.497,
        ICUAdmissionReason.POST_OP_POSTARREST: 0.501,
    }

    @staticmethod
    def _convert_temperature_to_celsius(temp: float, unit: str) -> float:
        """Convert temperature to Celsius"""
        if unit.lower() == "fahrenheit":
            return (temp - 32) * 5 / 9
        return temp

    @staticmethod
    def _convert_pao2_to_mmhg(pao2: float, unit: str) -> float:
        """Convert PaO2 to mmHg"""
        if unit.lower() == "kpa":
            return pao2 * 7.50062
        return pao2

    @staticmethod
    def _convert_paco2_to_mmhg(paco2: float, unit: str) -> float:
        """Convert PaCO2 to mmHg"""
        if unit.lower() == "kpa":
            return paco2 * 7.50062
        return paco2

    @staticmethod
    def _convert_atmospheric_pressure_to_mmhg(pressure: float, unit: str) -> float:
        """Convert atmospheric pressure to mmHg"""
        if unit.lower() == "kpa":
            return pressure * 7.50062
        return pressure

    @staticmethod
    def _convert_creatinine_to_mgdl(creatinine: float, unit: str) -> float:
        """Convert creatinine to mg/dL"""
        if unit.lower() == "umol_l":
            return creatinine / 88.4
        return creatinine

    @staticmethod
    def _calculate_age_score(age: int) -> int:
        """Calculate age score (0-6 points)"""
        if age < 45:
            return 0
        elif age < 55:
            return 2
        elif age < 65:
            return 3
        elif age < 75:
            return 5
        else:
            return 6

    @staticmethod
    def _calculate_gcs_score(gcs: int) -> int:
        """Calculate Glasgow Coma Score points (0-12 points)"""
        # GCS is scored as 15 - GCS
        return 15 - gcs

    @staticmethod
    def _calculate_temperature_score(temp_celsius: float) -> int:
        """Calculate temperature score (0-4 points)"""
        if temp_celsius >= 41.0:
            return 4
        elif temp_celsius >= 39.0:
            return 3
        elif temp_celsius >= 38.5:
            return 1
        elif temp_celsius >= 36.0:
            return 0
        elif temp_celsius >= 34.0:
            return 1
        elif temp_celsius >= 32.0:
            return 2
        elif temp_celsius >= 30.0:
            return 3
        else:
            return 4

    @staticmethod
    def _calculate_map_score(map_value: float) -> int:
        """Calculate Mean Arterial Pressure score (0-4 points)"""
        if map_value >= 160:
            return 4
        elif map_value >= 130:
            return 3
        elif map_value >= 110:
            return 2
        elif map_value >= 70:
            return 0
        elif map_value >= 50:
            return 2
        else:
            return 4

    @staticmethod
    def _calculate_heart_rate_score(hr: int) -> int:
        """Calculate heart rate score (0-4 points)"""
        if hr >= 180:
            return 4
        elif hr >= 140:
            return 3
        elif hr >= 110:
            return 2
        elif hr >= 70:
            return 0
        elif hr >= 55:
            return 2
        elif hr >= 40:
            return 3
        else:
            return 4

    @staticmethod
    def _calculate_respiratory_rate_score(rr: int) -> int:
        """Calculate respiratory rate score (0-4 points)"""
        if rr >= 50:
            return 4
        elif rr >= 35:
            return 3
        elif rr >= 25:
            return 1
        elif rr >= 12:
            return 0
        elif rr >= 10:
            return 1
        elif rr >= 6:
            return 2
        elif rr >= 1:
            return 4
        else:
            return 4

    @staticmethod
    def _calculate_oxygenation_score(
        fio2: float,
        pao2: Optional[float],
        paco2: Optional[float],
        atmospheric_pressure_mmhg: float,
    ) -> int:
        """
        Calculate oxygenation score (0-4 points)
        Uses A-a gradient if FiO2 >= 50%, otherwise uses PaO2
        """
        if pao2 is None:
            return 0

        pao2_mmhg = pao2

        if fio2 >= 50:
            # Calculate A-a gradient
            # A-a gradient = (FiO2/100 * (Atmospheric Pressure - 47)) - PaO2 - (PaCO2/0.8)
            paco2_mmhg = paco2 if paco2 is not None else 40  # Default if not provided
            aa_gradient = (
                (fio2 / 100) * (atmospheric_pressure_mmhg - 47)
                - pao2_mmhg
                - (paco2_mmhg / 0.8)
            )

            if aa_gradient >= 500:
                return 4
            elif aa_gradient >= 350:
                return 3
            elif aa_gradient >= 200:
                return 2
            else:
                return 0
        else:
            # Use PaO2 directly
            if pao2_mmhg >= 70:
                return 0
            elif pao2_mmhg >= 61:
                return 1
            elif pao2_mmhg >= 55:
                return 3
            else:
                return 4

    @staticmethod
    def _calculate_ph_score(ph: float) -> int:
        """Calculate arterial pH score (0-4 points)"""
        if ph >= 7.7:
            return 4
        elif ph >= 7.6:
            return 3
        elif ph >= 7.5:
            return 1
        elif ph >= 7.33:
            return 0
        elif ph >= 7.25:
            return 2
        elif ph >= 7.15:
            return 3
        else:
            return 4

    @staticmethod
    def _calculate_sodium_score(sodium: float) -> int:
        """Calculate sodium score (0-4 points)"""
        if sodium >= 180:
            return 4
        elif sodium >= 160:
            return 3
        elif sodium >= 155:
            return 2
        elif sodium >= 150:
            return 1
        elif sodium >= 130:
            return 0
        elif sodium >= 120:
            return 2
        elif sodium >= 111:
            return 3
        else:
            return 4

    @staticmethod
    def _calculate_potassium_score(potassium: float) -> int:
        """Calculate potassium score (0-4 points)"""
        if potassium >= 7.0:
            return 4
        elif potassium >= 6.0:
            return 3
        elif potassium >= 5.5:
            return 1
        elif potassium >= 3.5:
            return 0
        elif potassium >= 3.0:
            return 1
        elif potassium >= 2.5:
            return 2
        else:
            return 4

    @staticmethod
    def _calculate_creatinine_score(
        creatinine_mgdl: float, acute_renal_failure: bool
    ) -> int:
        """
        Calculate creatinine score (0-4 points)
        Official criteria:
        - ≥3.5 (with acute renal failure): +4 points
        - 2.0–3.4 (with acute renal failure): +3 points
        - 1.5–1.9 (with acute renal failure): +2 points
        - 0.6–1.4: 0 points
        - <0.6: +2 points
        Note: Higher ranges (≥1.5) apply when acute renal failure is present.
        Without ARF, only <0.6 scores +2, all other values score 0.
        """
        # Values <0.6 always score +2 regardless of ARF
        if creatinine_mgdl < 0.6:
            return 2
        
        # Values 0.6-1.4 always score 0 regardless of ARF
        if creatinine_mgdl >= 0.6 and creatinine_mgdl < 1.5:
            return 0
        
        # For values ≥1.5, scoring depends on ARF status
        if acute_renal_failure:
            if creatinine_mgdl >= 3.5:
                return 4
            elif creatinine_mgdl >= 2.0:
                return 3
            else:  # 1.5-1.9
                return 2
        else:
            # Without ARF, values ≥1.5 typically score 0
            # (Some sources suggest scoring, but official criteria emphasizes ARF)
            return 0

    @staticmethod
    def _calculate_hematocrit_score(hematocrit: float) -> int:
        """Calculate hematocrit score (0-4 points)"""
        if hematocrit >= 60:
            return 4
        elif hematocrit >= 50:
            return 2
        elif hematocrit >= 46:
            return 1
        elif hematocrit >= 30:
            return 0
        elif hematocrit >= 20:
            return 2
        else:
            return 4

    @staticmethod
    def _calculate_wbc_score(wbc: float) -> int:
        """Calculate WBC score (0-4 points)"""
        if wbc >= 40:
            return 4
        elif wbc >= 20:
            return 2
        elif wbc >= 15:
            return 1
        elif wbc >= 3:
            return 0
        elif wbc >= 1:
            return 2
        else:
            return 4

    @staticmethod
    def _calculate_chronic_health_score(
        admission_classification: AdmissionClassification,
        severe_organ_insufficiency: bool,
    ) -> int:
        """Calculate chronic health score (0-5 points)"""
        if not severe_organ_insufficiency:
            return 0

        if admission_classification == AdmissionClassification.MEDICAL:
            return 5
        elif admission_classification == AdmissionClassification.EMERGENCY_POST_OPERATIVE:
            return 5
        else:  # ELECTIVE_POST_OPERATIVE
            return 2

    @staticmethod
    def calculate_apache_ii_score(input_data: ApacheIIInput) -> ApacheIIResponse:
        """
        Calculate APACHE II score and predicted mortality
        
        Args:
            input_data: APACHE II input parameters
            
        Returns:
            ApacheIIResponse with score and predicted mortality
        """
        # Convert units to standard values
        temp_celsius = ApacheIIService._convert_temperature_to_celsius(
            input_data.temperature, input_data.temperature_unit
        )
        pao2_mmhg = (
            ApacheIIService._convert_pao2_to_mmhg(
                input_data.pao2, input_data.pao2_unit
            )
            if input_data.pao2 is not None
            else None
        )
        paco2_mmhg = (
            ApacheIIService._convert_paco2_to_mmhg(
                input_data.paco2, input_data.paco2_unit
            )
            if input_data.paco2 is not None
            else None
        )
        atmospheric_pressure_mmhg = (
            ApacheIIService._convert_atmospheric_pressure_to_mmhg(
                input_data.atmospheric_pressure, input_data.atmospheric_pressure_unit
            )
        )
        creatinine_mgdl = ApacheIIService._convert_creatinine_to_mgdl(
            input_data.creatinine, input_data.creatinine_unit
        )

        # Calculate component scores
        component_scores = {
            "age_score": ApacheIIService._calculate_age_score(input_data.age),
            "glasgow_coma_score": ApacheIIService._calculate_gcs_score(
                input_data.glasgow_coma_score
            ),
            "temperature_score": ApacheIIService._calculate_temperature_score(
                temp_celsius
            ),
            "mean_arterial_pressure_score": ApacheIIService._calculate_map_score(
                input_data.mean_arterial_pressure
            ),
            "heart_rate_score": ApacheIIService._calculate_heart_rate_score(
                input_data.heart_rate
            ),
            "respiratory_rate_score": ApacheIIService._calculate_respiratory_rate_score(
                input_data.respiratory_rate
            ),
            "oxygenation_score": ApacheIIService._calculate_oxygenation_score(
                input_data.fio2,
                pao2_mmhg,
                paco2_mmhg,
                atmospheric_pressure_mmhg,
            ),
            "arterial_ph_score": ApacheIIService._calculate_ph_score(
                input_data.arterial_ph
            ),
            "sodium_score": ApacheIIService._calculate_sodium_score(
                input_data.sodium
            ),
            "potassium_score": ApacheIIService._calculate_potassium_score(
                input_data.potassium
            ),
            "creatinine_score": ApacheIIService._calculate_creatinine_score(
                creatinine_mgdl, input_data.acute_renal_failure
            ),
            "hematocrit_score": ApacheIIService._calculate_hematocrit_score(
                input_data.hematocrit
            ),
            "wbc_score": ApacheIIService._calculate_wbc_score(input_data.wbc),
            "chronic_health_score": ApacheIIService._calculate_chronic_health_score(
                input_data.admission_classification,
                input_data.severe_organ_insufficiency_or_immunocompromised,
            ),
        }

        # Calculate total APACHE II score
        total_score = sum(component_scores.values())

        # Calculate predicted mortality
        admission_indication_weight = ApacheIIService.ADMISSION_INDICATION_WEIGHTS.get(
            input_data.icu_admission_reason, 0.0
        )

        # Mortality calculation formula:
        # x = -3.517 + (0.146 * Points) + 0.603 (if emergency surgery) + (Admission Indication Weight)
        # R (percent mortality) = (e^x / (1 + e^x)) * 100
        x = (
            -3.517
            + (0.146 * total_score)
            + (0.603 if input_data.emergency_surgery else 0)
            + admission_indication_weight
        )

        predicted_mortality = (math.exp(x) / (1 + math.exp(x))) * 100

        return ApacheIIResponse(
            apache_ii_score=total_score,
            predicted_mortality_percent=round(predicted_mortality, 2),
            component_scores=component_scores,
        )

    @staticmethod
    async def save_apache_ii_score(
        patient_id: str,
        input_data: ApacheIIInput,
        result: ApacheIIResponse,
        organisation_id: str,
        current_user: dict,
    ) -> PatientApacheII:
        """Save Apache II calculation to database"""
        async with await PatientApacheII.get_collection().database.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Validate patient exists
                    patient = await Patient.find_one(
                        {
                            "_id": ObjectId(patient_id),
                            "organisation_id": organisation_id,
                            "is_active": True,
                            "is_deleted": False,
                        }
                    )
                    if not patient:
                        raise NotFoundError("Patient not found")

                    created_by = str(current_user["sub"])
                    created_by_profile = str(current_user["pid"])
                    updated_by = str(current_user["sub"])
                    updated_by_profile = str(current_user["pid"])

                    # Save Apache II score
                    apache_ii_record = await PatientApacheII.create(
                        patient_id=patient_id,
                        input_data=input_data.model_dump(),
                        apache_ii_score=result.apache_ii_score,
                        predicted_mortality_percent=result.predicted_mortality_percent,
                        component_scores=result.component_scores,
                        created_by=created_by,
                        created_by_profile=created_by_profile,
                        updated_by=updated_by,
                        updated_by_profile=updated_by_profile,
                        organisation_id=organisation_id,
                        session=session,
                    )

                    await session.commit_transaction()
                    logger.info(
                        f"Saved Apache II score {result.apache_ii_score} for patient {patient_id}"
                    )
                    return apache_ii_record

                except Exception as e:
                    if session.in_transaction:
                        await session.abort_transaction()
                    logger.error(f"Error saving Apache II score: {e}")
                    raise e

    @staticmethod
    async def get_last_apache_ii_score(
        patient_id: str, organisation_id: str
    ) -> Optional[PatientApacheII]:
        """Get the last Apache II score for a patient"""
        try:
            # Build filter query
            filter_query = {
                "patient_id": patient_id,
                "organisation_id": organisation_id,
                "is_active": True,
                "is_deleted": False,
            }

            # Get the most recent Apache II score (sorted by created_at descending)
            apache_ii_scores = await PatientApacheII.find(
                filter_query, limit=1, sort=[("created_at", -1)]
            )

            if apache_ii_scores:
                return apache_ii_scores[0]
            return None

        except Exception as e:
            logger.error(f"Error getting last Apache II score: {e}")
            raise e

