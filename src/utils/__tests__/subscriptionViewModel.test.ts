/**
 * subscriptionViewModel 단위 테스트 (PAYWALL 명세 §3.3, D6-1)
 */
import type { PaywallOfferResult } from '../../services/purchases';
import {
  buildSubscriptionVM,
  deviceStoreOf,
  isManageVisible,
  resolveSubscriptionState,
  type SubscriptionVMInput,
} from '../subscriptionViewModel';

const EXPIRES = '2026-11-08T03:12:00Z';
const formatDate = (iso: string) => `D(${iso.slice(0, 10)})`;
const GB = 1024 * 1024 * 1024;

const OFFER: PaywallOfferResult = {
  status: 'ok',
  offer: {
    annual: { priceString: '₩44,000', perMonthPriceString: '₩3,667', trial: { eligible: true, days: 14 } },
    monthly: { priceString: '₩5,500', perMonthPriceString: null, trial: { eligible: false, days: null } },
    annualDiscountPercent: 33,
  },
};

function input(overrides: Partial<SubscriptionVMInput> = {}): SubscriptionVMInput {
  return {
    plan: 'free',
    planStatus: null,
    planStore: null,
    planExpiresAt: null,
    deviceStore: 'apple',
    offerResult: null,
    storage: { used_bytes: 0.5 * GB, limit_bytes: 2 * GB, used_percentage: 25 },
    formatDate,
    ...overrides,
  };
}

const plus = (overrides: Partial<SubscriptionVMInput> = {}) =>
  input({ plan: 'plus', planStatus: 'active', planStore: 'apple', planExpiresAt: EXPIRES, ...overrides });

describe('무료', () => {
  it('상품 조회 성공 → Plus 카드에 가격 줄, 관리 행 없음, 상태 줄 없음', () => {
    const vm = buildSubscriptionVM(input({ offerResult: OFFER }));
    expect(vm.state).toBe('free');
    expect(vm.planLabel).toEqual({ key: 'subscription.planFree' });
    expect(vm.statusLines).toEqual([]);
    expect(vm.plusCard).toEqual({
      title: { key: 'paywall.brand' },
      description: { key: 'paywall.subhead', params: { gb: 100 } },
      priceLine: { key: 'subscription.plusCardPrice', params: { monthly: '₩5,500', annual: '₩44,000' } },
      cta: { key: 'subscription.cta' },
    });
    expect(vm.manageVisible).toBe(false);
    expect(vm.otherStore).toBeNull();
  });

  it.each<[string, PaywallOfferResult | null]>([
    ['조회 전', null],
    ['상품 없음', { status: 'unavailable' }],
    ['조회 실패', { status: 'load_failed' }],
  ])('%s → 가격 줄 없이 카드만', (_label, offerResult) => {
    expect(buildSubscriptionVM(input({ offerResult })).plusCard?.priceLine).toBeNull();
  });

  it('plan 없음·알 수 없는 값도 무료', () => {
    expect(buildSubscriptionVM(input({ plan: undefined })).state).toBe('free');
    expect(buildSubscriptionVM(input({ plan: 'PLUS' })).state).toBe('free');
  });
});

describe('Plus 상태', () => {
  it('이용 중 → 갱신일, Plus 카드 없음, 관리 행 있음', () => {
    const vm = buildSubscriptionVM(plus());
    expect(vm.state).toBe('active');
    expect(vm.planLabel).toEqual({ key: 'subscription.planPlus' });
    expect(vm.statusLines).toEqual([{ key: 'subscription.renewsOn', params: { date: 'D(2026-11-08)' } }]);
    expect(vm.plusCard).toBeNull();
    expect(vm.manageVisible).toBe(true);
  });

  it('해지 예약 → cancelledUntil', () => {
    expect(buildSubscriptionVM(plus({ planStatus: 'cancelled' })).statusLines).toEqual([
      { key: 'subscription.cancelledUntil', params: { date: 'D(2026-11-08)' } },
    ]);
  });

  it('결제 확인 필요 → graceNotice + 날짜', () => {
    expect(buildSubscriptionVM(plus({ planStatus: 'grace' })).statusLines).toEqual([
      { key: 'subscription.graceNotice' },
      { key: 'paywall.activeUntil', params: { date: 'D(2026-11-08)' } },
    ]);
  });

  it.each([null, undefined, 'expired', 'weird'])('상태 불명(%p, 여유 시간 안 expired 포함) → 날짜만', (planStatus) => {
    const vm = buildSubscriptionVM(plus({ planStatus }));
    expect(vm.state).toBe('unknown');
    expect(vm.statusLines).toEqual([{ key: 'paywall.activeUntil', params: { date: 'D(2026-11-08)' } }]);
  });

  it('날짜가 없거나 변환 실패 → 날짜 줄 없음(결제 확인 필요는 안내만)', () => {
    expect(buildSubscriptionVM(plus({ planExpiresAt: null })).statusLines).toEqual([]);
    expect(buildSubscriptionVM(plus({ formatDate: () => null })).statusLines).toEqual([]);
    expect(buildSubscriptionVM(plus({ planStatus: 'grace', planExpiresAt: null })).statusLines).toEqual([
      { key: 'subscription.graceNotice' },
    ]);
  });
});

