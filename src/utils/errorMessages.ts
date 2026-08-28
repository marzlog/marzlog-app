import { AxiosError } from 'axios';
import { t } from '../i18n';

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    // HTTP 응답이 있으면 상태코드 우선 분기
    const status = error.response?.status;
    if (status === 401) {
      return t('error.sessionExpired');
    }
    if (status === 404) {
      return t('error.notFound');
    }
    if (status && status >= 500) {
      return t('error.server');
    }
    if (status) {
      return extractErrorMessage(error, t('error.unknown'));
    }
    // 응답 자체가 없을 때만 네트워크/타임아웃
    if (error.code === 'ECONNABORTED') {
      return t('error.timeout');
    }
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return t('error.network');
    }
    return extractErrorMessage(error, t('error.unknown'));
  }
  if (error instanceof Error) {
    return error.message || t('error.unknown');
  }
  return t('error.unknown');
}

/**
 * Map English backend/Pydantic error messages to i18n keys.
 * Uses partial matching so "value is not a valid email address: ..." still matches.
 * ★ 값은 번역문이 아니라 키다 — 실제 번역은 translateErrorMessage 호출 시점에
 *   t()로 평가되므로 언어 전환이 즉시 반영된다 (모듈 로드 시점 고정 금지).
 */
const ERROR_TRANSLATION_KEYS: [string, string][] = [
  // Email validation (Pydantic)
  ['value is not a valid email address', 'error.emailInvalidFormat'],
  ['an email address must have an @-sign', 'error.emailMissingAtSign'],
  // Login
  ['invalid email or password', 'error.invalidCredentials'],
  ['user not found', 'error.userNotFound'],
  ['email not found', 'error.emailNotRegistered'],
  ['incorrect password', 'error.incorrectPassword'],
  // Register
  ['email already registered', 'error.emailAlreadyRegistered'],
  ['email already exists', 'error.emailAlreadyInUse'],
  // Token
  ['invalid or expired', 'error.invalidOrExpiredRequest'],
  // Generic
  ['login failed', 'error.loginFailed'],
  ['registration failed', 'error.registrationFailed'],
];

export function translateErrorMessage(msg: string): string {
  const lower = msg.toLowerCase();
  for (const [eng, key] of ERROR_TRANSLATION_KEYS) {
    if (lower.includes(eng)) {
      return t(key);
    }
  }
  return msg;
}

/**
 * Extract a string error message from axios error responses.
 * Handles: string detail, Pydantic validation error array, object with msg, plain Error.
 * Automatically translates known English messages via i18n.
 */
export function extractErrorMessage(error: any, fallback: string): string {
  // B-AF: CONSENT_REQUIRED는 Phase 4 interceptor가 router.replace를 트리거하므로
  // raw detail을 사용자에게 노출하지 않음. router 전환 race 동안 잠깐 보이는 메시지 차단.
  const code = (error?.response?.data as any)?.code;
  if (code === 'CONSENT_REQUIRED') {
    return '';
  }

  const detail = error?.response?.data?.detail;
  let message = fallback;

  if (typeof detail === 'string') {
    message = detail;
  } else if (Array.isArray(detail) && detail.length > 0) {
    message = detail[0]?.msg || fallback;
  } else if (typeof detail === 'object' && detail !== null && detail.msg) {
    message = detail.msg;
  } else if (typeof error?.message === 'string') {
    message = error.message;
  }

  return translateErrorMessage(message);
}
