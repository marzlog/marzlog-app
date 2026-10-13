/**
 * 복원 결과의 "대기 생략" 판단 — 순수 함수 (RN/SDK 비의존, 단위 테스트 대상). PAYWALL 명세 PW-14.
 *
 * RC restorePurchases 가 돌려준 CustomerInfo 에 활성 구독이 하나도 없으면 서버 반영을 기다릴 이유가 없다
 * → 바로 restoreNone. 있으면 서버 반영 확인 루프로 간다.
 * ★Plus 부여·표시에는 쓰지 않는다(PW-1 — Plus 판정은 서버 /auth/me plan 만).
 */
export interface RestoreCustomerInfoLike {
  activeSubscriptions?: readonly string[] | null;
  entitlements?: { active?: Record<string, unknown> | null } | null;
}

export function hasActiveSubscription(info: RestoreCustomerInfoLike | null | undefined): boolean {
  if (!info) return false;
  const subs = info.activeSubscriptions?.length ?? 0;
  const entitlements = Object.keys(info.entitlements?.active ?? {}).length;
  return subs > 0 || entitlements > 0;
}
