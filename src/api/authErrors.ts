import axios, { HttpStatusCode } from 'axios';

/**
 * 인증 실패 판정 — 순수 함수 모음 (RN/네이티브 의존 없음, 단위 테스트 대상).
 *
 * 원칙: 토큰 삭제는 "확정 인증 실패"에서만. 응답 없음·5xx·인증 저장소 장애처럼
 * 다시 시도하면 회복될 수 있는 실패가 영구 로그아웃으로 굳으면 안 된다(D4/D6/D8).
 */

/** 서버가 인증 저장소 장애를 401로 알릴 때의 detail.code (backend routers/auth.py _store_unavailable) */
export const AUTH_STORE_UNAVAILABLE_CODE = 'AUTH_STORE_UNAVAILABLE';

export class MissingRefreshTokenError extends Error {
  constructor() {
    super('No refresh token');
    this.name = 'MissingRefreshTokenError';
  }
}

function detailCode(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('detail' in data)) return undefined;
  const { detail } = data;
  if (typeof detail !== 'object' || detail === null || !('code' in detail)) return undefined;
  return typeof detail.code === 'string' ? detail.code : undefined;
}

/** 401이라도 인증 저장소 장애면 자격 증명 문제가 아니다 */
export function isAuthStoreUnavailable(error: unknown): boolean {
  return axios.isAxiosError(error) && detailCode(error.response?.data) === AUTH_STORE_UNAVAILABLE_CODE;
}

// 4xx 중 다시 시도하면 회복되는 상태 — 토큰 삭제 대상에서 제외
const RETRYABLE_CLIENT_STATUSES: ReadonlySet<number> = new Set([
  HttpStatusCode.RequestTimeout,
  HttpStatusCode.TooManyRequests,
]);

export type AuthCheckFailure =
  | 'auth_failed'            // 확정 인증 실패 → 토큰 삭제
  | 'no_response'            // 네트워크 단절·타임아웃
  | 'server_error'           // 5xx
  | 'retryable_status'       // 408·429 — 4xx지만 자격 증명 문제가 아닌 일시 상태
  | 'auth_store_unavailable' // 401 + AUTH_STORE_UNAVAILABLE
  | 'unknown';               // HTTP 외 예외 — 확정이 아니므로 삭제하지 않는다

/** checkAuth 실패 분류. 'auth_failed'만 토큰을 지운다. (Keychain 잠금은 호출부에서 먼저 판정) */
export function classifyAuthCheckError(error: unknown): AuthCheckFailure {
  if (error instanceof MissingRefreshTokenError) return 'auth_failed';
  if (!axios.isAxiosError(error)) return 'unknown';

  const status = error.response?.status;
  if (status === undefined) return 'no_response';
  if (isAuthStoreUnavailable(error)) return 'auth_store_unavailable';
  if (status >= HttpStatusCode.InternalServerError) return 'server_error';
  if (RETRYABLE_CLIENT_STATUSES.has(status)) return 'retryable_status';
  if (status >= HttpStatusCode.BadRequest) return 'auth_failed';
  return 'unknown';
}
