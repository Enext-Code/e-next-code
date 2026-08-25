import { fetchApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';

export interface PlanLineTemplate {
  id: string;
  field_type: string;
  text: string;
  usage_count: number;
}

export interface PlanLineTemplateListResponse {
  items: PlanLineTemplate[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export const planLineTemplateService = {
  search: async (fieldType: string, search: string, limit = 8) => {
    const query = new URLSearchParams({
      field_type: fieldType,
      search,
      limit: String(limit),
    });

    return fetchApi<PlanLineTemplateListResponse>(
      `${API_ENDPOINTS.MASTER.PLAN_LINE_TEMPLATES}?${query.toString()}`
    );
  },
};
