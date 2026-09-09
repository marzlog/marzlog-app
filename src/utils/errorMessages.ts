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
  // B-AUTH-ERROR-CONFLATION: 소셜 토큰에 email 클레임이 없는 경우(백엔드 400
  // "Email not found in token")는 미가입이 아니라 토큰/스코프 문제다.
  // 아래 'email not found'가 부분일치로 먼저 삼켜버리므로 반드시 그보다 앞에 둔다.
  ['email not found in token', 'error.socialEmailMissing'],
  ['email not found', 'error.emailNotRegistered'],
  ['incorrect password', 'error.incorrectPassword'],
  // Social token verification (Apple) — 백엔드 실측 7종.
  // 사용자 입장에선 전부 "잠시 후 재시도"가 정답인 동일 부류라 문구를 세분화하지 않는다.
  ['apple public key not found', 'error.socialVerifyFailed'],
  ['invalid apple token format', 'error.socialVerifyFailed'],
  ['apple token expired', 'error.socialVerifyFailed'],
  ['apple token verification failed', 'error.socialVerifyFailed'],
  ['missing nonce claim', 'error.socialVerifyFailed'],
  ['nonce mismatch', 'error.socialVerifyFailed'],
  ['apple user id not found', 'error.socialVerifyFailed'],
  // Register
  ['email already registered', 'error.emailAlreadyRegistered'],
  ['email already exists', 'error.emailAlreadyInUse'],
  // Token
  ['invalid or expired', 'error.invalidOrExpiredRequest'],
  // Generic
  ['login failed', 'error.loginFailed'],
  ['registration failed', 'error.registrationFailed'],
];

/**
 * @param unmatchedKey  매핑에 걸리지 않았을 때 서버 원문 대신 쓸 i18n 키.
 *   B-AUTH-ERROR-CONFLATION 최종 안전망 — **auth 로그인 경로 전용**이다.
 *   로그인 화면은 어떤 문구든 "계정 상태"로 읽히므로 미지의 영문 원문을 노출하지 않는다.
 *   반대로 register/verify/forgot-password는 서버가 주는 구체 안내(중복 이메일,
 *   Pydantic 검증 사유 등)가 사용자에게 유용하므로 넘기지 않는다 = 원문 유지.
 */
export function translateErrorMessage(msg: string, unmatchedKey?: string): string {
  const lower = msg.toLowerCase();
  for (const [eng, key] of ERROR_TRANSLATION_KEYS) {
    if (lower.includes(eng)) {
      return t(key);
    }
  }
  return unmatchedKey ? t(unmatchedKey) : msg;
}

/**
 * Extract a string error message from axios error responses.
 * Handles: string detail, Pydantic validation error array, object with msg, plain Error.
 * Automatically translates known English messages via i18n.
 */
export function extractErrorMessage(
  error: any,
  fallback: string,
  unmatchedKey?: string,
): string {
  // B-AF: CONSENT_REQUIRED는 Phase 4 interceptor가 router.replace를 트리거하므로
  // raw detail을 사용자에게 노출하지 않음. router 전환 race 동안 잠깐 보이는 메시지 차단.
  const code = (error?.response?.data as any)?.code;
  if (code === 'CONSENT_REQUIRED') {
    return '';
  }

  // B-AUTH-ERROR-CONFLATION: 응답이 없는 실패(네트워크 단절/타임아웃)를
  // 서버가 명시한 "계정 없음" 계열과 절대 합치지 않는다.
  // axios는 이때 error.message에 'Network Error' / 'timeout of 30000ms exceeded'를
  // 담는데, 아래 폴백이 그 영문 원문을 그대로 노출하거나
  // translateErrorMessage 부분일치에 태워 계정 문제로 오표시한다.
  if (error instanceof AxiosError && !error.response) {
    return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      ? t('error.timeout')
      : t('error.network');
  }

  // 5xx는 서버 장애 — 본문 문구가 계정/자격 매핑을 타지 않도록 차단한다.
  const status = error?.response?.status;
  if (typeof status === 'number' && status >= 500) {
    return t('error.server');
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

  return translateErrorMessage(message, unmatchedKey);
}
