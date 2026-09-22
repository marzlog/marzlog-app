/**
 * RC 사용자 식별 전이 판정 — 순수 함수 (RN/SDK 비의존, 단위 테스트 대상).
 *
 * authStore 의 user.id 변화만 본다. 로그인 경로 6곳(google/kakao/apple/email/register/checkAuth)과
 * 해제 경로 3곳(logout/forceLogout/deleteAccount)을 각각 건드리지 않고 이 한 지점에서 처리한다.
 *  - id 등장 또는 다른 id 로 교체 → logIn(서버 user id). 익명 → 식별 alias/transfer 는 RC logIn 이 수행.
 *  - id 소멸 → logOut (익명 상태면 래퍼가 건너뜀 — RC logOut 은 익명에서 reject)
 *  - id 불변(isLoading 등 다른 필드 변화) → 무동작
 */
export type IdentityTransition = { type: 'login'; appUserId: string } | { type: 'logout' } | null;

export function resolveIdentityTransition(
  prevId: string | null | undefined,
  nextId: string | null | undefined,
): IdentityTransition {
  const prev = prevId || null;
  const next = nextId || null;
  if (prev === next) return null;
  if (next) return { type: 'login', appUserId: next };
  return { type: 'logout' };
}
