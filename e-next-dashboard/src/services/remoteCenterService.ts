import { fetchApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error: string | null;
}

export interface RemoteCenter {
  id: string;
  unique_id: string;
  name: string;
  location: string;
  active_patients_count: number;
  total_beds_count: number;
  created_at: string;
  updated_at: string;
  date_of_registration: string;
}

export interface RemoteCenterListData {
  items: RemoteCenter[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface RemoteCenterListParams {
  page?: number;
  limit?: number;
  sort_order?: 'asc' | 'desc';
  search?: string;
}

export const remoteCenterService = {
  list: async (params: RemoteCenterListParams = {}) => {
    const queryParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 100).toString(),
      sort_order: params.sort_order || 'desc',
      ...(params.search ? { search: params.search } : {})
    });

    const response = await fetchApi<RemoteCenterListData>(
      `${API_ENDPOINTS.REMOTE_CENTER.LIST}?${queryParams.toString()}`
    );
    return response;
  },

  create: async (data: Partial<RemoteCenter>) => {
    return fetchApi<ApiResponse<RemoteCenter>>(API_ENDPOINTS.REMOTE_CENTER.CREATE, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getById: async (id: string) => {
    const response = await fetchApi<RemoteCenter>(
      API_ENDPOINTS.REMOTE_CENTER.DETAIL(id)
    );
    return response;
  },

  update: async (id: string, data: Partial<RemoteCenter>) => {
    return fetchApi<ApiResponse<RemoteCenter>>(API_ENDPOINTS.REMOTE_CENTER.DETAIL(id), {
      method: 'PUT',
      body: JSON.stringify({
        unique_id: data.unique_id,
        name: data.name,
        location: data.location
      })
    });
  },

  delete: async (id: string) => {
    return fetchApi<ApiResponse<void>>(API_ENDPOINTS.REMOTE_CENTER.DETAIL(id), {
      method: 'DELETE'
    });
  }
}; 