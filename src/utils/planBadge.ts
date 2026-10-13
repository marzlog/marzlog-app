/**
 * 저장 공간 카드의 플랜 배지 — 순수 함수 (PAYWALL D6-a).
 *
 * PW-1: Plus 여부는 서버 /auth/me 의 plan 만 본다(/users/storage 의 plan 이 아니다).
 * 'plus' 와 정확히 같을 때만 Plus, 그 외(free·없음·알 수 없는 값·레거시 basic/pro/unlimited)는 Free.
 */
export type PlanBadge = 'free' | 'plus';

export function resolvePlanBadge(plan: unknown): PlanBadge {
  return plan === 'plus' ? 'plus' : 'free';
}

/** 배지 문구 키 — 기존 키 재사용(storage.planFree "Free" · subscription.planPlus "Plus") */
export const PLAN_BADGE_KEYS: Record<PlanBadge, string> = {
  free: 'storage.planFree',
  plus: 'subscription.planPlus',
};
