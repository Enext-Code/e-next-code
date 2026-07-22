import { fetchApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';
import { RespiratoryData } from '@/components/forms/RespiratoryForm';
import { BloodGasData } from '@/components/forms/BloodGasForm';
import { VitalsData } from '@/components/forms/VitalsForm';
import { FluidData } from '@/components/forms/FluidForm';
import { GCSData } from '@/components/forms/GCSForm';

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: string;
  error_code: 'NOT_FOUND' | string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  error: null;
}

export interface ProgressSheetEntry {
    time: string;
    gcs: {
      values: {
        "Eye Opening": number | null;
        "Verbal Response": number | null;
        "Motor Response": number | null;
        "Right Pupil Size": string | null;
        "Right Pupil Reaction": string | null;
        "Left Pupil Size": string | null;
        "Left Pupil Reaction": string | null;
        "Pupil Type": string | null;
        "Sedation": boolean;
        "Pain": boolean;
        "RUL": string | null;
        "LUL": string | null;
        "LLL": string | null;
        "RLL": string | null;
      };
    } | null;
    fluid: any | null;
    vitals: any | null;
    blood_gas: any | null;
    respiratory: any | null;
    catheter: any | null;
    recorded_by: string | null;
    recorded_at: string | null;
  }
  
export interface ProgressSheet {
    id: string;
    sheet_id: string;
    patient_id: string;
    date: string;
    entries: ProgressSheetEntry[];
    created_at: string;
    updated_at: string;
  }

export  interface ProgressSheetResponse {
  success: boolean;
  message: string;
  data: ProgressSheet | null;
  error: any;
  entries: ProgressSheetEntry[] | null;
  error_code: string | null;
  
}



export interface ProgressSheetListParams {
  patient_id?: string;
  page?: number;
  limit?: number;
  sort_order?: 'asc' | 'desc';
}

export interface ProgressSheetListData {
  items: ProgressSheet[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export const progressSheetService = {
  list: async (params: ProgressSheetListParams = {}) => {
    const queryParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 10).toString(),
      sort_order: params.sort_order || 'desc',
      ...(params.patient_id ? { patient_id: params.patient_id } : {})
    });

    return fetchApi<ProgressSheetListData>(
      `/api/v1/investigation-reports/progress-sheets?${queryParams.toString()}`
    );
  },

  create: async (organisationId: string, data: { patient_id: string; date: string; entries: ProgressSheetEntry[] }) => {
    return fetchApi<ProgressSheetResponse>(
      `${API_ENDPOINTS.PROGRESS_SHEET.CREATE}?organisation_id=${organisationId}`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
  },

  getByDate: async (patientId: string, date: string) => {
    return fetchApi<ProgressSheetResponse>(
      `${API_ENDPOINTS.PROGRESS_SHEET.GET_BY_DATE(patientId, date)}`
    );
  },

  ensureByDate: async (patientId: string, date: string, organisationId: string | null = null) => {
    const orgIdParam = organisationId === null ? 'null' : organisationId;
    return fetchApi<ProgressSheetResponse>(
      `${API_ENDPOINTS.PROGRESS_SHEET.ENSURE_BY_DATE(patientId, date)}?organisation_id=${orgIdParam}`
    );
  },

  getBySheetId: async (sheetId: string) => {
    return fetchApi<ProgressSheetResponse>(
      API_ENDPOINTS.PROGRESS_SHEET.GET_BY_SHEET_ID(sheetId)
    );
  },

  updateEntry: async (sheetId: string, entry: ProgressSheetEntry) => {
    return fetchApi<ProgressSheetResponse>(
      API_ENDPOINTS.PROGRESS_SHEET.UPDATE_ENTRY(sheetId),
      {
        method: 'PUT',
        body: JSON.stringify(entry)
      }
    );
  },

  updateCatheter: async (sheetId: string, time: string, catheterData: any, organisationId: string | null = null) => {
    const formData = new URLSearchParams();
    formData.append('time', time);
    formData.append('catheter_data', JSON.stringify(catheterData));

    return fetchApi(
      `${API_ENDPOINTS.PROGRESS_SHEET.UPDATE_CATHETER(sheetId)}?organisation_id=${organisationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );
  },

updateRespiratoryEntry: async (sheetId: string, time: string, respiratoryData: RespiratoryData, organisationId: string | null = null  ) => {
    const formData = new URLSearchParams();
    formData.append('time', time);
    formData.append('respiratory_data', JSON.stringify(respiratoryData));

    return fetchApi(
      `${API_ENDPOINTS.PROGRESS_SHEET.UPDATE_RESPIRATORY(sheetId)}?organisation_id=${organisationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );
  },

  updateBloodGasEntry: async (sheetId: string, time: string, bloodGasData: BloodGasData, organisationId: string | null = null) => {
    const formData = new URLSearchParams();
    formData.append('time', time);
    formData.append('blood_gas_data', JSON.stringify(bloodGasData));

    return fetchApi(
      `${API_ENDPOINTS.PROGRESS_SHEET.UPDATE_BLOOD_GAS(sheetId)}?organisation_id=${organisationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );
  },

  updateVitalsEntry: async (sheetId: string, time: string, vitalsData: VitalsData, organisationId: string | null = null) => {
    const formData = new URLSearchParams();
    formData.append('time', time);
    formData.append('vitals_data', JSON.stringify(vitalsData));

    return fetchApi(
      `${API_ENDPOINTS.PROGRESS_SHEET.UPDATE_VITALS(sheetId)}?organisation_id=${organisationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );
  },

  updateFluidEntry: async (sheetId: string, time: string, fluidData: FluidData, organisationId: string | null = null) => {
    const formData = new URLSearchParams();
    formData.append('time', time);
    formData.append('fluid_data', JSON.stringify(fluidData));

    return fetchApi(
      `${API_ENDPOINTS.PROGRESS_SHEET.UPDATE_FLUID(sheetId)}?organisation_id=${organisationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );
  },

  updateGCSEntry: async (sheetId: string, time: string, gcsData: GCSData, organisationId: string | null = null) => {
    const formData = new URLSearchParams();
    formData.append('time', time);
    formData.append('gcs_data', JSON.stringify(gcsData));

    return fetchApi(
      `${API_ENDPOINTS.PROGRESS_SHEET.UPDATE_GCS(sheetId)}?organisation_id=${organisationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );
  },
}; 