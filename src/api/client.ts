import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { secureStorage as storage } from '../utils/secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.marzlog.com';

// Session expired callback (set by authStore)
let _onSessionExpired: (() => void) | null = null;

export function setOnSessionExpired(callback: () => void) {
  _onSessionExpired = callback;
}

function notifySessionExpired() {
  if (_onSessionExpired) {
    _onSessionExpired();
  }
}

// Refresh 동시성 단일화: 진행 중이면 동일 Promise를 공유 (race 방지)
let _refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refreshToken = await storage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }
  const response = await axios.post(`${API_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  });
  const { access_token, refresh_token: newRefresh } = response.data;
  await storage.setItem('access_token', access_token);
  if (newRefresh) {
    await storage.setItem('refresh_token', newRefresh);
  }
  return access_token;
}

function getOrStartRefresh(): Promise<string> {
  if (!_refreshPromise) {
    _refreshPromise = performRefresh().finally(() => {
      _refreshPromise = null;
    });
  }
  return _refreshPromise;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await storage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');

    // 무한 루프 방지: 같은 요청이 이미 한 번 retry된 경우 더 이상 시도 안 함
    const alreadyRetried = (originalRequest as any)?._retry === true;

    if (error.response?.status === 401 && originalRequest && !isAuthEndpoint && !alreadyRetried) {
      const refreshToken = await storage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // 동시 401 발생 시 단일 refresh Promise를 공유 (race condition 방지)
          const access_token = await getOrStartRefresh();

          (originalRequest as any)._retry = true;
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }

          return apiClient(originalRequest);
        } catch (refreshError) {
          // Clear tokens on refresh failure
          await storage.removeItem('access_token');
          await storage.removeItem('refresh_token');
          notifySessionExpired();
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available — force logout
        await storage.removeItem('access_token');
        await storage.removeItem('refresh_token');
        notifySessionExpired();
      }
    }

    return Promise.reject(error);
  }
);

export { apiClient, storage };
export default apiClient;
