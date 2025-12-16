/**
 * Authentication API
 */

import { api } from './client';
import type {
  AuthResponse,
  GoogleLoginRequest,
  AppleLoginRequest,
  User,
} from '@types/api';

// ============================================
// Auth Endpoints
// ============================================

/**
 * Login with Google OAuth
 */
export const loginWithGoogle = async (request: GoogleLoginRequest): Promise<AuthResponse> => {
  const response = await api.post<{
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      email: string;
      oauth_provider: string;
      role: string;
      created_at: string;
      updated_at: string;
    };
  }>('/auth/google', {
    id_token: request.idToken,
  });

  // Transform response to match our types
  return {
    tokens: {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    user: {
      id: response.user.id,
      email: response.user.email,
      oauthProvider: response.user.oauth_provider as 'google' | 'apple',
      role: response.user.role as 'user' | 'admin',
      createdAt: response.user.created_at,
      updatedAt: response.user.updated_at,
    },
  };
};

/**
 * Login with Apple OAuth
 */
export const loginWithApple = async (request: AppleLoginRequest): Promise<AuthResponse> => {
  const response = await api.post<{
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      email: string;
      oauth_provider: string;
      role: string;
      created_at: string;
      updated_at: string;
    };
  }>('/auth/apple', {
    id_token: request.idToken,
    authorization_code: request.authorizationCode,
    full_name: request.fullName,
  });

  return {
    tokens: {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    },
    user: {
      id: response.user.id,
      email: response.user.email,
      oauthProvider: response.user.oauth_provider as 'google' | 'apple',
      role: response.user.role as 'user' | 'admin',
      createdAt: response.user.created_at,
      updatedAt: response.user.updated_at,
    },
  };
};

/**
 * Refresh access token
 */
export const refreshTokens = async (
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  const response = await api.post<{
    access_token: string;
    refresh_token: string;
  }>('/auth/refresh', {
    refresh_token: refreshToken,
  });

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
  };
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<{
    id: string;
    email: string;
    oauth_provider: string;
    role: string;
    created_at: string;
    updated_at: string;
  }>('/auth/me');

  return {
    id: response.id,
    email: response.email,
    oauthProvider: response.oauth_provider as 'google' | 'apple',
    role: response.role as 'user' | 'admin',
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  };
};

/**
 * Logout
 */
export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

// ============================================
// Export all auth functions
// ============================================
export const authApi = {
  loginWithGoogle,
  loginWithApple,
  refreshTokens,
  getCurrentUser,
  logout,
};

export default authApi;
