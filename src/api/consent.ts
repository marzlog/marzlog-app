/**
 * Consent API — PIPA 22조 입증 책임 충족.
 *
 * Backend: POST /users/me/consent (JWT 필수, 멱등 처리)
 * Versions are hardcoded; B-H (재동의 강제 화면 + 동기화 절차) 작업 시 통합 처리.
 */
import apiClient from './client';

export const CURRENT_TERMS_VERSION = '2026-05-07';
export const CURRENT_PRIVACY_VERSION = '2026-05-07';

export const ConsentErrorCode = {
  AGE_14_REQUIRED: 'AGE_14_REQUIRED',
  TERMS_VERSION_MISMATCH: 'TERMS_VERSION_MISMATCH',
  PRIVACY_VERSION_MISMATCH: 'PRIVACY_VERSION_MISMATCH',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
} as const;

export type ConsentErrorCodeType = (typeof ConsentErrorCode)[keyof typeof ConsentErrorCode];

export interface ConsentRequest {
  terms_version: string;
  privacy_version: string;
  age_14_confirmed: boolean;
  marketing_opt_in: boolean;
}

export interface ConsentResponse {
  user_id: string;
  terms_version: string | null;
  privacy_version: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  age_14_confirmed: boolean;
  marketing_opt_in: boolean;
}

/**
 * Record user consent. JWT 자동 첨부 (apiClient interceptor).
 *
 * @throws AxiosError on network/4xx. Caller may catch silently
 *   (가입 성공 후 consent 실패는 다음 로그인 시 재시도 — B-H 정책).
 */
export async function recordConsent(payload: ConsentRequest): Promise<ConsentResponse> {
  const response = await apiClient.post<ConsentResponse>('/users/me/consent', payload);
  return response.data;
}

export interface RecordConsentSafeOptions {
  ageConfirmed: boolean;
  marketingOptIn: boolean;
}

/**
 * Consent 기록 silent wrapper.
 * register / terms-agreement(from=login) 양쪽 공유.
 *
 * 실패 시 throw 안 함 → ok=false 반환.
 * 5xx는 axios interceptor가 Sentry로 자동 캡처 (sentry.ts 정책).
 * 4xx는 silent — B-H 미들웨어가 다음 API 호출 시 재redirect로 잡음.
 */
export async function recordConsentSafe(
  opts: RecordConsentSafeOptions,
): Promise<{ ok: boolean; error?: unknown }> {
  try {
    await recordConsent({
      terms_version: CURRENT_TERMS_VERSION,
      privacy_version: CURRENT_PRIVACY_VERSION,
      age_14_confirmed: opts.ageConfirmed,
      marketing_opt_in: opts.marketingOptIn,
    });
    return { ok: true };
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[recordConsentSafe] failed:', error);
    }
    return { ok: false, error };
  }
}

export const consentApi = { recordConsent, recordConsentSafe };
export default consentApi;
