/**
 * 닉네임 길이 규약 — F-NICKNAME-LENGTH-UX (14차)
 *
 * 서버 정본은 **20자**다: `PATCH /auth/me/profile` 이 `len(nickname.strip()) > 20` 이면
 * 400 + "닉네임은 20자 이내로 입력해주세요" 를 돌려준다(marzlog-backend `routers/auth.py:867`).
 * ⚠️ 소셜 가입 완료 경로(`schemas/auth.py:140`)만 `max_length=50` 으로 어긋나 있다 — 서버 별건이며
 *    프로필 편집 화면은 20 을 따른다.
 *
 * 길이는 **코드포인트** 기준으로 센다(서버 Python `len()` 과 같은 기준 — 이모지 1개 = 1자).
 */

export const NICKNAME_MAX_LENGTH = 20;

/** 서버가 저장할 값(trim 후)의 길이 */
export function nicknameLength(value: string | null | undefined): number {
  return Array.from((value ?? '').trim()).length;
}

/** 입력창 아래 카운터 표기 — "3/20" */
export function nicknameCounter(value: string | null | undefined): string {
  return `${nicknameLength(value)}/${NICKNAME_MAX_LENGTH}`;
}

/** 서버가 400 을 줄 길이인가 */
export function isNicknameTooLong(value: string | null | undefined): boolean {
  return nicknameLength(value) > NICKNAME_MAX_LENGTH;
}
