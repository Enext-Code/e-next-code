import { API_ENDPOINTS } from '@/constants/api';
import { AuthTokens, LoginCredentials, RefreshTokenRequest } from '@/types/auth';
import { fetchApi } from '@/utils/api';
import Cookies from 'js-cookie';

// Define error types
export class RefreshTokenExpiredError extends Error {
  constructor() {
    super('Refresh token has expired');
    this.name = 'RefreshTokenExpiredError';
  }
}

export class AuthService {
  private static instance: AuthService;
  private refreshPromise: Promise<AuthTokens> | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private setTokensInCookies(tokens: AuthTokens) {
    const cookieOptions = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      expires: new Date(Date.now() + tokens.expires_in * 1000)
    };

    // Set cookies client-side
    Cookies.set('accessToken', tokens.access_token, cookieOptions);
    Cookies.set('refreshToken', tokens.refresh_token, cookieOptions);
    Cookies.set('userType', tokens.user_type, cookieOptions);
    Cookies.set('profileId', tokens.profile_id, cookieOptions);
  }

 private clearAllTokens() {
    Cookies.remove('accessToken', { path: '/' });
    Cookies.remove('refreshToken', { path: '/' });
    Cookies.remove('userType', { path: '/' });
    Cookies.remove('profileId', { path: '/' });
  }

  async login(credentials: LoginCredentials) {
    const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Set tokens in cookies if not already set by server
    if (data.success && data.data) {
      this.setTokensInCookies(data.data);
    }

    return data.data;
  }

  async refreshToken(refreshToken: string) {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    try {
      this.refreshPromise = this.performRefresh(refreshToken);
      const tokens = await this.refreshPromise;
      // Set the new tokens in cookies after successful refresh
      this.setTokensInCookies(tokens);
      return tokens;
    } catch (error) {
      // If refresh token is expired or invalid, clear all tokens and throw specific error
      if (error instanceof Error && 
          (error.message.includes('expired') || error.message.includes('invalid'))) {
        this.clearAllTokens();
        throw new RefreshTokenExpiredError();
      }
      throw error;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(refreshToken: string): Promise<AuthTokens> {
    const response = await fetch(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      // Check if the error is due to expired refresh token
      if (response.status === 401 || 
          (data.message && data.message.toLowerCase().includes('expired'))) {
        throw new RefreshTokenExpiredError();
      }
      throw new Error(data.message || 'Token refresh failed');
    }

    return data.data;
  }

  getAccessToken(): string | null {
    return Cookies.get('accessToken') || null;
  }


  getRefreshToken(): string | null {
    return Cookies.get('refreshToken') || null;
  }

  getUserType(): string | null {
    return Cookies.get('userType') || null;
  }

  getProfileId(): string | null {
    return Cookies.get('profileId') || null;
  }

  isAuthenticated(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const userType = this.getUserType();
    const profileId = this.getProfileId();
    
    return !!(accessToken && refreshToken && userType && profileId);
  }

  async logout() {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.getAccessToken()}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Logout failed');
      }

      // Clear all tokens regardless of API response
      this.clearAllTokens();

      return data;
    } catch (error) {
      // Still clear tokens even if API call fails
      this.clearAllTokens();
      throw error;
    }
  }

  shouldRefreshToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      // Decode the JWT to check its expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      
          // Debug log: shows expiry vs current time
      console.log("Token expiry check:", payload.exp, now);
      // Return true if token expires in less than 5 minutes
      return expiryTime - now < 5 * 60 * 1000;
    } catch {
      return false;
    }
  }
} 