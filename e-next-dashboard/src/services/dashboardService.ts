import { fetchApi } from '@/utils/api';
import { 
  DashboardResponse, 
  DashboardFilters, 
  OrganisationListData, 
  OrganisationListParams 
} from '@/types/dashboard';

export const dashboardService = {
  // Get dashboard counts with date range filters
  getCounts: async (filters: DashboardFilters) => {
    const params = new URLSearchParams({
      start_date: filters.start_date,
      end_date: filters.end_date,
      ...(filters.organisation_id ? { organisation_id: filters.organisation_id } : {})
    });

    const endpoint = `/api/v1/dashboard/counts?${params.toString()}`;
    
    return fetchApi<DashboardResponse['data']>(endpoint, {
      method: 'GET',
    });
  },

  // Get dashboard counts for a specific date range
  getCountsForDateRange: async (startDate: string, endDate: string) => {
    return dashboardService.getCounts({
      start_date: startDate,
      end_date: endDate,
    });
  },

  // Get dashboard counts for today
  getCountsForToday: async () => {
    const today = new Date().toISOString().split('T')[0];
    return dashboardService.getCounts({
      start_date: today,
      end_date: today,
    });
  },

  // Get dashboard counts for current month
  getCountsForCurrentMonth: async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return dashboardService.getCounts({
      start_date: startOfMonth.toISOString().split('T')[0],
      end_date: endOfMonth.toISOString().split('T')[0],
    });
  },

  // Get dashboard counts for last 7 days
  getCountsForLastWeek: async () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    
    return dashboardService.getCounts({
      start_date: weekStart.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    });
  },

  // Get dashboard counts for last 30 days
  getCountsForLastMonth: async () => {
    const now = new Date();
    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 30);
    
    return dashboardService.getCounts({
      start_date: monthStart.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    });
  },

  // Get dashboard counts for a specific organization
  getCountsForOrganisation: async (organisationId: string, startDate: string, endDate: string) => {
    return dashboardService.getCounts({
      start_date: startDate,
      end_date: endDate,
      organisation_id: organisationId,
    });
  },

  // Get dashboard counts for today with organization filter
  getCountsForTodayWithOrg: async (organisationId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dashboardService.getCounts({
      start_date: today,
      end_date: today,
      organisation_id: organisationId,
    });
  },

  // Get dashboard counts for current month with organization filter
  getCountsForCurrentMonthWithOrg: async (organisationId: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return dashboardService.getCounts({
      start_date: startOfMonth.toISOString().split('T')[0],
      end_date: endOfMonth.toISOString().split('T')[0],
      organisation_id: organisationId,
    });
  },

  // Organisation service methods
  organisations: {
    // Get list of organisations
    list: async (params: OrganisationListParams = {}) => {
      const queryParams = new URLSearchParams({
        page: (params.page || 1).toString(),
        limit: (params.limit || 100).toString(),
        sort_order: params.sort_order || 'desc',
        ...(params.search ? { search: params.search } : {})
      });

      const response = await fetchApi<OrganisationListData>(
        `/api/v1/organisations/organisations?${queryParams.toString()}`
      );
      return response;
    },

    // Get organisation by ID
    getById: async (id: string) => {
      const response = await fetchApi<OrganisationListData>(
        `/api/v1/organisations/organisations?organisation_id=${id}`
      );
      return response;
    }
  }
};
