from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse, StreamingResponse

from app.accounts.api.v1 import get_current_user, validate_organisation_access
from app.base.models import BaseResponse, PaginationResponse
from app.utils import format_response

from ....schemas import OPDPatientCreate, OPDPatientResponse, OPDPatientUpdate
from ....services.opd_patient_service import OPDPatientService
from ....services.opd_patient_report_service import OPDPatientReportService

router = APIRouter()


@router.post(
    "",
    response_model=BaseResponse[OPDPatientResponse],
    description="Create a new OPD patient",
)
@router.post(
    "/",
    response_model=BaseResponse[OPDPatientResponse],
    description="Create a new OPD patient",
)
@format_response(
    response_model=OPDPatientResponse, message="OPD patient created successfully"
)
async def create_opd_patient(
    opd_patient: OPDPatientCreate,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> OPDPatientResponse:
    """
    Create a new OPD patient record
    
    Required fields:
    - visit_date: Date and time of OPD visit (ISO 8601 format: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DDTHH:MM:SSZ)
      Examples: "2025-12-10T14:30:00" or "2025-12-10T14:30:00Z" (UTC)
    - patient_name: Full name of the patient
    - age: Age of the patient
    - gender: Gender (male/female/other)
    - uhid: Unique Health Identification Number
    - consultant_user_id: User ID of the consultant doctor
    
    Optional fields:
    - doc_number: Document/Registration number
    - episode_no: Episode number
    - allergy: Patient allergies
    - vitals: Vital signs
    - patient_history: Medical history details
    - general_examination: General examination findings
    - systemic_examination: Systemic examination findings
    - procedures: List of procedures performed
    - treatment_note: Treatment notes
    - followup_note: Follow-up notes
    
    Example request body:
    ```json
    {
        "visit_date": "2025-12-10T14:30:00",
        "doc_number": "OPD-2025-001",
        "patient_name": "John Doe",
        "age": 45,
        "gender": "male",
        "uhid": "UHID123456",
        "consultant_user_id": "691c2658b3dffef2f95aa203",
        "episode_no": "EP001"
    }
    ```
    """
    return await OPDPatientService.create_opd_patient(
        opd_patient_data=opd_patient,
        organisation_id=organisation_id,
        current_user=current_user,
    )


@router.get(
    "/{opd_patient_id}",
    response_model=BaseResponse[OPDPatientResponse],
    description="Get OPD patient by ID",
)
@format_response(
    response_model=OPDPatientResponse, message="OPD patient retrieved successfully"
)
async def get_opd_patient(
    opd_patient_id: str,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> OPDPatientResponse:
    """
    Get OPD patient details by ID
    """
    return await OPDPatientService.get_opd_patient(
        opd_patient_id=opd_patient_id,
        organisation_id=organisation_id,
        current_user=current_user,
    )


@router.get(
    "",
    response_model=BaseResponse[PaginationResponse[OPDPatientResponse]],
    description="Get all OPD patients with filters",
)
@router.get(
    "/",
    response_model=BaseResponse[PaginationResponse[OPDPatientResponse]],
    description="Get all OPD patients with filters",
)
@format_response(
    response_model=PaginationResponse[OPDPatientResponse],
    message="OPD patients retrieved successfully",
)
async def get_all_opd_patients(
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records per page"),
    doc_number: Optional[str] = Query(None, description="Filter by document number"),
    patient_name: Optional[str] = Query(None, description="Filter by patient name (partial match)"),
    uhid: Optional[str] = Query(None, description="Filter by UHID"),
    consultant_user_id: Optional[str] = Query(None, description="Filter by consultant user ID"),
    episode_no: Optional[str] = Query(None, description="Filter by episode number"),
    from_date: Optional[str] = Query(None, description="Filter from date/time (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
    to_date: Optional[str] = Query(None, description="Filter to date/time (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
) -> PaginationResponse[OPDPatientResponse]:
    """
    Get all OPD patients with optional filters and pagination
    
    Filters:
    - doc_number: Exact match on document number
    - patient_name: Partial match (case-insensitive)
    - uhid: Exact match on UHID
    - consultant_user_id: Filter by consultant
    - episode_no: Exact match on episode number
    - from_date: OPD visits from this date/time onwards (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
    - to_date: OPD visits up to this date/time (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
    
    Pagination:
    - page: Page number (starts from 1)
    - limit: Records per page
    """
    return await OPDPatientService.get_all_opd_patients(
        organisation_id=organisation_id,
        current_user=current_user,
        page=page,
        limit=limit,
        doc_number=doc_number,
        patient_name=patient_name,
        uhid=uhid,
        consultant_user_id=consultant_user_id,
        episode_no=episode_no,
        from_date=from_date,
        to_date=to_date,
    )


@router.put(
    "/{opd_patient_id}",
    response_model=BaseResponse[OPDPatientResponse],
    description="Update an existing OPD patient",
)
@format_response(
    response_model=OPDPatientResponse, message="OPD patient updated successfully"
)
async def update_opd_patient(
    opd_patient_id: str,
    opd_patient: OPDPatientUpdate,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> OPDPatientResponse:
    """
    Update an existing OPD patient record
    
    All fields are optional. Only provided fields will be updated.
    """
    return await OPDPatientService.update_opd_patient(
        opd_patient_id=opd_patient_id,
        opd_patient_data=opd_patient,
        organisation_id=organisation_id,
        current_user=current_user,
    )


@router.delete(
    "/{opd_patient_id}",
    response_model=BaseResponse[dict],
    description="Delete an OPD patient (soft delete)",
)
@format_response(response_model=dict, message="OPD patient deleted successfully")
async def delete_opd_patient(
    opd_patient_id: str,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
) -> dict:
    """
    Soft delete an OPD patient record
    """
    return await OPDPatientService.delete_opd_patient(
        opd_patient_id=opd_patient_id,
        organisation_id=organisation_id,
        current_user=current_user,
    )


@router.get(
    "/{opd_patient_id}/report",
    description="Generate and download OPD patient assessment report PDF",
    response_class=StreamingResponse,
)
async def generate_opd_patient_report(
    opd_patient_id: str,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
):
    """
    Generate OPD patient assessment report as PDF
    
    Returns a downloadable PDF file with the patient assessment details including:
    - Patient information (name, age, gender, UHID, episode number)
    - Consultant details
    - Patient history (tobacco, alcohol, substance use, past illness/procedures)
    - General and systemic examination
    - Procedures performed
    - Treatment and follow-up notes
    """
    # Generate PDF
    pdf_buffer = await OPDPatientReportService.generate_pdf_report(
        opd_patient_id=opd_patient_id,
        organisation_id=organisation_id,
    )
    
    # Return as downloadable file
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=opd_patient_report_{opd_patient_id}.pdf"
        }
    )


@router.get(
    "/{opd_patient_id}/report/html",
    description="Generate and view OPD patient assessment report as HTML",
    response_class=HTMLResponse,
)
async def generate_opd_patient_report_html(
    opd_patient_id: str,
    current_user=Depends(get_current_user),
    organisation_id=Depends(validate_organisation_access),
):
    """
    Generate OPD patient assessment report as HTML
    
    Returns an HTML page with the patient assessment details including:
    - Patient information (name, age, gender, UHID, episode number)
    - Consultant details
    - Patient history (tobacco, alcohol, substance use, past illness/procedures)
    - General and systemic examination
    - Procedures performed
    - Treatment and follow-up notes
    
    The HTML is optimized for printing and matches the PDF layout.
    """
    # Generate HTML
    html_content = await OPDPatientReportService.generate_html_report(
        opd_patient_id=opd_patient_id,
        organisation_id=organisation_id,
    )
    
    # Return as HTML response
    return HTMLResponse(content=html_content)

