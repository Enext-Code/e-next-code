import { fetchApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error: string | null;
}

export interface CriticalityItem {
  patient_id: string;
  date: string;
  blood_pressure: string;
  heart_rate: string;
  rhythm: string;
  spo2: string;
  temp: string;
  remarks: string;
  id: string;
  criticality_id: string;
  created_at: string;
  updated_at: string;
}

export interface CriticalityListData {
  items: CriticalityItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface CriticalityListParams {
  page?: number;
  limit?: number;
  patient_id: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateCriticalityRequest {
  patient_id: string;
  date: string;
  blood_pressure: string;
  heart_rate: string;
  rhythm: string;
  spo2: string;
  temp: string;
  remarks: string;
}

export interface CreateCriticalityResponse {
  patient_id: string;
  date: string;
  blood_pressure: string;
  heart_rate: string;
  rhythm: string;
  spo2: string;
  temp: string;
  remarks: string;
  id: string;
  criticality_id: string;
  created_at: string;
  updated_at: string;
}

export const criticalityService = {
  list: async (params: CriticalityListParams) => {
    const queryParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 10).toString(),
      sort_order: params.sort_order || 'desc',
      patient_id: params.patient_id,
    });

    const response = await fetchApi<CriticalityListData>(
      `${API_ENDPOINTS.CRITICALITY.LIST}?${queryParams.toString()}`
    );
    return response;
  },

  create: async (data: CreateCriticalityRequest) => {
    const response = await fetchApi<CreateCriticalityResponse>(
      API_ENDPOINTS.CRITICALITY.LIST.replace('/list', ''),
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
    return response;
  },
};
