from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

LETTERHEAD_DIR = Path(__file__).resolve().parent.parent / "assets"

from app.base.models import NotFoundError

from ..models import OPDPatient
from ..schemas import OPDPatientResponse


class OPDPatientReportService:
    """Service for generating OPD patient reports"""

    _IST = ZoneInfo("Asia/Kolkata")

    @staticmethod
    def _format_visit_datetime(
        visit_date: Optional[datetime],
        created_at: Optional[datetime] = None,
    ) -> str:
        """Format visit date and time in IST as DD.MM.YYYY, HH:MM AM/PM."""
        if not visit_date and not created_at:
            return ""

        date_source = visit_date or created_at
        date_part = date_source.strftime("%d.%m.%Y")

        time_source = visit_date
        is_midnight = (
            visit_date is not None
            and visit_date.hour == 0
            and visit_date.minute == 0
            and visit_date.second == 0
        )
        if is_midnight and created_at:
            time_source = created_at

        if time_source is None:
            return date_part

        if time_source.tzinfo is not None:
            local_time = time_source.astimezone(OPDPatientReportService._IST)
        elif created_at is not None and time_source is created_at:
            local_time = time_source.replace(tzinfo=timezone.utc).astimezone(
                OPDPatientReportService._IST
            )
        else:
            local_time = time_source

        return f"{date_part}, {local_time.strftime('%I:%M %p')}"

    @staticmethod
    def _html_text(value: Optional[str], empty: str = "N/A") -> str:
        if not value or not str(value).strip():
            return empty
        return str(value).replace("\n", "<br>")

    @staticmethod
    def _yes_no(value: Optional[str], empty: str = "No") -> str:
        if not value or not str(value).strip():
            return empty
        text = " ".join(str(value).replace("•", " ").replace("-", " ").split())
        if not text:
            return empty
        lowered = text.lower()
        if lowered in ("yes", "y"):
            return "Yes"
        if lowered in ("no", "n"):
            return "No"
        return text

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
            HTML(
                string=html_content,
                base_url=LETTERHEAD_DIR.as_uri() + "/",
            ).write_pdf(buffer)
            
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

        # Format date and time (IST). Date-only visits use created_at for the clock.
        visit_date_str = OPDPatientReportService._format_visit_datetime(
            opd_patient.visit_date,
            getattr(opd_patient, "created_at", None),
        )
        
        # Format gender
        gender_str = opd_patient.gender.value if opd_patient.gender else ""
        age_gender = f"{opd_patient.age} Y/{gender_str}"
        
        allergy_text = OPDPatientReportService._html_text(
            opd_patient.allergy, "No known allergy"
        )
        vitals_text = OPDPatientReportService._html_text(opd_patient.vitals)
        presenting_complaint_text = OPDPatientReportService._html_text(
            opd_patient.presenting_complaint
        )
        diagnosis_text = OPDPatientReportService._html_text(opd_patient.diagnosis)

        tobacco = OPDPatientReportService._yes_no(
            opd_patient.patient_history.tobacco_use if opd_patient.patient_history else None,
        )
        alcohol = OPDPatientReportService._yes_no(
            opd_patient.patient_history.alcohol_use if opd_patient.patient_history else None,
        )
        substance = OPDPatientReportService._yes_no(
            opd_patient.patient_history.substance_use if opd_patient.patient_history else None,
        )
        past_illness = OPDPatientReportService._html_text(
            opd_patient.patient_history.past_illness if opd_patient.patient_history else None,
            "None",
        )
        past_procedures = ""
        if opd_patient.patient_history and opd_patient.patient_history.past_procedures:
            past_procedures = OPDPatientReportService._html_text(
                opd_patient.patient_history.past_procedures, ""
            )

        procedures_text = ", ".join(opd_patient.procedures) if opd_patient.procedures else "N/A"
        treatment_note = OPDPatientReportService._html_text(opd_patient.treatment_note)
        followup_note = OPDPatientReportService._html_text(opd_patient.followup_note)
        general_exam = OPDPatientReportService._html_text(
            opd_patient.general_examination, "NAD"
        )
        systemic_exam = OPDPatientReportService._html_text(
            opd_patient.systemic_examination, "NAD"
        )
        
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
        @page {{
            size: A4;
            margin: 0;
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        html, body {{
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9pt;
            line-height: 1.4;
            color: #000;
            background: transparent;
            margin: 0;
            padding: 0;
        }}

        .letterhead-wrap {{
            position: fixed;
            top: 0;
            left: 0;
            width: 210mm;
            height: 297mm;
            overflow: hidden;
            z-index: -1;
        }}

        .letterhead {{
            width: 210mm;
            height: 297mm;
            display: block;
        }}

        .page-content {{
            padding: 44mm 16mm 54mm 16mm;
        }}
        
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: -24mm;
            margin-bottom: 4mm;
            min-height: 22mm;
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
            margin-bottom: 8px;
        }}
        
        .divider {{
            border-top: 1px solid #000;
            margin: 8px 0;
        }}
        
        .patient-info {{
            margin-bottom: 6px;
            display: flex;
            border: 0px solid #000;
        }}
        
        .patient-column {{
            flex: 1;
            padding: 4px 8px;
            border-right: 0px solid #000;
        }}
        
        .patient-column:last-child {{
            border-right: none;
        }}
        
        .patient-field {{
            display: flex;
            margin-bottom: 6px;
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
            margin-top: 8px;
            margin-bottom: 8px;
        }}

        .section-box {{
            margin: 8px 0 10px 0;
        }}

        .section-title {{
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 6px;
            padding-bottom: 2px;
            border-bottom: 1px solid #ccc;
        }}

        .two-col {{
            display: flex;
            gap: 22px;
            align-items: flex-start;
        }}

        .col {{
            flex: 1;
            min-width: 0;
        }}

        .col-right {{
            padding-left: 18mm;
        }}
        
        .section-content {{
            font-size: 9pt;
            line-height: 1.55;
            white-space: pre-wrap;
            margin-top: 2px;
        }}
        
        .allergy-row {{
            margin-top: 8px;
        }}
        
        .history-row {{
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 20px;
            margin-bottom: 8px;
        }}
        
        .history-item {{
            white-space: nowrap;
        }}
        
        .past-illness {{
            margin-top: 4px;
            line-height: 1.55;
        }}
        
        .signature {{
            margin-top: 14px;
            margin-left: auto;
            width: 38%;
            text-align: right;
        }}
        
        .signature-name {{
            font-weight: bold;
            font-size: 10pt;
            margin-top: 4px;
        }}
        
        .signature-designation {{
            font-size: 8pt;
            font-style: italic;
        }}
        
        .signature-image {{
            max-width: 210px;
            max-height: 90px;
            width: auto;
            height: auto;
            display: block;
            margin-left: auto;
            margin-right: 0;
            margin-top: 2px;
            margin-bottom: 2px;
        }}
        
        .header-left {{
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 6px;
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
    <div class="letterhead-wrap">
        <img class="letterhead" src="springer_letterhead.jpg" alt="" />
    </div>
    <div class="page-content">
    <!-- Header -->
    <div class="header">
        <div class="header-left">
            <div class="date">Date: {visit_date_str}</div>
            <div class="doc-number">
                <span>Document Number:</span> {patient_id_str}
            </div>
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

    <div class="section-box">
        <div class="two-col">
            <div class="col">
                <span class="patient-label">Presenting Complaint:</span>
                <div class="section-content">{presenting_complaint_text}</div>
            </div>
            <div class="col col-right">
                <span class="patient-label">Vitals:</span>
                <div class="section-content">{vitals_text}</div>
            </div>
        </div>
    </div>

    <div class="section-box">
        <div class="section-title">Patient History</div>
        <div class="history-row">
            <div class="history-item">
                <span class="patient-label">Tobacco Use:</span>
                <span class="patient-value">{tobacco}</span>
            </div>
            <div class="history-item">
                <span class="patient-label">Alcohol Use:</span>
                <span class="patient-value">{alcohol}</span>
            </div>
            <div class="history-item">
                <span class="patient-label">Substance Use:</span>
                <span class="patient-value">{substance}</span>
            </div>
        </div>
        <div class="two-col">
            <div class="col">
                <span class="patient-label">Past Illness/Procedures:</span>
                <div class="section-content">{past_illness}</div>
                {f'<div class="section-content">{past_procedures}</div>' if past_procedures else ''}
            </div>
            <div class="col col-right">
                <span class="patient-label">Allergy:</span>
                <div class="section-content">{allergy_text}</div>
            </div>
        </div>
    </div>

    <div class="section-box">
        <div class="section-title">Examination</div>
        <div class="two-col">
            <div class="col">
                <span class="patient-label">General Examination:</span>
                <div class="section-content">{general_exam}</div>
            </div>
            <div class="col">
                <span class="patient-label">Systemic Examination:</span>
                <div class="section-content">{systemic_exam}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <span class="patient-label">Diagnosis:</span>
        <div class="section-content">{diagnosis_text}</div>
    </div>

    <div class="two-col">
        <div class="col">
            <span class="patient-label">Treatment Note:</span>
            <div class="section-content">{treatment_note}</div>
        </div>
        <div class="col col-right">
            <span class="patient-label">Follow-up Note:</span>
            <div class="section-content">{followup_note}</div>
        </div>
    </div>
    
    <!-- Signature -->
    <div class="signature">
        {f'<img src="{consultant_signature_url}" alt="Signature" class="signature-image" />' if consultant_signature_url else ''}
        <div class="signature-name">{ "Dr. " + consultant if consultant else "Dr. [Name]"}</div>
        {f'<div class="signature-designation">{consultant_speciality}</div>' if consultant_speciality else ''}
    </div>
    </div>
</body>
</html>
        """
        
        return html_content

