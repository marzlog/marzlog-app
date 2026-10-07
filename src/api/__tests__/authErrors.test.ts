/**
 * authErrors 순수 함수 단위 테스트 (D6/D8)
 * 불변식: 'auth_failed'(토큰 삭제)는 확정 인증 실패에서만 나온다.
 */
import { AxiosError, AxiosResponse, HttpStatusCode, InternalAxiosRequestConfig } from 'axios';
import {
  AUTH_STORE_UNAVAILABLE_CODE,
  MissingRefreshTokenError,
  classifyAuthCheckError,
  isAuthStoreUnavailable,
} from '../authErrors';

const config = { headers: {} } as InternalAxiosRequestConfig;

function httpError(status: number, data?: unknown): AxiosError {
  const response: AxiosResponse = { data, status, statusText: '', headers: {}, config };
  return new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_RESPONSE, config, null, response);
}

describe('classifyAuthCheckError', () => {
  it('응답 없음(네트워크) → no_response', () => {
    expect(classifyAuthCheckError(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config))).toBe('no_response');
  });

  it('타임아웃 → no_response', () => {
    expect(classifyAuthCheckError(new AxiosError('timeout', AxiosError.ECONNABORTED, config))).toBe('no_response');
  });

  it.each([HttpStatusCode.InternalServerError, HttpStatusCode.BadGateway, HttpStatusCode.ServiceUnavailable])(
    '%s → server_error',
    (status) => {
      expect(classifyAuthCheckError(httpError(status))).toBe('server_error');
    }
  );

  it.each([HttpStatusCode.RequestTimeout, HttpStatusCode.TooManyRequests])('%s → retryable_status', (status) => {
    expect(classifyAuthCheckError(httpError(status))).toBe('retryable_status');
  });

  it('401 + AUTH_STORE_UNAVAILABLE → auth_store_unavailable', () => {
    const e = httpError(HttpStatusCode.Unauthorized, { detail: { code: AUTH_STORE_UNAVAILABLE_CODE } });
    expect(classifyAuthCheckError(e)).toBe('auth_store_unavailable');
  });

  it.each([HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden, HttpStatusCode.NotFound])(
    '%s(일반 4xx) → auth_failed',
    (status) => {
      expect(classifyAuthCheckError(httpError(status, { detail: { code: 'TOKEN_EXPIRED' } }))).toBe('auth_failed');
    }
  );

  it('refresh token 없음 → auth_failed', () => {
    expect(classifyAuthCheckError(new MissingRefreshTokenError())).toBe('auth_failed');
  });

  it('HTTP 외 예외 → unknown (삭제 대상 아님)', () => {
    expect(classifyAuthCheckError(new TypeError('x'))).toBe('unknown');
    expect(classifyAuthCheckError('string')).toBe('unknown');
  });
});

describe('isAuthStoreUnavailable', () => {
  it('detail.code 일치 시에만 true', () => {
    expect(isAuthStoreUnavailable(httpError(401, { detail: { code: AUTH_STORE_UNAVAILABLE_CODE } }))).toBe(true);
    expect(isAuthStoreUnavailable(httpError(401, { detail: { code: 'TOKEN_INVALID' } }))).toBe(false);
    expect(isAuthStoreUnavailable(httpError(401, { detail: 'plain string' }))).toBe(false);
    expect(isAuthStoreUnavailable(httpError(401))).toBe(false);
    expect(isAuthStoreUnavailable(new Error(AUTH_STORE_UNAVAILABLE_CODE))).toBe(false);
  });
});
