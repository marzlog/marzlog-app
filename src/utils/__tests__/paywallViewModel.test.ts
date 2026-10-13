/**
 * paywallViewModel 단위 테스트 (PAYWALL 명세 §3.1·§7)
 *
 * 렌더는 실기 스크린샷으로 확인한다 — 여기서는 상태 → 표시 모델(i18n 키·파라미터)만 본다.
 */
import type { PaywallOffer, PaywallOfferResult, PaywallTrial } from '../../services/purchases';
import {
  PAYWALL_COMPARE_STORAGE,
  PAYWALL_DEFAULT_PLAN,
  PAYWALL_SUBHEAD,
  buildAlreadyOwnedDialog,
  buildPaywallVM,
  footerFitsWithDisclosure,
  normalizePaywallSource,
  resolveLockedErrorAction,
  resolvePurchaseFollowUp,
  shouldLoadOffer,
  type PaywallVMInput,
} from '../paywallViewModel';

const TRIAL_14: PaywallTrial = { eligible: true, days: 14 };
const TRIAL_MONTH: PaywallTrial = { eligible: true, days: null }; // 월 단위 체험 — 일수 불명
const NO_TRIAL: PaywallTrial = { eligible: false, days: null };
const UNKNOWN_TRIAL: PaywallTrial = { eligible: null, days: null };

function offer(overrides: Partial<{ annualTrial: PaywallTrial; monthlyTrial: PaywallTrial; discount: number | null; perMonth: string | null }> = {}): PaywallOffer {
  return {
    annual: {
      priceString: '₩44,000',
      perMonthPriceString: overrides.perMonth === undefined ? '₩3,667' : overrides.perMonth,
      trial: overrides.annualTrial ?? TRIAL_14,
    },
    monthly: { priceString: '₩5,500', perMonthPriceString: null, trial: overrides.monthlyTrial ?? NO_TRIAL },
    annualDiscountPercent: overrides.discount === undefined ? 33 : overrides.discount,
  };
}

function ok(o: PaywallOffer = offer()): PaywallOfferResult {
  return { status: 'ok', offer: o };
}

function input(overrides: Partial<PaywallVMInput> = {}): PaywallVMInput {
  return {
    isAuthenticated: true,
    isPlus: false,
    loading: false,
    offerResult: ok(),
    selected: PAYWALL_DEFAULT_PLAN,
    busy: false,
    reflecting: 'idle',
    ...overrides,
  };
}

function ready(vmInput: PaywallVMInput) {
  const vm = buildPaywallVM(vmInput);
  if (vm.body.kind !== 'ready') throw new Error(`expected ready, got ${vm.body.kind}`);
  return vm.body;
}

describe('상태 (명세 §3.1 표)', () => {
  it('로딩 — 조회 중이거나 결과 전', () => {
    expect(buildPaywallVM(input({ loading: true })).body.kind).toBe('loading');
    expect(buildPaywallVM(input({ offerResult: null })).body.kind).toBe('loading');
  });

  it('로딩 중에도 헤더(닫기·복원)는 바로 쓸 수 있다', () => {
    expect(buildPaywallVM(input({ loading: true })).header).toEqual({ closeEnabled: true, restoreEnabled: true });
  });

  it('상품 없음 → paywall.unavailable', () => {
    const vm = buildPaywallVM(input({ offerResult: { status: 'unavailable' } }));
    expect(vm.body).toEqual({ kind: 'unavailable', message: { key: 'paywall.unavailable' } });
  });

  it('조회 실패 → paywall.loadFailed', () => {
    const vm = buildPaywallVM(input({ offerResult: { status: 'load_failed' } }));
    expect(vm.body).toEqual({ kind: 'load-failed', message: { key: 'paywall.loadFailed' } });
  });

  it('이미 Plus → already-plus(결제 UI 없음), 복원 비활성', () => {
    const vm = buildPaywallVM(input({ isPlus: true }));
    expect(vm.body.kind).toBe('already-plus');
    expect(vm.header.restoreEnabled).toBe(false);
  });

  it('미인증 → unauthenticated, 복원 비활성', () => {
    const vm = buildPaywallVM(input({ isAuthenticated: false }));
    expect(vm.body.kind).toBe('unauthenticated');
    expect(vm.header.restoreEnabled).toBe(false);
  });

  it('구매 중 → locked, 닫기·복원 비활성(카드·CTA 는 렌더에서 locked 로 막는다)', () => {
    const vm = buildPaywallVM(input({ busy: true }));
    expect(vm.header).toEqual({ closeEnabled: false, restoreEnabled: false });
    expect(vm.body.kind === 'ready' && vm.body.locked).toBe(true);
  });

  it('정상 — 잠금 없음, 대기 문구 없음', () => {
    expect(ready(input()).locked).toBe(false);
    expect(ready(input()).status).toBeNull();
  });
});

