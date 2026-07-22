export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_type: string;
  profile_id: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error: string | null;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface UserProfile {
  first_name: string;
  last_name: string;
  full_name: string;
  user_type: string;
  avatar?: string;
}

export interface User {
  id: string;
  type: string;
  profileId: string;
  username: string;
  profile?: UserProfile;
} 