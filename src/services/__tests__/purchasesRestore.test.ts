/**
 * hasActiveSubscription 단위 테스트 (PW-14 — 복원 후 대기 생략 판단 전용)
 */
import { hasActiveSubscription } from '../purchasesRestore';

describe('hasActiveSubscription', () => {
  it('활성 구독 있음 → true(반영 확인 루프로)', () => {
    expect(hasActiveSubscription({ activeSubscriptions: ['plus_annual'], entitlements: { active: {} } })).toBe(true);
  });

  it('활성 entitlement 만 있어도 true', () => {
    expect(hasActiveSubscription({ activeSubscriptions: [], entitlements: { active: { plus: {} } } })).toBe(true);
  });

  it('둘 다 비어 있음 → false(즉시 restoreNone)', () => {
    expect(hasActiveSubscription({ activeSubscriptions: [], entitlements: { active: {} } })).toBe(false);
  });

  it('필드 누락·null·응답 없음 → false', () => {
    expect(hasActiveSubscription({})).toBe(false);
    expect(hasActiveSubscription({ activeSubscriptions: null, entitlements: null })).toBe(false);
    expect(hasActiveSubscription(null)).toBe(false);
    expect(hasActiveSubscription(undefined)).toBe(false);
  });
});