describe('구매 후 반영 확인 (D5-b-1)', () => {
  it('checking → 잠금 + paywall.reflecting, 닫기·복원 비활성', () => {
    const vm = buildPaywallVM(input({ reflecting: 'checking' }));
    expect(vm.header).toEqual({ closeEnabled: false, restoreEnabled: false });
    expect(vm.body.kind === 'ready' && vm.body.locked).toBe(true);
    expect(ready(input({ reflecting: 'checking' })).status).toEqual({ key: 'paywall.reflecting' });
  });

  it('checking-long → paywall.reflectingLong', () => {
    expect(ready(input({ reflecting: 'checking-long' })).status).toEqual({ key: 'paywall.reflectingLong' });
  });

  it('busy 가 풀려도 반영 확인 단계면 잠금 유지(완료 화면 replace 직전 렌더)', () => {
    const vm = buildPaywallVM(input({ busy: false, reflecting: 'checking-long' }));
    expect(vm.header.closeEnabled).toBe(false);
    expect(vm.body.kind === 'ready' && vm.body.locked).toBe(true);
  });

  it.each(['checking', 'checking-long'] as const)('%s 중 plan 이 plus 로 바뀌어도 already-plus 카드로 바뀌지 않는다', (phase) => {
    const vm = buildPaywallVM(input({ isPlus: true, busy: false, reflecting: phase }));
    expect(vm.body.kind).toBe('ready');
    expect(vm.header).toEqual({ closeEnabled: false, restoreEnabled: false });
  });

  it('idle 이면 plus 는 그대로 already-plus', () => {
    expect(buildPaywallVM(input({ isPlus: true, reflecting: 'idle' })).body.kind).toBe('already-plus');
  });
});

describe('조회 여부 (조건 3 — 미인증이면 조회 미호출)', () => {
  it.each([
    [true, false, true],
    [false, false, false], // 딥링크 미인증 진입
    [true, true, false], // 이미 Plus
    [false, true, false],
  ])('인증=%s, Plus=%s → 조회 %s', (isAuthenticated, isPlus, expected) => {
    expect(shouldLoadOffer({ isAuthenticated, isPlus })).toBe(expected);
  });
});

describe('체험 4종 — 버튼·"오늘은 결제되지 않아요"·고지 (PW-4)', () => {
  it('체험 가능 + 일수 있음 → ctaTrial{days}, 오늘 무료, disclosureTrialAnnual{price}', () => {
    const body = ready(input());
    expect(body.cta).toEqual({ key: 'paywall.ctaTrial', params: { days: 14 } });
    expect(body.noChargeToday).toBe(true);
    expect(body.disclosure).toEqual({ key: 'paywall.disclosureTrialAnnual', params: { price: '₩44,000' } });
  });

  it('체험 가능 + 일수 불명(월 단위) → ctaTrialGeneric', () => {
    const body = ready(input({ offerResult: ok(offer({ annualTrial: TRIAL_MONTH })) }));
    expect(body.cta).toEqual({ key: 'paywall.ctaTrialGeneric' });
    expect(body.noChargeToday).toBe(true);
    expect(body.disclosure.key).toBe('paywall.disclosureTrialAnnual');
  });

  it('체험 자격 없음 → ctaSubscribe, 오늘 무료 줄 없음, disclosureAnnual', () => {
    const body = ready(input({ offerResult: ok(offer({ annualTrial: NO_TRIAL })) }));
    expect(body.cta).toEqual({ key: 'paywall.ctaSubscribe' });
    expect(body.noChargeToday).toBe(false);
    expect(body.disclosure).toEqual({ key: 'paywall.disclosureAnnual', params: { price: '₩44,000' } });
  });

  it('체험 확인 불가(null) → 체험을 약속하지 않는다', () => {
    const body = ready(input({ offerResult: ok(offer({ annualTrial: UNKNOWN_TRIAL })) }));
    expect(body.cta).toEqual({ key: 'paywall.ctaSubscribe' });
    expect(body.noChargeToday).toBe(false);
  });

  it('월간 선택 → 월간 기준 고지(disclosureMonthly{price})', () => {
    const body = ready(input({ selected: 'monthly' }));
    expect(body.cta).toEqual({ key: 'paywall.ctaSubscribe' });
    expect(body.disclosure).toEqual({ key: 'paywall.disclosureMonthly', params: { price: '₩5,500' } });
  });

  it('월간 체험 가능 → disclosureTrialMonthly', () => {
    const body = ready(input({ selected: 'monthly', offerResult: ok(offer({ monthlyTrial: TRIAL_14 })) }));
    expect(body.disclosure.key).toBe('paywall.disclosureTrialMonthly');
  });
});

