import { fetchApi, uploadApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_type: string;
  designation: string;
  role_type: string;
  gender: string;
  date_of_birth: string;
  is_primary: boolean;
  avatar: string;
  language: string;
  theme: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  country_code: string;
  mobile_number: string;
  full_mobile_number: string;
  primary_profile: UserProfile;
  current_profile: UserProfile;
  profiles_count: number | null;
  current_organisation_id: string;
}

export interface UserListData {
  items: User[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  sort_order?: 'asc' | 'desc';
  organisation_id?: string;
  search?: string;
  role_type?: string;
}

export const userService = {
  list: async (params: UserListParams = {}) => {
    const queryParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 10).toString(),
      sort_order: params.sort_order || 'desc',
      ...(params.organisation_id ? { organisation_id: params.organisation_id } : {}),
      ...(params.search ? { search: params.search } : {}),
      ...(params.role_type ? { role_type: params.role_type } : {})
    });

    const response = await fetchApi<UserListData>(
      `${API_ENDPOINTS.USER.LIST}?${queryParams.toString()}`
    );
    return response;
  },

  create: async (data: Partial<User>) => {
    return fetchApi(API_ENDPOINTS.USER.CREATE, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  createWithSignature: async (userData: Partial<User>, signatureFile: File) => {
    const formData = new FormData();
    formData.append('user_data', JSON.stringify(userData));
    formData.append('signature_file', signatureFile);
    
    return uploadApi(API_ENDPOINTS.USER.CREATE_WITH_SIGNATURE, formData);
  },

  update: async (id: string, data: Partial<User>) => {
    return fetchApi(API_ENDPOINTS.USER.DETAIL(id), {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  delete: async (id: string) => {
    return fetchApi(API_ENDPOINTS.USER.DETAIL(id), {
      method: 'DELETE'
    });
  },

  updateOrganizationMember: async (memberId: string, data: Partial<User>) => {
    return fetchApi(API_ENDPOINTS.REMOTE_CENTER.MEMBERS.UPDATE(memberId), {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  getUserByProfileId: async (profileId: string) => {
    const response = await fetchApi<{ data: User }>(
      `${API_ENDPOINTS.USER.DETAIL(profileId)}`
    );
    return response;
  },

  activate: async (id: string) => {
    return fetchApi(API_ENDPOINTS.USER.ACTIVATE(id), {
      method: 'PATCH'
    });
  },

  deactivate: async (id: string) => {
    return fetchApi(API_ENDPOINTS.USER.DEACTIVATE(id), {
      method: 'PATCH'
    });
  },

  getSignatureUrl: async (id: string) => {
    return fetchApi<{ signature_url: string }>(API_ENDPOINTS.USER.SIGNATURE_URL(id));
  },

  updateSignature: async (id: string, signatureFile: File) => {
    const formData = new FormData();
    formData.append('signature_file', signatureFile);
    
    return uploadApi(API_ENDPOINTS.USER.UPDATE_SIGNATURE(id), formData);
  }
}; 