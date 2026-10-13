/**
 * resolvePlanBadge 단위 테스트 (PAYWALL D6-a — 더보기 저장 공간 카드 배지, PW-1)
 */
import { PLAN_BADGE_KEYS, resolvePlanBadge } from '../planBadge';

describe('resolvePlanBadge', () => {
  it('plus → plus', () => {
    expect(resolvePlanBadge('plus')).toBe('plus');
  });

  it('free → free', () => {
    expect(resolvePlanBadge('free')).toBe('free');
  });

  it.each([undefined, null, '', 'PLUS', ' plus', 'basic', 'pro', 'unlimited', 'premium', 1, {}])(
    'plan 없음·알 수 없는 값(%p) → free',
    (plan) => {
      expect(resolvePlanBadge(plan)).toBe('free');
    },
  );

  it('배지 문구 키(기존 키 재사용)', () => {
    expect(PLAN_BADGE_KEYS).toEqual({ free: 'storage.planFree', plus: 'subscription.planPlus' });
  });
});