describe('플랜 카드', () => {
  it('연간이 위·기본 선택', () => {
    const body = ready(input());
    expect(PAYWALL_DEFAULT_PLAN).toBe('annual');
    expect(body.plans.map((p) => [p.kind, p.selected])).toEqual([
      ['annual', true],
      ['monthly', false],
    ]);
  });

  it('연간: 할인 배지·월 환산, 월간: 둘 다 없음', () => {
    const [annual, monthly] = ready(input()).plans;
    expect(annual.discount).toEqual({ key: 'paywall.discountBadge', params: { percent: 33 } });
    expect(annual.perMonth).toEqual({ key: 'paywall.perMonthEquivalent', params: { price: '₩3,667' } });
    expect(annual.period).toEqual({ key: 'paywall.perYear' });
    expect(monthly.discount).toBeNull();
    expect(monthly.perMonth).toBeNull();
    expect(monthly.period).toEqual({ key: 'paywall.perMonth' });
  });

  it('할인율 null → 배지 없음, 월 환산 null → 줄 없음', () => {
    const [annual] = ready(input({ offerResult: ok(offer({ discount: null, perMonth: null })) })).plans;
    expect(annual.discount).toBeNull();
    expect(annual.perMonth).toBeNull();
  });

  it('가격은 스토어 문자열 그대로', () => {
    const [annual, monthly] = ready(input()).plans;
    expect(annual.price).toBe('₩44,000');
    expect(monthly.price).toBe('₩5,500');
  });
});

describe('고정 문구 파라미터', () => {
  it('용량 숫자는 상수에서(FREE 2 / PLUS 100)', () => {
    expect(PAYWALL_SUBHEAD).toEqual({ key: 'paywall.subhead', params: { gb: 100 } });
    expect(PAYWALL_COMPARE_STORAGE.free.params).toEqual({ gb: 2 });
    expect(PAYWALL_COMPARE_STORAGE.plus.params).toEqual({ gb: 100 });
  });
});

describe('normalizePaywallSource (조건 6)', () => {
  it.each([
    ['settings', 'settings'],
    ['regen', 'regen'],
    ['storage', 'storage'],
    ['home', 'unknown'],
    ['', 'unknown'],
    [undefined, 'unknown'],
    [['regen', 'storage'], 'regen'],
    [42, 'unknown'],
  ])('%j → %s', (raw, expected) => {
    expect(normalizePaywallSource(raw)).toBe(expected);
  });
});

describe('footerFitsWithDisclosure (조건 1)', () => {
  it('하단 영역이 화면 절반 이하면 고지문을 하단에, 넘으면 스크롤 끝으로', () => {
    expect(footerFitsWithDisclosure(300, 800)).toBe(true);
    expect(footerFitsWithDisclosure(400, 800)).toBe(true);
    expect(footerFitsWithDisclosure(401, 800)).toBe(false);
  });
});

describe('잠금 구간 예상 밖 오류 처리 (D5-b-5)', () => {
  it('스토어 거래 완료 전 오류 → paywall.failed 안내', () => {
    expect(resolveLockedErrorAction({ stage: 'before-completion' })).toEqual({ type: 'alert-failed' });
  });

  it('구매 completed 뒤 오류 → 실패 안내 대신 완료 화면 반영 중(reflected=0) — 재결제 방지', () => {
    expect(resolveLockedErrorAction({ stage: 'purchase-completed', kind: 'annual', trial: true, price: '₩44,000' })).toEqual({
      type: 'go-success',
      params: { kind: 'annual', trial: '1', price: '₩44,000', reflected: '0' },
    });
  });

  it('복원 restored-active 뒤 오류 → 완료 화면 반영 중(restore=1)', () => {
    expect(resolveLockedErrorAction({ stage: 'restore-active' })).toEqual({ type: 'go-success', params: { restore: '1' } });
  });
});

describe('구매 결과 뒤 처리 (D5-c)', () => {
  it.each([
    ['completed', 'reflect'],
    ['cancelled', 'none'],
    ['failed', 'alert-failed'],
    ['identity_mismatch', 'alert-identity'],
    ['already_owned', 'offer-restore'],
  ] as const)('%s → %s', (outcome, followUp) => {
    expect(resolvePurchaseFollowUp(outcome)).toBe(followUp);
  });

  it('이미 구독 중 대화상자 — iOS 는 App Store, 그 외는 Google Play, 버튼은 구매 복원/닫기', () => {
    expect(buildAlreadyOwnedDialog('ios')).toEqual({
      title: { key: 'paywall.alreadyOwnedTitle' },
      body: { key: 'paywall.alreadyOwned' },
      storeName: { key: 'subscription.storeApple' },
      confirm: { key: 'paywall.restore' },
      cancel: { key: 'paywall.close' },
    });
    expect(buildAlreadyOwnedDialog('android').storeName).toEqual({ key: 'subscription.storeGoogle' });
  });
});
