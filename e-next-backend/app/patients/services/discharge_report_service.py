import logging
from datetime import datetime
from io import BytesIO
from typing import Optional

from bson import ObjectId

from app.accounts.models import User, UserProfile
from app.base.models import NotFoundError, ValidationError
from app.core import s3

from ..enums import PatientStatus
from ..models import (DischargeReport, Patient, PatientHeent,
                     PatientPastMedicalHistory)
from ...investigation_reports.models import DailyRoundSheet

logger = logging.getLogger(__name__)


class DischargeReportService:
    """Service for generating discharge reports"""

    @staticmethod
    async def generate_pdf_report(
        patient_id: str,
        organisation_id: str,
    ) -> BytesIO:
        """
        Generate PDF report for discharge patient using HTML template
        
        Args:
            patient_id: Patient ID
            organisation_id: Organisation ID
            
        Returns:
            BytesIO: PDF file buffer
        """
        # Generate HTML report first
        html_content = await DischargeReportService.generate_html_report(
            patient_id=patient_id,
            organisation_id=organisation_id,
        )
        
        # Convert HTML to PDF using weasyprint
        try:
            from weasyprint import HTML
            
            # Create PDF buffer
            buffer = BytesIO()
            
            # Generate PDF from HTML using weasyprint
            HTML(string=html_content).write_pdf(buffer)
            
            # Reset buffer position
            buffer.seek(0)
            return buffer
            
        except ImportError:
            raise RuntimeError(
                "weasyprint is not installed. Please install it using: pip install weasyprint"
            )
        except Exception as e:
            raise RuntimeError(f"Error generating PDF from HTML: {str(e)}")

    @staticmethod
    async def generate_html_report(
        patient_id: str,
        organisation_id: str,
    ) -> str:
        """
        Generate HTML report for discharge patient
        
        Args:
            patient_id: Patient ID
            organisation_id: Organisation ID
            
        Returns:
            str: HTML content
        """
        # Normalize organisation_id (handle "None", "null", None from superadmin tokens)
        if organisation_id in (None, "None", "null", ""):
            organisation_id = None

        # Fetch patient
        patient_query = {
            "_id": ObjectId(patient_id),
            "is_active": True,
            "is_deleted": False,
        }
        if organisation_id:
            patient_query["organisation_id"] = organisation_id

        patient = await Patient.find_one(patient_query)
        
        if not patient:
            raise NotFoundError(f"Patient with ID {patient_id} not found")

        # Validate patient is not in ADMISSION status
        if patient.status == PatientStatus.ADMISSION:
            raise ValidationError(
                message="Discharge report is not available while patient is still admitted",
                error_code="PATIENT_STILL_ADMITTED",
            )

        # Fetch discharge report
        discharge_report = await DischargeReport.find_one({
            "patient_id": patient_id,
            "is_active": True,
            "is_deleted": False,
        })

        # Fetch history sheet (PatientPastMedicalHistory)
        history_sheet = await PatientPastMedicalHistory.find_one({
            "patient_id": patient_id,
            "is_active": True,
            "is_deleted": False,
        })

        # Fetch HEENT for GCS
        patient_heent = await PatientHeent.find_one({
            "patient_id": patient_id,
            "is_active": True,
            "is_deleted": False,
        })

        # Fetch daily round sheets for medication given
        daily_round_sheets_cursor = DailyRoundSheet.get_collection().find({
            "patient_id": patient_id,
            "is_active": True,
            "is_deleted": False,
        }).sort("date", -1)
        daily_round_sheets_raw = await daily_round_sheets_cursor.to_list(length=None)
        daily_round_sheets = [DailyRoundSheet.model_validate(doc) for doc in daily_round_sheets_raw]

        # Fetch consultant user details
        # Try consultant_id first, fall back to doctor_id
        consultant = None
        consultant_speciality = None
        consultant_signature_url = None

        doctor_user_id = patient.consultant_id or patient.doctor_id
        if doctor_user_id:
            try:
                consultant_user = await User.find_one({"_id": ObjectId(doctor_user_id)})
                if not consultant_user:
                    logger.warning(f"Consultant/Doctor user not found for ID: {doctor_user_id}")
                else:
                    profile_id = consultant_user.current_profile_id or consultant_user.primary_profile_id
                    if not profile_id:
                        logger.warning(f"No profile ID found for user: {doctor_user_id}")
                    else:
                        profile = await UserProfile.find_one({"_id": ObjectId(profile_id)})
                        if not profile:
                            logger.warning(f"Profile not found for profile ID: {profile_id}")
                        else:
                            consultant = profile.full_name
                            consultant_speciality = profile.designation
                            # Get consultant signature from S3 if available
                            if profile.signature:
                                try:
                                    consultant_signature_url = await s3.get_presigned_url(profile.signature)
                                except Exception as e:
                                    logger.warning(f"Failed to get presigned URL for consultant signature: {str(e)}")
            except Exception as e:
                logger.error(f"Error fetching consultant details: {str(e)}")

        # Format presenting complaints from history sheet
        presenting_complaints_text = "N/A"
        if history_sheet and history_sheet.presenting_complaints:
            complaints_list = [
                f"{comp.serial_number}. {comp.complaint}"
                for comp in history_sheet.presenting_complaints
            ]
            presenting_complaints_text = "<br>".join(complaints_list) if complaints_list else "N/A"

        # Format history of present illness
        history_of_present_illness = discharge_report.history_of_present_illness if discharge_report else "N/A"

        # Format past history
        past_history = discharge_report.past_history if discharge_report else "N/A"

        # Format on examination - from history sheet and HEENT
        examination_items = []
        if history_sheet:
            if history_sheet.bp:
                examination_items.append(f"BP: {history_sheet.bp}")
            if history_sheet.hr is not None:
                examination_items.append(f"HR: {history_sheet.hr}")
            if history_sheet.rr is not None:
                examination_items.append(f"RR: {history_sheet.rr}")
            if history_sheet.spo2:
                examination_items.append(f"SpO2: {history_sheet.spo2}")
            if history_sheet.temperature is not None:
                examination_items.append(f"Temperature: {history_sheet.temperature}°C")
            if history_sheet.rbs is not None:
                examination_items.append(f"RBS: {history_sheet.rbs}")

        # Add GCS from HEENT
        if patient_heent:
            gcs_score = patient_heent.gcs_score
            examination_items.append(f"GCS: {gcs_score}")

        on_examination_text = ", ".join(examination_items) if examination_items else "N/A"

        # Format course in hospital
        course_in_hospital = discharge_report.course_in_hospital if discharge_report else "N/A"

        # Format condition on discharge
        condition_on_discharge = discharge_report.condition_on_discharge if discharge_report else "N/A"

        # Format medication given - from daily round sheets
        medication_given_list = []
        for sheet in daily_round_sheets:
            if sheet.prescription:
                medication_given_list.append(sheet.prescription)
        medication_given_text = "<br>".join(medication_given_list) if medication_given_list else "N/A"

        # Format medication on discharge
        medication_on_discharge = discharge_report.medication_on_discharge if discharge_report else "N/A"

        # Format follow up advice
        follow_up_advice = discharge_report.follow_up_advice if discharge_report else "N/A"

        # Format dates
        discharge_date_str = ""
        if patient.status_change_datetime:
            discharge_date_str = patient.status_change_datetime.strftime("%d.%m.%Y")
        elif discharge_report:
            discharge_date_str = discharge_report.created_at.strftime("%d.%m.%Y")

        admission_date_str = patient.admission_date.strftime("%d.%m.%Y") if patient.admission_date else "N/A"

        # Format gender
        gender_str = patient.gender.value if patient.gender else ""
        age_gender = f"{patient.age} Y/{gender_str}"

        # Get patient ID for document number
        patient_id_str = str(patient.id) if patient.id else ""

        # Generate HTML
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discharge Report</title>
    <style>
        @media print {{
            @page {{
                size: A4;
                margin: 0;
            }}
            body {{
                margin: 0;
                padding: 20px;
            }}
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
            padding: 20px 50px;
            max-width: 210mm;
            margin: 0 auto;
        }}
        
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 18px;
        }}
        
        .date {{
            font-size: 9pt;
        }}
        
        .doc-number {{
            font-size: 9pt;
        }}
        
        .title {{
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 18px;
        }}
        
        .divider {{
            border-top: 1px solid #000;
            margin: 12px 0;
        }}
        
        .patient-info {{
            margin-bottom: 12px;
            display: flex;
            border: 0px solid #000;
        }}
        
        .patient-column {{
            flex: 1;
            padding: 12px;
            border-right: 0px solid #000;
        }}
        
        .patient-column:last-child {{
            border-right: none;
        }}
        
        .patient-field {{
            display: flex;
            margin-bottom: 12px;
            align-items: baseline;
        }}
        
        .patient-field:last-child {{
            margin-bottom: 0;
        }}
        
        .patient-label {{
            font-weight: bold;
            margin-right: 5px;
            font-size: 9pt;
        }}
        
        .patient-value {{
            font-size: 9pt;
        }}
        
        .section {{
            margin-top: 15px;
            margin-bottom: 15px;
        }}
        
        .section-title {{
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 12px;
        }}
        
        .section-content {{
            font-size: 9pt;
            line-height: 1.6;
            white-space: pre-wrap;
        }}
        
        .signature {{
            margin-top: 30px;
        }}
        
        .signature-name {{
            font-weight: bold;
            font-size: 9pt;
            margin-top: 10px;
        }}
        
        .signature-designation {{
            font-size: 8pt;
            font-style: italic;
        }}
        
        .signature-image {{
            max-width: 200px;
            max-height: 80px;
            margin-top: 10px;
            margin-bottom: 5px;
        }}
        
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="date">Date: {discharge_date_str}</div>
        <div class="doc-number">
            <span>Document Number:</span> {patient_id_str}
        </div>
    </div>
    
    <!-- Title -->
    <div class="title">DISCHARGE REPORT</div>
    
    <!-- Divider -->
    <div class="divider"></div>
    
    <!-- Patient Information - 3 Column Layout -->
    <div class="patient-info">
        <!-- First Column: Name and Consultant -->
        <div class="patient-column">
            <div class="patient-field">
                <span class="patient-label">Name:</span>
                <span class="patient-value">{patient.first_name} {patient.last_name}</span>
            </div>
            <div class="patient-field">
                <span class="patient-label">Consultant:</span>
                <span class="patient-value">{consultant or "N/A"}</span>
            </div>
        </div>
        
        <!-- Second Column: Age/Gender and Speciality -->
        <div class="patient-column">
            <div class="patient-field">
                <span class="patient-label">Age/Gender:</span>
                <span class="patient-value">{age_gender}</span>
            </div>
            <div class="patient-field">
                <span class="patient-label">Speciality:</span>
                <span class="patient-value">{consultant_speciality or "N/A"}</span>
            </div>
        </div>
        
        <!-- Third Column: UHID and Admission Date -->
        <div class="patient-column">
            <div class="patient-field">
                <span class="patient-label">UHID:</span>
                <span class="patient-value">{patient.uid_number or "N/A"}</span>
            </div>
            <div class="patient-field">
                <span class="patient-label">Admission Date:</span>
                <span class="patient-value">{admission_date_str}</span>
            </div>
        </div>
    </div>
    
    <!-- Divider -->
    <div class="divider"></div>
    
    <!-- Presenting Complaints -->
    <div class="section">
        <div class="section-title">1. Presenting Complaints:</div>
        <div class="section-content">{presenting_complaints_text}</div>
    </div>
    
    <!-- History of Present Illness -->
    <div class="section">
        <div class="section-title">2. History of Present Illness:</div>
        <div class="section-content">{history_of_present_illness}</div>
    </div>
    
    <!-- Past History -->
    <div class="section">
        <div class="section-title">3. Past History:</div>
        <div class="section-content">{past_history}</div>
    </div>
    
    <!-- On Examination -->
    <div class="section">
        <div class="section-title">4. On Examination:</div>
        <div class="section-content">{on_examination_text}</div>
    </div>
    
    <!-- Course in Hospital -->
    <div class="section">
        <div class="section-title">5. Course in Hospital:</div>
        <div class="section-content">{course_in_hospital}</div>
    </div>
    
    <!-- Condition on Discharge -->
    <div class="section">
        <div class="section-title">6. Condition on the Time of Discharge:</div>
        <div class="section-content">{condition_on_discharge}</div>
    </div>
    
    <!-- Medication Given -->
    <div class="section">
        <div class="section-title">7. Medication Given:</div>
        <div class="section-content">{medication_given_text}</div>
    </div>
    
    <!-- Medication on Discharge -->
    <div class="section">
        <div class="section-title">8. Medication on Discharge:</div>
        <div class="section-content">{medication_on_discharge}</div>
    </div>
    
    <!-- Follow Up Advice -->
    <div class="section">
        <div class="section-title">9. Follow Up Advice:</div>
        <div class="section-content">{follow_up_advice}</div>
    </div>
    
    <!-- Signature -->
    <div class="signature">
        {f'<img src="{consultant_signature_url}" alt="Signature" class="signature-image" />' if consultant_signature_url else ''}
        <div class="signature-name">{ "Dr. " + consultant if consultant else "Dr. [Name]"}</div>
        {f'<div class="signature-designation">{consultant_speciality}</div>' if consultant_speciality else ''}
    </div>
</body>
</html>
        """
        
        return html_content

