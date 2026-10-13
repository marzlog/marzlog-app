/**
 * plusSuccessViewModel 단위 테스트 (PAYWALL 명세 §3.2)
 */
import {
  PLUS_SUCCESS_RESTORE_PARAMS,
  buildPlusPendingVM,
  buildPlusSuccessVM,
  initialPendingPhase,
  parsePlusSuccessEntry,
  parsePlusSuccessParams,
  remainingRecheckMs,
  resolvePlusSuccessGuard,
  shouldPendingRecheck,
  toPlusSuccessRouteParams,
  type PlusSuccessParams,
} from '../plusSuccessViewModel';
import { PLUS_PENDING_RECHECK_INTERVAL_MS, PLUS_PENDING_RECHECK_MAX_MS } from '../../constants/plus';

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

  it('반영 중: 표 없음, 시계 아이콘·pendingTitle·pending 문구, 복원·닫기', () => {
    const vm = buildPlusSuccessVM({ params: { ...PAID_MONTHLY, reflected: false }, isPlus: false, planExpiresAt: null, formatDate });
    expect(vm.variant).toBe('pending');
    expect(vm.icon).toBe('time');
    expect(vm.title).toEqual({ key: 'plusSuccess.pendingTitle' });
    expect(vm.rows).toEqual([]);
    expect(vm.body).toEqual({ key: 'plusSuccess.pending' });
    expect(vm.note).toBeNull();
    expect(vm.pending).toEqual({ notice: null, restore: { enabled: true, loading: false }, closeEnabled: true });
  });

  it('반영 변형은 체크 아이콘, pending 없음', () => {
    const vm = buildPlusSuccessVM({ params: PAID_MONTHLY, isPlus: true, planExpiresAt: EXPIRES, formatDate });
    expect(vm.icon).toBe('check');
    expect(vm.pending).toBeNull();
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
      icon: 'check',
      pending: null,
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

describe('반영 중 화면 — 복원 단계 (D5-b-2)', () => {
  it.each<[Parameters<typeof buildPlusPendingVM>[0], string | null, boolean]>([
    ['idle', null, false],
    ['restoring', null, true],
    ['restore-checked', 'plusSuccess.restoreChecked', false],
    ['restore-none', 'paywall.restoreNone', false],
    ['restore-failed', 'plusSuccess.restoreFailed', false],
    ['identity-mismatch', 'plusSuccess.identityMismatch', false],
  ])('%s → 안내 %s, 진행 중=%s', (phase, noticeKey, busy) => {
    const vm = buildPlusPendingVM(phase);
    expect(vm.notice).toEqual(noticeKey ? { key: noticeKey } : null);
    expect(vm.restore).toEqual({ enabled: !busy, loading: busy });
    expect(vm.closeEnabled).toBe(!busy);
  });

  it('pendingPhase 가 VM 의 pending 에 반영된다', () => {
    const vm = buildPlusSuccessVM({
      params: { ...PAID_MONTHLY, reflected: false },
      pendingPhase: 'restoring',
      isPlus: false,
      planExpiresAt: null,
      formatDate,
    });
    expect(vm.pending?.restore.loading).toBe(true);
    expect(vm.pending?.closeEnabled).toBe(false);
  });

  it('복원 중 재조회로 plus 가 되면 반영 변형으로(단계와 무관)', () => {
    const vm = buildPlusSuccessVM({
      params: { ...TRIAL_ANNUAL, reflected: false },
      pendingPhase: 'restoring',
      isPlus: true,
      planExpiresAt: EXPIRES,
      formatDate,
    });
    expect(vm.variant).toBe('trial-started');
    expect(vm.pending).toBeNull();
  });
});

describe('결제 화면 복원에서 진입 (restore=1, PW-14)', () => {
  it('파싱: restore=1 → fromRestore, 구매 파라미터 없음', () => {
    expect(parsePlusSuccessEntry(PLUS_SUCCESS_RESTORE_PARAMS)).toEqual({ params: null, fromRestore: true });
    expect(parsePlusSuccessEntry({ restore: ['1'] }).fromRestore).toBe(true);
    expect(parsePlusSuccessEntry({ restore: 'yes' }).fromRestore).toBe(false);
    expect(parsePlusSuccessEntry({}).fromRestore).toBe(false);
  });

  it('첫 단계: 복원 진입이면 restore-checked, 아니면 idle', () => {
    expect(initialPendingPhase(true)).toBe('restore-checked');
    expect(initialPendingPhase(false)).toBe('idle');
  });

  it('미반영 → pending(복원 확인 안내)', () => {
    const vm = buildPlusSuccessVM({
      params: null,
      fromRestore: true,
      pendingPhase: initialPendingPhase(true),
      isPlus: false,
      planExpiresAt: null,
      formatDate,
    });
    expect(vm.variant).toBe('pending');
    expect(vm.pending?.notice).toEqual({ key: 'plusSuccess.restoreChecked' });
  });

  it('이후 plus 확인 → 기본 변형(구매 파라미터가 없으므로 표 없음)', () => {
    const vm = buildPlusSuccessVM({ params: null, fromRestore: true, isPlus: true, planExpiresAt: EXPIRES, formatDate });
    expect(vm.variant).toBe('basic');
  });

  it('결제 화면 복원 직후 반영됨(파라미터 없음 + plus) → 기본 변형', () => {
    expect(buildPlusSuccessVM({ params: null, isPlus: true, planExpiresAt: EXPIRES, formatDate }).variant).toBe('basic');
  });
});

describe('반영 중 주기 재확인 판정 (D5-b-4)', () => {
  const base = { mounted: true, pending: true, phase: 'idle' as const, appActive: true, remainingMs: 60_000 };

  it('확정 상수: 5초 간격 · 최대 2분', () => {
    expect([PLUS_PENDING_RECHECK_INTERVAL_MS, PLUS_PENDING_RECHECK_MAX_MS]).toEqual([5_000, 120_000]);
  });

  it('반영 중 · 화면 위 · 앱 앞 · 시간 남음 → 계속', () => {
    expect(shouldPendingRecheck(base)).toBe(true);
  });

  it.each(['restore-checked', 'restore-none', 'restore-failed', 'identity-mismatch'] as const)('복원 결과 안내(%s) 중에도 계속', (phase) => {
    expect(shouldPendingRecheck({ ...base, phase })).toBe(true);
  });

  it('복원 진행 중(restoring) → 정지(복원의 반영 확인 루프와 겹치지 않게)', () => {
    expect(shouldPendingRecheck({ ...base, phase: 'restoring' })).toBe(false);
  });

  it('plus 확인(pending 아님) · 화면 이탈 · 백그라운드 · 시간 소진 → 중단', () => {
    expect(shouldPendingRecheck({ ...base, pending: false })).toBe(false);
    expect(shouldPendingRecheck({ ...base, mounted: false })).toBe(false);
    expect(shouldPendingRecheck({ ...base, appActive: false })).toBe(false);
    expect(shouldPendingRecheck({ ...base, remainingMs: 0 })).toBe(false);
  });

  it('남은 시간 = 최대 − 앞에 있던 동안 쓴 시간, 0 미만은 0', () => {
    expect(remainingRecheckMs(120_000, 0)).toBe(120_000);
    expect(remainingRecheckMs(120_000, 45_000)).toBe(75_000);
    expect(remainingRecheckMs(120_000, 130_000)).toBe(0);
  });
});
