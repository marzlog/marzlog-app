/**
 * Auth Store (Zustand)
 *
 * Manages authentication state including:
 * - User information
 * - Auth tokens
 * - Login/Logout flow
 * - Token persistence
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setTokens, clearTokens } from '@api/client';
import { authApi } from '@api/auth';
import { AUTH_CONFIG } from '@constants/config';
import type { User, AuthTokens, GoogleLoginRequest, AppleLoginRequest } from '@types/api';

// ============================================
// Types
// ============================================
interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  loginWithGoogle: (request: GoogleLoginRequest) => Promise<void>;
  loginWithApple: (request: AppleLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// ============================================
// Store
// ============================================
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ============================================
      // Initial State
      // ============================================
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      // ============================================
      // Actions
      // ============================================

      /**
       * Initialize auth state from storage
       */
      initialize: async () => {
        const { tokens, user } = get();

        if (tokens?.accessToken && user) {
          // Set tokens in API client
          setTokens(tokens.accessToken, tokens.refreshToken);

          // Check if token is expired
          if (tokens.expiresAt && Date.now() > tokens.expiresAt - AUTH_CONFIG.TOKEN_REFRESH_BUFFER) {
            // Token expired or about to expire, try to refresh
            try {
              const newTokens = await authApi.refreshTokens(tokens.refreshToken);
              const newExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

              setTokens(newTokens.accessToken, newTokens.refreshToken);

              set({
                tokens: {
                  ...newTokens,
                  expiresAt: newExpiresAt,
                },
                isAuthenticated: true,
                isInitialized: true,
              });
            } catch (error) {
              // Refresh failed, clear auth state
              clearTokens();
              set({
                user: null,
                tokens: null,
                isAuthenticated: false,
                isInitialized: true,
              });
            }
          } else {
            // Token still valid
            set({
              isAuthenticated: true,
              isInitialized: true,
            });
          }
        } else {
          set({
            isInitialized: true,
          });
        }
      },

      /**
       * Login with Google
       */
      loginWithGoogle: async (request: GoogleLoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.loginWithGoogle(request);

          // Set tokens in API client
          setTokens(response.tokens.accessToken, response.tokens.refreshToken);

          set({
            user: response.user,
            tokens: response.tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({
            error: message,
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Login with Apple
       */
      loginWithApple: async (request: AppleLoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.loginWithApple(request);

          setTokens(response.tokens.accessToken, response.tokens.refreshToken);

          set({
            user: response.user,
            tokens: response.tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({
            error: message,
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Logout
       */
      logout: async () => {
        set({ isLoading: true });

        try {
          await authApi.logout();
        } catch (error) {
          // Ignore logout errors (might be expired token)
          console.warn('Logout API error:', error);
        } finally {
          // Clear tokens and state regardless of API result
          clearTokens();

          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      /**
       * Refresh user data
       */
      refreshUser: async () => {
        const { isAuthenticated } = get();

        if (!isAuthenticated) {
          return;
        }

        try {
          const user = await authApi.getCurrentUser();
          set({ user });
        } catch (error) {
          console.error('Failed to refresh user:', error);
        }
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Set loading state
       */
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'marzlog-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================
// Selectors
// ============================================
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectAuthError = (state: AuthState) => state.error;
export const selectIsInitialized = (state: AuthState) => state.isInitialized;

export default useAuthStore;
