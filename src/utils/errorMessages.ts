/**
 * Translate English backend/Pydantic error messages to Korean.
 * Uses partial matching so "value is not a valid email address: ..." still matches.
 */
const ERROR_TRANSLATIONS: [string, string][] = [
  // Email validation (Pydantic)
  ['value is not a valid email address', '올바른 이메일 형식이 아닙니다'],
  ['an email address must have an @-sign', '이메일에 @가 포함되어야 합니다'],
  // Login
  ['invalid email or password', '이메일 또는 비밀번호가 올바르지 않습니다'],
  ['user not found', '일치하는 계정이 존재하지 않습니다'],
  ['email not found', '등록되지 않은 이메일입니다'],
  ['incorrect password', '비밀번호가 올바르지 않습니다'],
  // Register
  ['email already registered', '이미 가입된 이메일입니다'],
  ['email already exists', '이미 사용 중인 이메일입니다'],
  // Token
  ['invalid or expired', '유효하지 않거나 만료된 요청입니다'],
  // Generic
  ['login failed', '로그인에 실패했습니다'],
  ['registration failed', '회원가입에 실패했습니다'],
];

export function translateErrorMessage(msg: string): string {
  const lower = msg.toLowerCase();
  for (const [eng, kor] of ERROR_TRANSLATIONS) {
    if (lower.includes(eng)) {
      return kor;
    }
  }
  return msg;
}

/**
 * Extract a string error message from axios error responses.
 * Handles: string detail, Pydantic validation error array, object with msg, plain Error.
 * Automatically translates English messages to Korean.
 */
export function extractErrorMessage(error: any, fallback: string): string {
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
