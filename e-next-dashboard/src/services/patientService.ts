import { fetchApi, downloadApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';

export interface ICDCode {
  code: string;
  description: string;
  id: string;
  created_at: string;
  updated_at: string;
}
export interface ICDCodeListResponse {
  items: ICDCode[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}
export interface Patient {
  id: string;
  unique_id: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  height?: number;
  weight?: number;
  criticality: 'red' | 'yellow' | 'green' | 'black';
  triage: 'emergent' | 'urgent' | 'non-urgent';
  uid_number: string;
  ipid_number: string;
  admission_date: string;
  admission_time: string;
  tele_icu_date: string;
  tele_icu_time?: string;
  mlc_or_non_mlc_number: string;
  insurance: string;
  organisation_icu_id: string;
  organisation_icu_bed_id: string;
  doctor_id: string;
  icd_code_ids: string[];
  status: string;
  remark: string;
  remark_datetime: string;
  status_change_datetime: string;
  organisation_id: string;
  created_at: string;
  updated_at: string;
  organisation_icu_bed_number: number | null;
  organisation_icu_name: string;
  doctor_full_name: string;
  icd_codes: ICDCode[];
  is_patient_past_medical_history: boolean;
  is_patient_heent: boolean;
  is_patient_investigation: boolean;
  address?: string;
  consultant_id?: string;
}

export interface DoctorProfile {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_type: string;
  gender: string;
  date_of_birth: string;
  is_primary: boolean;
  avatar: string | null;
  language: string;
  theme: string;
}
export interface PatientCreateResponse {
  id: string;
  unique_id: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  admission_date: string;
  admission_time: string;
  tele_icu_date: string;
  tele_icu_time?: string;
  mlc_or_non_mlc_number: string;
  insurance?: string;
  organisation_icu_id: string;
  organisation_icu_bed_id: string;
  doctor_id: string;
  organisation_id: string;
  created_at: string;
  updated_at: string;
  organisation_icu_bed_number: number;
  organisation_icu_name: string;
  doctor_full_name: string;
  // icd_code: ICDCode;
}

export interface Doctor {
  id: string;
  username: string;
  email: string;
  country_code: string;
  mobile_number: string;
  full_mobile_number: string;
  primary_profile: DoctorProfile;
  current_profile: DoctorProfile;
  profiles_count: number | null;
  current_organisation_id: string;
}
export interface DoctorListResponse {
  items: Doctor[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}
export interface Bed {
  id: string;
  organisation_icu_id: string;
  bed_number: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}
export interface ICDCodeListResponsetest{
  items: ICDCode[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: string | null;
}

export interface ApiResponse1<T> {
  success: boolean;
  message?: string;
  error?: string | null;
}
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
  data: T[];
}

export type PatientStatus =
  | 'inactive'
  | 'admission'
  | 'discharge'
  | 'referred'
  | 'lama'
  | 'deceased';

export interface PatientListParams {
  page?: number;
  limit?: number;
  sort_order?: 'asc' | 'desc';
  organisation_id?: string;
  search?: string;
  statuses?: PatientStatus[];
}

export interface PatientListResponse {
  items: Patient[];
  total_count: number;
  total:number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PatientHistoryRequest {
  patient_id: string;
  presenting_complaints: Array<{
    serial_number: number;
    complaint: string;
  }>;
  current_medications: Array<{
    serial_number: number;
    medication: string;
  }>;
  food_allergies: string[];
  drug_allergies: string[];
  personal_hz: string[];
  personal_hz_others: string;
  medical_history: string[];
  medical_history_others: string;
  bp: string;
  hr: number;
  rr: number;
  spo2: string;
  temperature: number;
  rbs: number;
}

export interface PatientHistoryResponse extends PatientHistoryRequest {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface PatientHEENTRequest {
  patient_id: string;
  cvs: string;
  rs: string;
  p_a: string;
  right_pupil_size: string;
  right_pupil_reaction: string;
  left_pupil_size: string;
  left_pupil_reaction: string;
  eye_opening: number;
  verbal_response: number;
  motor_response: number;
  rul: string;
  lul: string;
  rll: string;
  lll: string;
  other_medical_findings: string;
}

export interface PatientHEENTResponse extends PatientHEENTRequest {
  id: string;
  gcs_score: number;
  organisation_id: string;
  created_at: string;
  updated_at: string;
}
export interface PatientData {
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  height?: number;
  weight?: number;
  criticality: string;
  triage: string;
  uid_number: string;
  ipid_number: string;
  admission_date: string;
  admission_time: string;
  tele_icu_date: string;
  tele_icu_time?: string;
  mlc_or_non_mlc_number: string;
  insurance?: string;
  organisation_icu_id: string;
  organisation_icu_bed_id: string;
  doctor_id: string;
  remark: string;
  remark_datetime: string;
  icd_code_ids: string[];
  status: string;
  id: string;
  unique_id: string;
  organisation_id: string;
  created_at: string;
  updated_at: string;
  organisation_icu_bed_number: number;
  organisation_icu_name: string;
  doctor_full_name: string;
  icd_codes: {
    code: string;
    description: string;
    id: string;
    created_at: string;
    updated_at: string;
  }[];
  is_patient_past_medical_history: boolean;
  is_patient_heent: boolean;
  is_patient_investigation: boolean;
  address?: string;
  consultant_id?: string;
  consultant_full_name?: string;
}

interface RadiologyType {
  type: string;
  subtypes: string[];
}

export interface PatientInvestigationRequest {
  patient_id: string;
  blood_analysis: string[];
  radiology: RadiologyType[];
  microbiology: string[];
  arterial_analysis: string[];
}

export interface PatientInvestigationResponse extends PatientInvestigationRequest {
  id: string;
  organisation_id: string;
  created_at: string;
  updated_at: string;
}

export interface DischargeReportData {
  history_of_present_illness: string;
  past_history: string;
  course_in_hospital: string;
  condition_on_discharge: string;
  medication_on_discharge: string;
  follow_up_advice: string;
}

export interface DischargeReportResponse {
  id: string;
  patient_id: string;
  organisation_id: string;
  history_of_present_illness: string;
  past_history: string;
  course_in_hospital: string;
  condition_on_discharge: string;
  medication_on_discharge: string;
  follow_up_advice: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface PatientInfoResponse {
  basic_details: PatientData;
  heent: {
    _id: string;
    cvs: string;
    rs: string;
    p_a: string;
    right_pupil_size: string;
    right_pupil_reaction: string;
    left_pupil_size: string;
    left_pupil_reaction: string;
    eye_opening: number;
    verbal_response: number;
    motor_response: number;
    rul: string;
    lul: string;
    rll: string;
    lll: string;
    other_medical_findings: string;
    created_at: string;
    updated_at: string;
  };
  investigation: {
    _id: string;
    blood_analysis: string[];
    radiology: Array<{
      type: string;
      subtypes: string[];
    }>;
    microbiology: string[];
    arterial_analysis: string[];
    created_at: string;
    updated_at: string;
  };
  past_medical_history: {
    _id: string;
    initial_treatment: string;
    presenting_complaints: Array<{
      serial_number: number;
      complaint: string;
    }>;
    current_medications: Array<{
      serial_number: number;
      medication: string;
    }>;
    food_allergies: string[];
    drug_allergies: string[];
    personal_hz: string[];
    personal_hz_others: string;
    medical_history: string[];
    medical_history_others: string;
    bp: string;
    hr: number;
    rr: number;
    spo2: string;
    temperature: number;
    rbs: number;
    created_at: string;
    updated_at: string;
  };
}

export const patientService = {
  list: async (params: PatientListParams = {}) => {
    if (!params.organisation_id) {
      throw new Error('organisation_id is required');
    }

    const queryParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 10).toString(),
      sort_order: params.sort_order || 'desc',
      organisation_id: params.organisation_id,
      ...(params.search ? { search: params.search } : {})
    });

    // Append each status as a separate query param (e.g. ?statuses=admission&statuses=discharge)
    if (params.statuses && params.statuses.length > 0) {
      params.statuses.forEach(status => {
        queryParams.append('statuses', status);
      });
    }

    const response = await fetchApi<PatientListResponse>(
      `${API_ENDPOINTS.PATIENT.LIST}?${queryParams.toString()}`
    );
    return response;
  },

  create: async (organisationId: string, data: Partial<Patient>) => {
    const url = `${API_ENDPOINTS.PATIENT.CREATE}?organisation_id=${organisationId}`;
    // console.log('Creating patient with URL:', url);
    // console.log('Patient data:', data);
    
    return fetchApi<PatientCreateResponse>(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  },

  getDoctors: async (centerId: string) => {
    return fetchApi<DoctorListResponse>(
      API_ENDPOINTS.USER.DOCTORS(centerId)
    );
  },

  getAvailableBeds: async (icuId: string) => {
    return fetchApi<ApiResponse<Bed[]>>(
      API_ENDPOINTS.ICU.BEDS.AVAILABLE(icuId)
    );
  },

  searchICDCodes: async (searchTerm: string) => {
    const isCodeSearch = /^[A-Z0-9]+$/i.test(searchTerm);
    const queryParam = isCodeSearch ?  'description' : 'code' ;
    
    return fetchApi<ICDCodeListResponse>(
      `${API_ENDPOINTS.MASTER.ICD_CODES}?page=1&limit=10&sort_order=desc&${queryParam}=${searchTerm}`
    );
  },

  createICDCode: async (data: { code: string; description: string }) => {
    return fetchApi<ICDCode>(API_ENDPOINTS.MASTER.ICD_CODES, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getById: async (id: string) => {
    debugger
    // console.log("patitent id", id);
    return fetchApi<PatientData>(API_ENDPOINTS.PATIENT.DETAIL(id));
  },

  update: async (id: string, data: Partial<Patient>) => {
    // console.log('Updating patient with ID:', id);
    // console.log('Update data:', data);
    
    const url = `${API_ENDPOINTS.PATIENT.CREATE}?patient_id=${id}`;
    // console.log('Update URL:', url);
    
    return fetchApi<ApiResponse<Patient>>(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  },

  delete: async (id: string) => {
    return fetchApi<ApiResponse<void>>(
      API_ENDPOINTS.PATIENT.DETAIL(id),
      {
        method: 'DELETE'
      }
    );
  },

  addHistory: async (organisationId: string, data: PatientHistoryRequest) => {
    return fetchApi<{ success: boolean; message: string; data: PatientHistoryResponse }>(
      `${API_ENDPOINTS.PATIENT.HISTORY.CREATE}?organisation_id=${organisationId}`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
  },

  addHEENT: async (organisationId: string, data: PatientHEENTRequest) => {
    return fetchApi<ApiResponse<PatientHEENTResponse>>(
      `${API_ENDPOINTS.PATIENT.HEENT.CREATE}?organisation_id=${organisationId}`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
  },

  addInvestigation: async (organisationId: string, data: PatientInvestigationRequest) => {
    return fetchApi<ApiResponse<PatientInvestigationResponse>>(
      `${API_ENDPOINTS.PATIENT.INVESTIGATION.CREATE}?organisation_id=${organisationId}`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
  },

  getPatientInfo: async (id: string) => {
    return fetchApi<PatientInfoResponse>(
      `/api/v1/patients/patients/info?patient_id=${id}`
    );
  },

  updateHistory: async (patientId: string, data: PatientHistoryRequest) => {
    return fetchApi<{ success: boolean; message: string; data: PatientHistoryResponse }>(
      `/api/v1/patients/patient-past-medical-history?patient_id=${patientId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      }
    );
  },

  updateHEENT: async (patientId: string, data: PatientHEENTRequest) => {
    return fetchApi<ApiResponse<PatientHEENTResponse>>(
      `/api/v1/patients/patient-heent?patient_id=${patientId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      }
    );
  },

  updateInvestigation: async (patientId: string, data: PatientInvestigationRequest) => {
    return fetchApi<ApiResponse<PatientInvestigationResponse>>(
      `/api/v1/patients/patient-investigation?patient_id=${patientId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      }
    );
  },

  getDischargeReport: async (patientId: string) => {
    return fetchApi<DischargeReportResponse>(
      API_ENDPOINTS.PATIENT.DISCHARGE_REPORT.GET(patientId)
    );
  },

  createDischargeReport: async (patientId: string, data: DischargeReportData) => {
    return fetchApi<DischargeReportResponse>(
      API_ENDPOINTS.PATIENT.DISCHARGE_REPORT.CREATE(patientId),
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
  },

  downloadDischargeReport: async (patientId: string, patientName: string) => {
    const filename = `Discharge_Report_${patientName}.pdf`;
    return downloadApi(
      API_ENDPOINTS.PATIENT.DISCHARGE_REPORT.DOWNLOAD(patientId),
      filename
    );
  }
}; 