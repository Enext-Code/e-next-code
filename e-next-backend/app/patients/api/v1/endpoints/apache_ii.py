from bson import ObjectId

from fastapi import APIRouter, Depends

from app.accounts.api.v1 import get_current_user
from app.base.models import BaseResponse, NotFoundError
from app.utils import format_response

from ....models import Patient
from ....schemas.apache_ii import (
    ApacheIIInput,
    ApacheIIRecordResponse,
    ApacheIIResponse,
)
from ....services.apache_ii_service import ApacheIIService

router = APIRouter()


@router.post(
    "/calculate",
    response_model=BaseResponse[ApacheIIResponse],
    description="Calculate APACHE II score and predicted mortality",
)
@format_response(
    response_model=ApacheIIResponse,
    message="APACHE II score calculated successfully",
)
async def calculate_apache_ii_score(
    input_data: ApacheIIInput, current_user=Depends(get_current_user)
) -> ApacheIIResponse:
    """
    Calculate APACHE II (Acute Physiology and Chronic Health Evaluation II) score
    and predicted hospital mortality for ICU patients.
    
    APACHE II is a severity-of-disease classification system that uses 12 physiological
    variables, age, and previous health status to provide a general measure of disease severity.
    
    **Input Parameters:**
    
    - **Age**: Patient age in years
    - **Glasgow Coma Score**: Use the lowest value in the past 24 hours. If patient is sedated,
      use estimated GCS prior to sedation (range: 3-15)
    - **Temperature**: Highest temperature recorded in past 24 hours (Celsius or Fahrenheit)
    - **Mean Arterial Pressure (MAP)**: In mmHg
    - **Heart Rate**: In bpm
    - **Respiratory Rate**: In bpm
    - **FiO2**: Fraction of inspired oxygen (21% for non-intubated patients, actual value for intubated)
    - **PaO2**: Partial pressure of arterial oxygen (mmHg or kPa)
    - **PaCO2**: Partial pressure of arterial carbon dioxide (mmHg or kPa)
    - **Atmospheric Pressure**: Required for A-a gradient calculation when FiO2 >= 50%
      (default: 760 mmHg at sea level)
    - **Arterial pH**: Arterial blood pH
    - **Sodium**: In mEq/L
    - **Potassium**: In mEq/L
    - **Creatinine**: In mg/dL or µmol/L
    - **Acute Renal Failure**: Yes/No (doubles creatinine score if present)
    - **Hematocrit**: In percentage
    - **WBC**: White Blood Cell count in x 10^9/L
    - **Severe Organ Insufficiency or Immunocompromised**: Yes/No
    - **Admission Classification**: Medical, Emergency post-operative, or Elective post-operative
    - **Emergency Surgery**: Yes/No (for mortality calculation)
    - **ICU Admission Reason**: Reason for ICU admission (required for mortality calculation)
    
    **Output:**
    
    - **APACHE II Score**: Total score (0-71 points, though scores above 55 are rare)
    - **Predicted Mortality**: Hospital mortality percentage
    - **Component Scores**: Breakdown of individual component scores
    
    **Reference:**
    Knaus WA, Draper EA, Wagner DP. APACHE II: a severity of disease classification system.
    Crit Care Med. 1985;13(10):818-29.
    
    For more details, visit: https://clincalc.com/icumortality/apacheii.aspx
    """
    try:
        # Calculate Apache II score
        result = ApacheIIService.calculate_apache_ii_score(input_data)
        
        # Save to database if patient_id is provided
        if input_data.patient_id:
            # Get organisation_id from patient
            patient = await Patient.find_one(
                {
                    "_id": ObjectId(input_data.patient_id),
                    "is_active": True,
                    "is_deleted": False,
                }
            )
            if not patient:
                raise NotFoundError("Patient not found")
            
            organisation_id = patient.organisation_id
            
            # Save the calculation
            await ApacheIIService.save_apache_ii_score(
                patient_id=input_data.patient_id,
                input_data=input_data,
                result=result,
                organisation_id=organisation_id,
                current_user=current_user,
            )
        
        return result
    except Exception as e:
        raise e


@router.get(
    "/patient/{patient_id}/last",
    response_model=BaseResponse[ApacheIIRecordResponse],
    description="Get the last APACHE II score for a patient",
)
@format_response(
    response_model=ApacheIIRecordResponse,
    message="Last APACHE II score retrieved successfully",
)
async def get_last_apache_ii_score(
    patient_id: str,
    current_user=Depends(get_current_user),
) -> ApacheIIRecordResponse:
    """
    Get the last (most recent) APACHE II score calculated for a patient.
    
    Returns the most recent Apache II calculation record including:
    - APACHE II score
    - Predicted mortality percentage
    - Component scores breakdown
    - Input parameters used
    - Timestamps
    """
    try:
        # Get patient to validate access and get organisation_id
        patient = await Patient.find_one(
            {
                "_id": ObjectId(patient_id),
                "is_active": True,
                "is_deleted": False,
            }
        )
        if not patient:
            raise NotFoundError("Patient not found")
        
        organisation_id = patient.organisation_id
        
        # Get last Apache II score
        last_score = await ApacheIIService.get_last_apache_ii_score(
            patient_id=patient_id, organisation_id=organisation_id
        )
        
        if not last_score:
            raise NotFoundError("No Apache II score found for this patient")
        
        return ApacheIIRecordResponse(
            id=str(last_score.id),
            patient_id=last_score.patient_id,
            apache_ii_score=last_score.apache_ii_score,
            predicted_mortality_percent=last_score.predicted_mortality_percent,
            component_scores=last_score.component_scores,
            created_at=last_score.created_at,
            updated_at=last_score.updated_at,
        )
    except Exception as e:
        raise e

