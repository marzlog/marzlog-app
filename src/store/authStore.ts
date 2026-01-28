import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import authApi from '../api/auth';
import type { User, AuthState } from '../types/auth';

// Storage abstraction
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

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
  checkAuth: () => Promise<void>;

  // Mock login for development
  mockLogin: () => Promise<void>;
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
      const message = error.response?.data?.detail || 'Login failed';
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
      const message = error.response?.data?.detail || 'Login failed';
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
      const message = error.response?.data?.detail || 'Registration failed';
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
    } catch {
      // Clear invalid tokens
      await storage.removeItem('access_token');
      await storage.removeItem('refresh_token');
      set({ isLoading: false });
    }
  },

  // Mock login for development (uses real backend dev-login)
  mockLogin: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await authApi.devLogin('prettysuh@gmail.com');

      await storage.setItem('access_token', response.tokens.access_token);
      await storage.setItem('refresh_token', response.tokens.refresh_token);

      set({
        user: response.user as User,
        accessToken: response.tokens.access_token,
        refreshToken: response.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Dev login failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },
}));

export default useAuthStore;
