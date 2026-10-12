/**
 * plusSuccessViewModel 단위 테스트 (PAYWALL 명세 §3.2)
 */
import {
  buildPlusSuccessVM,
  parsePlusSuccessParams,
  resolvePlusSuccessGuard,
  toPlusSuccessRouteParams,
  type PlusSuccessParams,
} from '../plusSuccessViewModel';

const EXPIRES = '2026-11-08T03:12:00Z';
const formatDate = (iso: string) => `D(${iso.slice(0, 10)})`;

const TRIAL_ANNUAL: PlusSuccessParams = { kind: 'annual', trial: true, price: '₩44,000', reflected: true };
const PAID_MONTHLY: PlusSuccessParams = { kind: 'monthly', trial: false, price: '₩5,500', reflected: true };

describe('parsePlusSuccessParams', () => {
  it('정상 파라미터', () => {
    expect(parsePlusSuccessParams({ kind: 'annual', trial: '1', price: '₩44,000', reflected: '0' })).toEqual({
      kind: 'annual',
      trial: true,
      price: '₩44,000',
      reflected: false,
    });
  });

  it('배열 값은 첫 값', () => {
    expect(parsePlusSuccessParams({ kind: ['monthly'], trial: ['0'], price: ['₩5,500'], reflected: ['1'] })?.kind).toBe('monthly');
  });

  it.each<[string, Record<string, unknown>]>([
    ['파라미터 없음', {}],
    ['kind 오형식', { kind: 'weekly', trial: '1', price: '₩1', reflected: '1' }],
    ['trial 오형식', { kind: 'annual', trial: 'true', price: '₩1', reflected: '1' }],
    ['reflected 누락', { kind: 'annual', trial: '1', price: '₩1' }],
    ['price 빈 값', { kind: 'annual', trial: '1', price: '  ', reflected: '1' }],
    ['price 누락', { kind: 'annual', trial: '1', reflected: '1' }],
  ])('%s → null(안전한 기본)', (_label, raw) => {
    expect(parsePlusSuccessParams(raw)).toBeNull();
  });

  it('결제 화면이 만든 파라미터를 그대로 되읽는다', () => {
    expect(parsePlusSuccessParams(toPlusSuccessRouteParams(TRIAL_ANNUAL))).toEqual(TRIAL_ANNUAL);
    expect(parsePlusSuccessParams(toPlusSuccessRouteParams(PAID_MONTHLY))).toEqual(PAID_MONTHLY);
  });
});

describe('buildPlusSuccessVM — 3변형 + 기본', () => {
  it('체험 시작: 플랜 / 무료 체험 종료 / 첫 결제(날짜·가격) + 체험 해지 안내', () => {
    const vm = buildPlusSuccessVM({ params: TRIAL_ANNUAL, isPlus: true, planExpiresAt: EXPIRES, formatDate });
    expect(vm.variant).toBe('trial-started');
    expect(vm.title).toEqual({ key: 'plusSuccess.title' });
    expect(vm.body).toEqual({ key: 'plusSuccess.body', params: { gb: 100 } });
    expect(vm.rows).toEqual([
      { label: { key: 'plusSuccess.plan' }, value: { key: 'plusSuccess.planAnnual' } },
      { label: { key: 'plusSuccess.trialEnds' }, value: 'D(2026-11-08)' },
      { label: { key: 'plusSuccess.firstCharge' }, value: { key: 'plusSuccess.chargeValue', params: { date: 'D(2026-11-08)', price: '₩44,000' } } },
    ]);
    expect(vm.note).toEqual({ key: 'plusSuccess.noteTrial' });
  });

  it('바로 결제: 플랜 / 다음 결제(날짜·가격) + 일반 안내', () => {
    const vm = buildPlusSuccessVM({ params: PAID_MONTHLY, isPlus: true, planExpiresAt: EXPIRES, formatDate });
    expect(vm.variant).toBe('charged');
    expect(vm.rows).toEqual([
      { label: { key: 'plusSuccess.plan' }, value: { key: 'plusSuccess.planMonthly' } },
      { label: { key: 'plusSuccess.nextCharge' }, value: { key: 'plusSuccess.chargeValue', params: { date: 'D(2026-11-08)', price: '₩5,500' } } },
    ]);
    expect(vm.note).toEqual({ key: 'plusSuccess.note' });
  });

  it('반영 중: 표 없음, pending 문구', () => {
    const vm = buildPlusSuccessVM({ params: { ...PAID_MONTHLY, reflected: false }, isPlus: false, planExpiresAt: null, formatDate });
    expect(vm.variant).toBe('pending');
    expect(vm.rows).toEqual([]);
    expect(vm.body).toEqual({ key: 'plusSuccess.pending' });
    expect(vm.note).toBeNull();
  });

  it('반영 중으로 왔어도 재조회로 plus 가 확인되면 반영 변형으로 바뀐다', () => {
    const vm = buildPlusSuccessVM({ params: { ...TRIAL_ANNUAL, reflected: false }, isPlus: true, planExpiresAt: EXPIRES, formatDate });
    expect(vm.variant).toBe('trial-started');
  });

  it('파라미터 없음·오형식(null) → 표 없이 제목·본문만', () => {
    const vm = buildPlusSuccessVM({ params: null, isPlus: true, planExpiresAt: EXPIRES, formatDate });
    expect(vm).toEqual({
      variant: 'basic',
      title: { key: 'plusSuccess.title' },
      body: { key: 'plusSuccess.body', params: { gb: 100 } },
      rows: [],
      note: null,
    });
  });

  it('만료 시각이 없거나 날짜로 못 바꾸면 날짜 행 없이 플랜 행만', () => {
    expect(buildPlusSuccessVM({ params: TRIAL_ANNUAL, isPlus: true, planExpiresAt: null, formatDate }).rows).toHaveLength(1);
    expect(buildPlusSuccessVM({ params: PAID_MONTHLY, isPlus: true, planExpiresAt: EXPIRES, formatDate: () => null }).rows).toHaveLength(1);
  });
});

describe('resolvePlusSuccessGuard', () => {
  it.each<[boolean, boolean, boolean, string]>([
    [false, true, true, 'render-nothing'], // 미인증 — 루트가 로그인으로
    [false, false, false, 'render-nothing'],
    [true, false, false, 'go-home'], // 파라미터 없이 + plus 아님
    [true, false, true, 'render'], // 파라미터 없이 + plus — 기본 화면
    [true, true, false, 'render'], // 결제 직후 미반영
    [true, true, true, 'render'],
  ])('인증=%s, 파라미터=%s, plus=%s → %s', (isAuthenticated, hasParams, isPlus, expected) => {
    expect(resolvePlusSuccessGuard({ isAuthenticated, hasParams, isPlus })).toBe(expected);
  });
});
