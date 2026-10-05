import axios, { AxiosInstance, AxiosError, HttpStatusCode, InternalAxiosRequestConfig } from 'axios';
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

// Consent required callback (set by app/_layout.tsx)
// PIPA 22조 동의 미완료 사용자 → 약관 화면으로 redirect (B-U Phase 4 / B-AE)
let _onConsentRequired: (() => void) | null = null;

export function setOnConsentRequired(callback: () => void) {
  _onConsentRequired = callback;
}

function notifyConsentRequired() {
  if (_onConsentRequired) {
    _onConsentRequired();
  }
}

// D4: /auth/ 경로는 401 refresh 재시도에서 제외하지만(login/register/refresh 보호),
// 세션 조회의 401은 access token 만료이므로 refresh 1회 후 원 요청을 재시도한다.
const REFRESHABLE_AUTH_PATHS: ReadonlySet<string> = new Set(['/auth/me']);

class MissingRefreshTokenError extends Error {
  constructor() {
    super('No refresh token');
    this.name = 'MissingRefreshTokenError';
  }
}

// refresh가 "인증 실패"로 끝났는지. 네트워크·타임아웃·5xx·Keychain 잠금은 여기에 해당하지 않는다.
function isRefreshAuthFailure(error: unknown): boolean {
  if (error instanceof MissingRefreshTokenError) return true;
  return axios.isAxiosError(error) && error.response?.status === HttpStatusCode.Unauthorized;
}

// Refresh 동시성 단일화: 진행 중이면 동일 Promise를 공유 (race 방지)
let _refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refreshToken = await storage.getItem('refresh_token');
  if (!refreshToken) {
    throw new MissingRefreshTokenError();
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
    const requestPath = originalRequest?.url?.split('?')[0];
    const skipRefresh = isAuthEndpoint && !(requestPath && REFRESHABLE_AUTH_PATHS.has(requestPath));

    // PIPA 22조 consent 미동의 — 약관 화면으로 redirect 후 reject (B-U Phase 4 / B-AE)
    // status 403 + body code === 'CONSENT_REQUIRED'; auth endpoint는 제외 (refresh/login 보호)
    const consentRequired =
      error.response?.status === 403 &&
      (error.response?.data as any)?.code === 'CONSENT_REQUIRED' &&
      !isAuthEndpoint;
    if (consentRequired) {
      notifyConsentRequired();
      return Promise.reject(error);
    }

    // 무한 루프 방지: 같은 요청이 이미 한 번 retry된 경우 더 이상 시도 안 함
    const alreadyRetried = (originalRequest as any)?._retry === true;

    if (error.response?.status === 401 && originalRequest && !skipRefresh && !alreadyRetried) {
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
          // 인증 실패로 끝난 refresh만 세션을 끊는다 — 일시 장애가 영구 로그아웃으로 굳지 않게 토큰 보존
          if (isRefreshAuthFailure(refreshError)) {
            await storage.removeItem('access_token');
            await storage.removeItem('refresh_token');
            notifySessionExpired();
          }
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
