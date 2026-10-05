/**
 * apiClient 응답 인터셉터 단위 테스트 (D4 콜드스타트 로그아웃)
 *
 * 불변식:
 *  - /auth/me 401 → refresh 1회 → 원 요청 재시도. 토큰은 refresh까지 인증 실패일 때만 삭제.
 *  - 그 외 /auth/ 경로(refresh 포함)의 401은 refresh를 부르지 않는다(순환 금지).
 */

// secureStorage는 react-native / expo-secure-store를 import한다 — Keychain in-memory 대역으로 대체
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
}));

import axios, { AxiosError, AxiosResponse, HttpStatusCode, InternalAxiosRequestConfig } from 'axios';
import apiClient, { setOnSessionExpired } from '../client';

type Reply = { status: number; data?: unknown };

function respond(config: InternalAxiosRequestConfig, { status, data }: Reply): AxiosResponse {
  const response: AxiosResponse = { data, status, statusText: '', headers: {}, config };
  if (status >= 400) {
    throw new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_REQUEST, config, null, response);
  }
  return response;
}

/** apiClient 요청을 가로채 (url, Authorization) 기록 후 handler 응답을 돌려준다 */
function mockServer(handler: (url: string, auth: string | undefined) => Reply) {
  const calls: Array<{ url: string; auth: string | undefined }> = [];
  apiClient.defaults.adapter = async (config) => {
    const url = config.url ?? '';
    const auth = config.headers?.Authorization?.toString();
    calls.push({ url, auth });
    return respond(config, handler(url, auth));
  };
  return calls;
}

function refreshReply(config: InternalAxiosRequestConfig, reply: Reply) {
  return async () => respond(config, reply);
}

const refreshConfig = { headers: {} } as InternalAxiosRequestConfig;
let postSpy: jest.SpyInstance;
const onSessionExpired = jest.fn();

beforeEach(() => {
  for (const k of Object.keys(mockKeychain)) delete mockKeychain[k];
  mockKeychain.access_token = 'expired-access';
  mockKeychain.refresh_token = 'valid-refresh';
  onSessionExpired.mockReset();
  setOnSessionExpired(onSessionExpired);
  postSpy = jest.spyOn(axios, 'post');
});

afterEach(() => {
  postSpy.mockRestore();
});

describe('apiClient 401 refresh — /auth/me (D4)', () => {
  it('(1) /auth/me 401 → refresh 성공 → 재시도 200 → 토큰 유지', async () => {
    postSpy.mockImplementation(
      refreshReply(refreshConfig, {
        status: HttpStatusCode.Ok,
        data: { access_token: 'new-access', refresh_token: 'new-refresh' },
      })
    );
    const calls = mockServer((_url, auth) =>
      auth === 'Bearer new-access'
        ? { status: HttpStatusCode.Ok, data: { id: 'u-1' } }
        : { status: HttpStatusCode.Unauthorized }
    );

    const res = await apiClient.get('/auth/me');

    expect(res.status).toBe(HttpStatusCode.Ok);
    expect(res.data).toEqual({ id: 'u-1' });
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toMatch(/\/auth\/refresh$/);
    expect(calls.map((c) => c.url)).toEqual(['/auth/me', '/auth/me']);
    expect(mockKeychain.access_token).toBe('new-access');
    expect(mockKeychain.refresh_token).toBe('new-refresh');
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('(2) /auth/me 401 → refresh 401 → 토큰 삭제 + 세션 만료 처리 1회', async () => {
    postSpy.mockImplementation(refreshReply(refreshConfig, { status: HttpStatusCode.Unauthorized }));
    const calls = mockServer(() => ({ status: HttpStatusCode.Unauthorized }));

    await expect(apiClient.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
    expect(mockKeychain.access_token).toBeUndefined();
    expect(mockKeychain.refresh_token).toBeUndefined();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('(3) /auth/refresh 401 → refresh 재시도 없음, 세션 만료 처리 없음', async () => {
    const calls = mockServer(() => ({ status: HttpStatusCode.Unauthorized }));

    await expect(apiClient.post('/auth/refresh', {})).rejects.toBeInstanceOf(AxiosError);

    expect(postSpy).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
    expect(mockKeychain.access_token).toBe('expired-access');
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('로그인 등 나머지 /auth/ 경로 401 → refresh 없음 (현행 유지)', async () => {
    mockServer(() => ({ status: HttpStatusCode.Unauthorized }));

    await expect(apiClient.post('/auth/login', {})).rejects.toBeInstanceOf(AxiosError);

    expect(postSpy).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it.each(['/auth/me', '/media'])('%s: refresh가 5xx로 실패하면 토큰을 지우지 않는다', async (path) => {
    postSpy.mockImplementation(refreshReply(refreshConfig, { status: HttpStatusCode.ServiceUnavailable }));
    mockServer(() => ({ status: HttpStatusCode.Unauthorized }));

    await expect(apiClient.get(path)).rejects.toBeInstanceOf(AxiosError);

    expect(mockKeychain.access_token).toBe('expired-access');
    expect(mockKeychain.refresh_token).toBe('valid-refresh');
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('동시 401 두 건은 refresh 1회를 공유한다', async () => {
    postSpy.mockImplementation(
      refreshReply(refreshConfig, {
        status: HttpStatusCode.Ok,
        data: { access_token: 'new-access', refresh_token: 'new-refresh' },
      })
    );
    mockServer((_url, auth) =>
      auth === 'Bearer new-access' ? { status: HttpStatusCode.Ok } : { status: HttpStatusCode.Unauthorized }
    );

    await Promise.all([apiClient.get('/auth/me'), apiClient.get('/media')]);

    expect(postSpy).toHaveBeenCalledTimes(1);
  });
});
