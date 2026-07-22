from datetime import datetime
from io import BytesIO
from typing import Optional

from app.base.models import NotFoundError

from ..models import OPDPatient
from ..schemas import OPDPatientResponse


class OPDPatientReportService:
    """Service for generating OPD patient reports"""

    @staticmethod
    async def generate_pdf_report(
        opd_patient_id: str,
        organisation_id: str,
    ) -> BytesIO:
        """
        Generate PDF report for OPD patient using HTML template
        
        Args:
            opd_patient_id: OPD patient ID
            organisation_id: Organisation ID
            
        Returns:
            BytesIO: PDF file buffer
        """
        # Fetch OPD patient
        from bson import ObjectId
        opd_patient = await OPDPatient.find_one({"_id": ObjectId(opd_patient_id)})
        
        if not opd_patient:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Verify organisation
        if opd_patient.organisation_id != organisation_id:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Check if deleted
        if opd_patient.is_deleted:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Fetch consultant user details (for consistency, though generate_html_report will fetch again)
        from app.accounts.models import User, UserProfile
        consultant = None
        consultant_speciality = None
        
        if opd_patient.consultant_user_id:
            consultant_user = await User.find_one({"_id": ObjectId(opd_patient.consultant_user_id)})
            if consultant_user:
                if consultant_user.current_profile_id:
                    profile = await UserProfile.find_one({"_id": ObjectId(consultant_user.current_profile_id)})
                    if profile:
                        consultant = profile.full_name
                        consultant_speciality = profile.designation

        # Generate HTML report first
        html_content = await OPDPatientReportService.generate_html_report(
            opd_patient_id=opd_patient_id,
            organisation_id=organisation_id,
        )
        
        # Convert HTML to PDF using weasyprint
        try:
            from weasyprint import HTML
            
            # Create PDF buffer
            buffer = BytesIO()
            
            # Generate PDF from HTML using weasyprint
            # WeasyPrint handles all CSS including print media queries
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
        opd_patient_id: str,
        organisation_id: str,
    ) -> str:
        """
        Generate HTML report for OPD patient
        
        Args:
            opd_patient_id: OPD patient ID
            organisation_id: Organisation ID
            
        Returns:
            str: HTML content
        """
        # Fetch OPD patient
        from bson import ObjectId
        opd_patient = await OPDPatient.find_one({"_id": ObjectId(opd_patient_id)})
        
        if not opd_patient:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Verify organisation
        if opd_patient.organisation_id != organisation_id:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Check if deleted
        if opd_patient.is_deleted:
            raise NotFoundError(f"OPD patient with ID {opd_patient_id} not found")

        # Fetch consultant user details
        from app.accounts.models import User, UserProfile
        from app.core import s3
        consultant = None
        consultant_speciality = None
        consultant_signature_url = None
        
        if opd_patient.consultant_user_id:
            consultant_user = await User.find_one({"_id": ObjectId(opd_patient.consultant_user_id)})
            if consultant_user:
                # Get consultant name
                if consultant_user.current_profile_id:
                    profile = await UserProfile.find_one({"_id": ObjectId(consultant_user.current_profile_id)})
                    if profile:
                        consultant = profile.full_name
                        consultant_speciality = profile.designation
                        # Get consultant signature from S3 if available
                        if profile.signature:
                            try:
                                consultant_signature_url = await s3.get_presigned_url(profile.signature)
                            except Exception as e:
                                # Log error but don't fail report generation
                                import logging
                                logger = logging.getLogger(__name__)
                                logger.warning(f"Failed to get presigned URL for consultant signature: {str(e)}")

        # Format date
        visit_date_str = opd_patient.visit_date.strftime("%d.%m.%Y") if opd_patient.visit_date else ""
        
        # Format gender
        gender_str = opd_patient.gender.value if opd_patient.gender else ""
        age_gender = f"{opd_patient.age} Y/{gender_str}"
        
        # Format allergy
        allergy_text = opd_patient.allergy if opd_patient.allergy else "No known allergy"
        
        # Format vitals
        vitals_text = opd_patient.vitals if opd_patient.vitals else "N/A"
        
        # Format patient history
        tobacco = opd_patient.patient_history.tobacco_use if opd_patient.patient_history else "No"
        alcohol = opd_patient.patient_history.alcohol_use if opd_patient.patient_history else "No"
        substance = opd_patient.patient_history.substance_use if opd_patient.patient_history else "No"
        
        # Format past illness/procedures
        past_illness = ""
        if opd_patient.patient_history and opd_patient.patient_history.past_illness:
            past_illness = opd_patient.patient_history.past_illness.replace('\n', '<br>')
        
        past_procedures = ""
        if opd_patient.patient_history and opd_patient.patient_history.past_procedures:
            past_procedures = opd_patient.patient_history.past_procedures.replace('\n', '<br>')
        
        # Format procedures
        procedures_text = ", ".join(opd_patient.procedures) if opd_patient.procedures else "N/A"
        
        # Format treatment and followup
        treatment_note = opd_patient.treatment_note if opd_patient.treatment_note else "N/A"
        followup_note = opd_patient.followup_note if opd_patient.followup_note else "N/A"
        
        # Format examination
        general_exam = opd_patient.general_examination if opd_patient.general_examination else "NAD"
        systemic_exam = opd_patient.systemic_examination if opd_patient.systemic_examination else "NAD"
        
        # Get patient ID for document number
        patient_id_str = str(opd_patient.id) if opd_patient.id else ""

        # Generate HTML
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OPD Patient Assessment Report</title>
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
        
        .allergy {{
            margin-bottom: 15px;
        }}
        
        .history-row {{
            display: flex;
            gap: 50px;
            margin-bottom: 12px;
        }}
        
        .history-item {{
            display: flex;
            gap: 5px;
        }}
        
        .past-illness {{
            margin-top: 12px;
            margin-bottom: 15px;
            line-height: 1.6;
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
        
        .header-left {{
            display: flex;
            flex-direction: column;
            gap: 5px;
        }}
        
        .logo-image {{
            max-width: 250px;
            max-height: 120px;
            height: auto;
            width: auto;
        }}
        
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-left">
            <div class="date">Date: {visit_date_str}</div>
            <div class="doc-number">
                <span>Document Number:</span> {patient_id_str}
            </div>
        </div>
        <div>
            <img src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/WhatsApp+Image+2025-12-13+at+16.49.10.jpeg" alt="Logo" class="logo-image" />
        </div>
    </div>
    
    <!-- Title -->
    <div class="title">OUTPATIENT ASSESSMENT FORM</div>
    
    <!-- Divider -->
    <div class="divider"></div>
    
    <!-- Patient Information - 3 Column Layout -->
    <div class="patient-info">
        <!-- First Column: Name and Consultant -->
        <div class="patient-column">
            <div class="patient-field">
                <span class="patient-label">Name:</span>
                <span class="patient-value">{opd_patient.patient_name or ""}</span>
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
        
        <!-- Third Column: UHID and Episode No -->
        <div class="patient-column">
            <div class="patient-field">
                <span class="patient-label">UHID:</span>
                <span class="patient-value">{opd_patient.uhid or ""}</span>
            </div>
        </div>
    </div>
    
    <!-- Divider -->
    <div class="divider"></div>
    
    <!-- Allergy -->
    <div class="allergy">
        <span class="patient-label">Allergy:</span>
        <span class="patient-value">{allergy_text}</span>
    </div>
    
    <!-- Vitals -->
    <div class="allergy">
        <span class="patient-label">Vitals:</span>
        <span class="patient-value">{vitals_text}</span>
    </div>
    
    <!-- Patient History -->
    <div class="section">
        <div class="section-title">Patient History</div>
        
        <div class="history-row">
            <div class="history-item">
                <span class="patient-label">Tobacco Use:</span>
                <span class="patient-value">{tobacco or "No"}</span>
            </div>
            <div class="history-item">
                <span class="patient-label">Alcohol:</span>
                <span class="patient-value">{alcohol or "No"}</span>
            </div>
            <div class="history-item">
                <span class="patient-label">Substance Use:</span>
                <span class="patient-value">{substance or "No"}</span>
            </div>
        </div>
        
        <div class="past-illness">
            <span class="patient-label">Past Illness/Procedures:</span><br>
            <div class="section-content">{past_illness if past_illness else "None"}</div>
            {f'<div class="section-content">{past_procedures}</div>' if past_procedures else ''}
        </div>
    </div>
    
    <!-- General Examination -->
    <div class="section">
         <span class="patient-label">General Examination:</span><br>
        <div class="section-content">{general_exam}</div>
    </div>
    
    <!-- Systemic Examination -->
    <div class="section">
        <span class="patient-label">Systemic Examination:</span><br>
        <div class="section-content">{systemic_exam}</div>
    </div>
    
    <!-- Procedure -->

    
    <!-- Treatment Note -->
    <div class="section">
        <span class="patient-label">Treatment Note:</span><br>
        <div class="section-content">{treatment_note}</div>
    </div>
    
    <!-- Follow-up Note -->
    <div class="section">
        <span class="patient-label">Follow-up Note:</span><br>
        <div class="section-content">{followup_note}</div>
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

