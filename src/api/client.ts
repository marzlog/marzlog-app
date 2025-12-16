/**
 * API Client Configuration
 *
 * Axios instance with interceptors for:
 * - Auth token injection
 * - Token refresh on 401
 * - Error handling
 * - Request/Response logging (dev)
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { API_CONFIG, AUTH_CONFIG } from '@constants/config';
import type { ApiError } from '@types/api';

// ============================================
// Token Management (will be connected to store)
// ============================================
let accessToken: string | null = null;
let refreshToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

export const setTokens = (access: string | null, refresh: string | null) => {
  accessToken = access;
  refreshToken = refresh;
};

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => refreshToken;

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
};

// ============================================
// Create Axios Instance
// ============================================
const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // ============================================
  // Request Interceptor
  // ============================================
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Add auth token if available
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      // Add ngrok bypass header for development
      if (__DEV__ && config.headers) {
        config.headers['ngrok-skip-browser-warning'] = 'true';
      }

      // Log request in development
      if (__DEV__) {
        console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // ============================================
  // Response Interceptor
  // ============================================
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log response in development
      if (__DEV__) {
        console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
      }
      return response;
    },
    async (error: AxiosError<ApiError>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Wait for token refresh
          return new Promise((resolve) => {
            refreshSubscribers.push((newToken: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              resolve(instance(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Attempt to refresh token
          const newTokens = await refreshAccessToken();

          if (newTokens) {
            setTokens(newTokens.accessToken, newTokens.refreshToken);

            // Notify subscribers
            refreshSubscribers.forEach((callback) => callback(newTokens.accessToken));
            refreshSubscribers = [];

            // Retry original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            }
            return instance(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          clearTokens();
          // This will be handled by the auth store
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Log error in development
      if (__DEV__) {
        console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
        console.error(error.response?.data);
      }

      // Transform error
      const apiError: ApiError = {
        message: error.response?.data?.message || error.message || 'Unknown error',
        code: error.response?.data?.code || 'UNKNOWN_ERROR',
        status: error.response?.status || 500,
        details: error.response?.data?.details,
      };

      return Promise.reject(apiError);
    }
  );

  return instance;
};

// ============================================
// Refresh Token Function
// ============================================
const refreshAccessToken = async (): Promise<{ accessToken: string; refreshToken: string } | null> => {
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
    };
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
};

// ============================================
// API Client Instance
// ============================================
export const apiClient = createApiClient();

// ============================================
// Convenience Methods
// ============================================
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
};

export default apiClient;
