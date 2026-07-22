import { fetchApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';

export interface ICU {
  id: string;
  organisation_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  total_beds: number;
}

export interface ICUListData {
  items: ICU[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ICUListParams {
  page?: number;
  limit?: number;
  sort_order?: 'asc' | 'desc';
  organisation_id: string;
}

export const icuService = {
  list: async (params: ICUListParams) => {
    const queryParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 10).toString(),
      sort_order: params.sort_order || 'desc',
      organisation_id: params.organisation_id
    });

    const response = await fetchApi<ICUListData>(
      `${API_ENDPOINTS.ICU.LIST}?${queryParams.toString()}`
    );
    return response;
  },

  create: async (data: { organisation_id: string; name: string; total_beds: number }) => {
    return fetchApi<ICU>(API_ENDPOINTS.ICU.CREATE, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  delete: async (id: string) => {
    return fetchApi<ICU>(API_ENDPOINTS.ICU.DELETE(id), {
      method: 'DELETE'
    });
  }
}; 