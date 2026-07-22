'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthService, RefreshTokenExpiredError } from '@/services/auth.service';
import { LoginCredentials, User } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const authService = AuthService.getInstance();

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
      // Force a hard navigation to login
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear user state and redirect even if API call fails
      setUser(null);
      window.location.href = '/auth/login';
    }
  };

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = async () => {
      const isAuth = authService.isAuthenticated();
      if (isAuth) {
        try {
          const profileId = authService.getProfileId();
          if (profileId) {
            const response = await fetch(`/api/v1/accounts/users?profile_id=${profileId}`, {
              headers: {
                'Authorization': `Bearer ${authService.getAccessToken()}`
              }
            });
            const data = await response.json();
            
            if (data.success && data.data) {
              setUser({
                id: data.data.id,
                type: authService.getUserType() || '',
                profileId: profileId,
                username: data.data.username,
                profile: {
                  first_name: data.data.current_profile.first_name,
                  last_name: data.data.current_profile.last_name,
                  full_name: data.data.current_profile.full_name,
                  user_type: data.data.current_profile.user_type,
                  avatar: data.data.current_profile.avatar
                }
              });
            }
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
          // Set basic user info even if profile fetch fails
          setUser({
            id: '',
            type: authService.getUserType() || '',
            profileId: authService.getProfileId() || '',
            username: ''
          });
        }

        // If on login page and authenticated, redirect to dashboard
        if (pathname === '/auth/login') {
          router.push('/dashboard');
        }
      } else if (pathname !== '/auth/login' && !pathname.startsWith('/auth/')) {
        // If not authenticated and not on auth pages, redirect to login
        router.push('/auth/login');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname]);

  useEffect(() => {
    // Set up token refresh interval
    const refreshInterval = setInterval(async () => {
      if (authService.shouldRefreshToken()) {
        const refreshToken = authService.getRefreshToken();
        if (refreshToken) {
          try {
            await authService.refreshToken(refreshToken);
          } catch (error) {
            if (error instanceof RefreshTokenExpiredError) {
              // console.log('Refresh token expired, logging out...');
              handleLogout();
            } else {
              console.error('Token refresh failed:', error);
              handleLogout();
            }
          }
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(refreshInterval);
  }, []);

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      const tokens = await authService.login(credentials);
      setUser({
        id: '',
        type: tokens.user_type,
        profileId: tokens.profile_id,
        username: credentials.username
      });
      
      // Force a hard navigation to dashboard immediately
      // Don't set isLoading here as it causes blank page - LoginForm manages its own loading state
      window.location.href = '/dashboard';
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
    isAuthenticated: !!user,
  };

  if (isLoading) {
    return null; // or a loading spinner
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 