describe('스토어 — 관리 행·다른 스토어 안내', () => {
  it.each<[string | null, 'apple' | 'google' | null, boolean, string | null]>([
    ['apple', 'apple', true, null],
    ['google', 'google', true, null],
    ['apple', 'google', false, 'subscription.storeApple'], // iOS 구독을 Android 에서
    ['google', 'apple', false, 'subscription.storeGoogle'],
    [null, 'apple', true, null], // 스토어 불명 → 관리 행 보임, 안내 없음
    ['amazon', 'google', true, null], // 서버는 apple·google 외를 null 로 내리지만 방어
  ])('plan_store=%p, 기기=%p → 관리 %p, 안내 %p', (planStore, deviceStore, manage, storeNameKey) => {
    const vm = buildSubscriptionVM(plus({ planStore, deviceStore }));
    expect(vm.manageVisible).toBe(manage);
    expect(vm.otherStore).toEqual(storeNameKey ? { key: 'subscription.otherStore', storeNameKey } : null);
  });

  it('무료는 plan_store 가 남아 있어도 관리 행·안내 없음', () => {
    const vm = buildSubscriptionVM(input({ planStore: 'google', deviceStore: 'apple' }));
    expect(vm.manageVisible).toBe(false);
    expect(vm.otherStore).toBeNull();
  });

  it('isManageVisible = plan==="plus" && (plan_store 없음 || 기기 스토어와 같음)', () => {
    expect(isManageVisible('plus', null, 'apple')).toBe(true);
    expect(isManageVisible('plus', 'apple', 'apple')).toBe(true);
    expect(isManageVisible('plus', 'google', 'apple')).toBe(false);
    expect(isManageVisible('free', 'apple', 'apple')).toBe(false);
    expect(isManageVisible('plus', 'apple', null)).toBe(false); // web — 기기 스토어 없음
  });

  it('deviceStoreOf', () => {
    expect([deviceStoreOf('ios'), deviceStoreOf('android'), deviceStoreOf('web')]).toEqual(['apple', 'google', null]);
  });
});

describe('저장 공간·안내문', () => {
  it('저장 공간 → 사용량 문구·퍼센트(0~100 고정)', () => {
    expect(buildSubscriptionVM(input()).storage).toEqual({
      usage: { key: 'subscription.usage', params: { used: '512.0 MB', limit: '2.0 GB' } },
      percent: 25,
    });
    expect(buildSubscriptionVM(input({ storage: { used_bytes: 3 * GB, limit_bytes: 2 * GB, used_percentage: 150 } })).storage?.percent).toBe(100);
  });

  it('불러오는 중·실패(null) → 막대 영역 숨김', () => {
    expect(buildSubscriptionVM(input({ storage: null })).storage).toBeNull();
  });

  it('안내문은 무료 용량 파라미터', () => {
    expect(buildSubscriptionVM(input()).footnote).toEqual({ key: 'subscription.footnote', params: { gb: 2 } });
  });

  it('resolveSubscriptionState', () => {
    expect(resolveSubscriptionState('plus', 'active')).toBe('active');
    expect(resolveSubscriptionState('free', 'active')).toBe('free');
  });
});
