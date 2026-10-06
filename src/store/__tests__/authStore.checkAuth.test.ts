/**
 * authStore.checkAuth 단위 테스트 (D6/D8 오프라인 콜드스타트)
 *
 * 불변식:
 *  - 토큰 삭제는 확정 인증 실패(4xx)에서만.
 *  - 일시 장애(응답 없음·5xx·AUTH_STORE_UNAVAILABLE·Keychain 잠금)는 토큰 유지 + authCheckDeferred.
 *  - 연결 없음이 확정이면 /auth/me를 호출하지 않는다.
 */

const mockKeychain: Record<string, string> = {};
jest.mock('../../utils/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(async (k: string) => mockKeychain[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockKeychain[k] = v;
    }),
    removeItem: jest.fn(async (k: string) => {
      delete mockKeychain[k];
    }),
  },
  SECURE_KEYS: {},
  isKeychainUnavailableError: (e: unknown) => e instanceof Error && e.message.includes('-25308'),
}));
jest.mock('../../api/auth', () => {
  class TypedError extends Error {}
  return {
    __esModule: true,
    default: { getCurrentUser: jest.fn() },
    EmailRecentlyWithdrawnError: TypedError,
    AccountAlreadyExistsError: TypedError,
    AccountExistsDifferentProviderError: TypedError,
    EmailRateLimitedError: TypedError,
  };
});
jest.mock('../../api/client', () => ({ setOnSessionExpired: jest.fn() }));
jest.mock('../../utils/errorMessages', () => ({ extractErrorMessage: jest.fn() }));
jest.mock('../../utils/sentry', () => ({ captureError: jest.fn() }));
jest.mock('../settingsStore', () => ({
  useSettingsStore: { getState: () => ({ language: 'ko', setLanguage: jest.fn(async () => {}) }) },
  backendToAiMode: jest.fn(),
}));
jest.mock('../../i18n', () => ({ setLanguage: jest.fn(), isSupportedLocale: () => false }));
jest.mock('../../services/pushTokenService', () => ({
  registerPushToken: jest.fn(async () => {}),
  unregisterPushToken: jest.fn(async () => {}),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { fetch: jest.fn() } }));

import { AxiosError, AxiosResponse, HttpStatusCode, InternalAxiosRequestConfig } from 'axios';
import NetInfo from '@react-native-community/netinfo';
import authApi from '../../api/auth';
import { AUTH_STORE_UNAVAILABLE_CODE } from '../../api/authErrors';
import { captureError } from '../../utils/sentry';
import { useAuthStore } from '../authStore';

const getCurrentUser = authApi.getCurrentUser as jest.Mock;
const netInfoFetch = NetInfo.fetch as jest.Mock;
const captureErrorMock = captureError as jest.Mock;
const config = { headers: {} } as InternalAxiosRequestConfig;

function httpError(status: number, data?: unknown): AxiosError {
  const response: AxiosResponse = { data, status, statusText: '', headers: {}, config };
  return new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_RESPONSE, config, null, response);
}

const USER = { id: 'u-1', app_lang: null };

function expectDeferredWithTokens(reason: 'offline' | 'unavailable') {
  const s = useAuthStore.getState();
  expect(s.isAuthenticated).toBe(false);
  expect(s.authCheckDeferred).toBe(true);
  expect(s.authCheckDeferredReason).toBe(reason);
  expect(s.isLoading).toBe(false);
  expect(mockKeychain.access_token).toBe('access');
  expect(mockKeychain.refresh_token).toBe('refresh');
}

beforeEach(() => {
  for (const k of Object.keys(mockKeychain)) delete mockKeychain[k];
  mockKeychain.access_token = 'access';
  mockKeychain.refresh_token = 'refresh';
  getCurrentUser.mockReset();
  captureErrorMock.mockReset();
  netInfoFetch.mockReset();
  netInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    authCheckDeferred: false,
    authCheckDeferredReason: null,
  });
});

