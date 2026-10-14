/**
 * 탈퇴 화면의 "구독 먼저 해지" 안내 판정 — 순수 함수 (W-WITHDRAW-PLAN-SOURCE, PAYWALL D9-3).
 *
 * PW-1: Plus 여부는 서버 /auth/me plan 만 본다. 이전에는 /users/storage 의 plan(만료와 무관한
 * subscriptions 행 값)을 읽어 만료된 구독도 막을 수 있었다. 서버 가드(409 ACTIVE_SUBSCRIPTION)는 그대로다.
 */
export function shouldBlockWithdraw(input: { plan: unknown }): boolean {
  return input.plan === 'plus';
}
