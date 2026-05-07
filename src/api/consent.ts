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

export const consentApi = { recordConsent };
export default consentApi;
