import { create } from 'zustand';
import authApi from '../api/auth';
import { setOnSessionExpired } from '../api/client';
import type { User, AuthState } from '../types/auth';
import { extractErrorMessage } from '../utils/errorMessages';
import { secureStorage as storage, SECURE_KEYS } from '../utils/secureStorage';
import { useSettingsStore, backendToAiMode } from './settingsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthStore extends AuthState {
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth methods
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forceLogout: () => void;
  deleteAccount: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Setters
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Google Login
  loginWithGoogle: async (idToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.googleLogin(idToken);

      // Store tokens
      await storage.setItem('access_token', response.tokens.access_token);
      await storage.setItem('refresh_token', response.tokens.refresh_token);

      set({
        user: response.user,
        accessToken: response.tokens.access_token,
        refreshToken: response.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const message = extractErrorMessage(error, 'Login failed');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // Email Login
  loginWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.emailLogin(email, password);

      await storage.setItem('access_token', response.tokens.access_token);
      await storage.setItem('refresh_token', response.tokens.refresh_token);

      set({
        user: response.user,
        accessToken: response.tokens.access_token,
        refreshToken: response.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const message = extractErrorMessage(error, 'Login failed');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // Email Register
  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(name, email, password);

      await storage.setItem('access_token', response.tokens.access_token);
      await storage.setItem('refresh_token', response.tokens.refresh_token);

      set({
        user: response.user,
        accessToken: response.tokens.access_token,
        refreshToken: response.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const message = extractErrorMessage(error, 'Registration failed');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // Logout
  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      await storage.removeItem('access_token');
      await storage.removeItem('refresh_token');

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  // Force logout (no API call — used when session expired)
  forceLogout: () => {
    storage.removeItem('access_token');
    storage.removeItem('refresh_token');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  // Delete Account
  deleteAccount: async () => {
    try {
      await authApi.deleteAccount();
    } catch {
      throw new Error('Account deletion failed');
    } finally {
      // Clear auth tokens
      await storage.removeItem('access_token');
      await storage.removeItem('refresh_token');

      // Clear app lock / PIN data
      await storage.removeItem(SECURE_KEYS.PIN_HASH);
      await storage.removeItem(SECURE_KEYS.APP_LOCK_ENABLED);

      // Clear onboarding flag so re-signup shows onboarding again
      await AsyncStorage.removeItem('@marzlog_onboarding_completed');

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  // Check auth on app start
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await storage.getItem('access_token');

      if (!token) {
        set({ isLoading: false });
        return;
      }

      const user = await authApi.getCurrentUser();
      const refreshToken = await storage.getItem('refresh_token');

      set({
        user,
        accessToken: token,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });

      // Sync server analysis_mode to local settings (without triggering API call back)
      if (user.analysis_mode) {
        const localMode = backendToAiMode(user.analysis_mode);
        if (useSettingsStore.getState().aiMode !== localMode) {
          useSettingsStore.getState().syncAIModeFromServer(localMode);
        }
      }
    } catch {
      // Clear invalid tokens
      await storage.removeItem('access_token');
      await storage.removeItem('refresh_token');
      set({ isLoading: false });
    }
  },

}));

// Register session expired callback: 401 refresh failure → forceLogout → _layout.tsx redirects to /login
setOnSessionExpired(() => useAuthStore.getState().forceLogout());

export default useAuthStore;