describe('checkAuth 실패 분류 (D6/D8)', () => {
  it('(1) 네트워크 오류 → 토큰 유지 + deferred(unavailable)', async () => {
    getCurrentUser.mockRejectedValue(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config));

    await useAuthStore.getState().checkAuth();

    expectDeferredWithTokens('unavailable');
    expect(captureErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ scope: 'checkAuth.deferred', failure: 'no_response' })
    );
  });

  it('(1-b) 요청 실패 후 NetInfo가 연결 없음을 확인 → deferred(offline)', async () => {
    netInfoFetch
      .mockResolvedValueOnce({ isConnected: null, isInternetReachable: null })
      .mockResolvedValueOnce({ isConnected: false, isInternetReachable: false });
    getCurrentUser.mockRejectedValue(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config));

    await useAuthStore.getState().checkAuth();

    expectDeferredWithTokens('offline');
  });

  it('(2) 5xx → 토큰 유지 + deferred', async () => {
    getCurrentUser.mockRejectedValue(httpError(HttpStatusCode.ServiceUnavailable));

    await useAuthStore.getState().checkAuth();

    expectDeferredWithTokens('unavailable');
  });

  it('(3) AUTH_STORE_UNAVAILABLE 401 → 토큰 유지 + deferred', async () => {
    getCurrentUser.mockRejectedValue(
      httpError(HttpStatusCode.Unauthorized, { detail: { code: AUTH_STORE_UNAVAILABLE_CODE } })
    );

    await useAuthStore.getState().checkAuth();

    expectDeferredWithTokens('unavailable');
  });

  it.each([HttpStatusCode.RequestTimeout, HttpStatusCode.TooManyRequests])(
    '(3-b) %s → 토큰 유지 + deferred',
    async (status) => {
      getCurrentUser.mockRejectedValue(httpError(status));

      await useAuthStore.getState().checkAuth();

      expectDeferredWithTokens('unavailable');
    }
  );

  it('(4) 일반 401(refresh 실패) → 토큰 삭제, 보류 아님', async () => {
    getCurrentUser.mockRejectedValue(httpError(HttpStatusCode.Unauthorized, { detail: { code: 'TOKEN_EXPIRED' } }));

    await useAuthStore.getState().checkAuth();

    const s = useAuthStore.getState();
    expect(mockKeychain.access_token).toBeUndefined();
    expect(mockKeychain.refresh_token).toBeUndefined();
    expect(s.authCheckDeferred).toBe(false);
    expect(s.authCheckDeferredReason).toBeNull();
    expect(s.isAuthenticated).toBe(false);
  });

  it('(5) 오프라인 사전 감지 → /auth/me 미호출 + deferred(offline)', async () => {
    netInfoFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });

    await useAuthStore.getState().checkAuth();

    expect(getCurrentUser).not.toHaveBeenCalled();
    expectDeferredWithTokens('offline');
  });

  it('(6) Keychain 잠금 → 현행 유지(보류 + 토큰 보존 + keychainUnavailable 계측)', async () => {
    const { secureStorage } = jest.requireMock('../../utils/secureStorage');
    (secureStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('User interaction is not allowed. -25308'));

    await useAuthStore.getState().checkAuth();

    expect(getCurrentUser).not.toHaveBeenCalled();
    expectDeferredWithTokens('unavailable');
    expect(captureErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ scope: 'checkAuth.keychainUnavailable' })
    );
  });

  it('부트 /auth/me는 전용 타임아웃(10초)으로 호출된다', async () => {
    getCurrentUser.mockResolvedValue(USER);

    await useAuthStore.getState().checkAuth();

    expect(getCurrentUser).toHaveBeenCalledWith({ timeout: 10_000 });
  });

  it('보류 중 재시도는 결과가 나올 때까지 authCheckDeferred를 유지하고, 성공 시 함께 해제한다', async () => {
    useAuthStore.setState({ authCheckDeferred: true, authCheckDeferredReason: 'offline', isLoading: false });
    let resolveUser: (u: typeof USER) => void = () => {};
    getCurrentUser.mockReturnValue(new Promise((r) => { resolveUser = r; }));

    const pending = useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().authCheckDeferred).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(true);

    await new Promise(setImmediate);
    resolveUser(USER);
    await pending;

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.authCheckDeferred).toBe(false);
    expect(s.authCheckDeferredReason).toBeNull();
  });
});
