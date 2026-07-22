export interface DashboardCounts {
  total_patients: number;
  active_patients: number;
  discharged_patients: number;
  inactive_patients: number;
  orphan_patients: number;
  new_admissions: number;
  total_doctors: number;
  total_nurses: number;
  total_staff: number;
  remote_centers_count: number;
  occupied_beds: number;
  total_beds: number;
  bed_occupancy_rate: number;
  date_range: string;
}

export interface DashboardData {
  counts: DashboardCounts;
  generated_at: string;
}

export interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardData;
  error: string | null;
}

export interface DashboardFilters {
  start_date: string;
  end_date: string;
  organisation_id?: string;
}

export interface Organisation {
  id: string;
  unique_id: string;
  name: string;
  location: string;
  created_at: string;
  updated_at: string;
}

export interface OrganisationListData {
  items: Organisation[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface OrganisationListParams {
  page?: number;
  limit?: number;
  sort_order?: 'asc' | 'desc';
  search?: string;
}
