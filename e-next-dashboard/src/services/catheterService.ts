import { fetchApi, deleteApi } from '@/utils/api';

export interface CatheterEntry {
  id?: string;
  patient_id?: string;
  type: string | null;
  catheter_type: string | null;
  size: number | null;
  site: string | null;
  date_of_insertion: string | null;
  date_of_removal: string | null;
  days_in_use: number | null;
  notes?: string | null;
  inserted_by?: string | null;
  removed_by?: string | null;
  organisation_id?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  created_by_profile?: string;
  updated_by_profile?: string;
}

export interface CatheterData {
  entries: CatheterEntry[];
}

export interface CatheterListResponse {
    items: CatheterEntry[];
    total: number;
    page: number;
    limit: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface CatheterCreateResponse {
  success: boolean;
  message: string;
  data: CatheterEntry[];
  error: string | null;
}
export interface CatheterDeleteResponse {
  success: boolean;
  message: string;
  details: null;
  error_code: string | null;
}
export const catheterService = {
  // Get catheters for a patient
  getByPatientId: async (patientId: string, page: number = 1, pageSize: number = 100) => {
    const response = await fetchApi<CatheterListResponse>(
      `/api/v1/patients/patient-catheters?page=${page}&page_size=${pageSize}&patient_id=${patientId}`
    );
    return response;
  },

  // Create new catheters for a patient
  create: async (patientId: string, data: CatheterData) => {
    return fetchApi<CatheterCreateResponse>(
      `/api/v1/patients/patient-catheters/patient-catheters?patient_id=${patientId}`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
  },

  // Update a specific catheter
  update: async (catheterId: string, data: Partial<CatheterEntry>) => {
    return fetchApi<CatheterCreateResponse>(
      `/api/v1/patients/patient-catheters/${catheterId}`,
      {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
  },

  // Delete a specific catheter
  delete: async (catheterId: string) => {
    return deleteApi<CatheterDeleteResponse>(
      `/api/v1/patients/patient-catheters/${catheterId}`
    );
  }
};
