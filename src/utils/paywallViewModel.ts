/**
 * 결제 화면 표시 모델 — 순수 함수 (RN/SDK 비의존, 단위 테스트 대상). PAYWALL 명세 §3.1.
 *
 * 화면(app/paywall.tsx)은 여기서 나온 kind 에 따라 렌더만 한다. 문구는 i18n 키와 파라미터로만
 * 돌려준다 — t() 는 렌더 시점에만 부른다(§5: 모듈 스코프 평가 금지).
 */
import { FREE_STORAGE_GB, PLUS_STORAGE_GB } from '../constants/plus';
import type { PaywallOfferResult, PaywallPlanKind, PaywallPlanOffer, PurchaseOutcome } from '../services/purchases';
import { PLUS_SUCCESS_RESTORE_PARAMS, toPlusSuccessRouteParams } from './plusSuccessViewModel';

export type PaywallSource = 'settings' | 'regen' | 'storage' | 'unknown';

const KNOWN_SOURCES: ReadonlySet<string> = new Set(['settings', 'regen', 'storage']);

/** 진입 경로 파라미터(?source=) — 정해진 값 외에는 'unknown'(기록용, 화면은 같다) */
export function normalizePaywallSource(raw: unknown): PaywallSource {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && KNOWN_SOURCES.has(value) ? (value as PaywallSource) : 'unknown';
}

export interface TextRef {
  key: string;
  params?: Record<string, string | number>;
}

export interface PaywallVMInput {
  isAuthenticated: boolean;
  isPlus: boolean;
  /** 상품 조회 중 */
  loading: boolean;
  offerResult: PaywallOfferResult | null;
  selected: PaywallPlanKind;
  /** 구매·복원 진행 중 */
  busy: boolean;
  /** 구매 후 서버 반영 확인 단계(D5-b) — idle 이 아니면 화면을 잠그고 대기 문구를 보인다 */
  reflecting: PaywallReflectPhase;
}

/** checking → PLUS_REFLECT_LONG_AFTER_MS 뒤 checking-long. 완료 화면으로 넘어갈 때까지 되돌리지 않는다 */
export type PaywallReflectPhase = 'idle' | 'checking' | 'checking-long';

export interface PaywallHeaderVM {
  closeEnabled: boolean;
  restoreEnabled: boolean;
}

export interface PaywallPlanVM {
  kind: PaywallPlanKind;
  title: TextRef;
  selected: boolean;
  price: string;
  period: TextRef;
  perMonth: TextRef | null;
  discount: TextRef | null;
}

export type PaywallBodyVM =
  | { kind: 'unauthenticated' }
  | { kind: 'already-plus' }
  | { kind: 'loading' }
  | { kind: 'unavailable'; message: TextRef }
  | { kind: 'load-failed'; message: TextRef }
  | {
      kind: 'ready';
      plans: PaywallPlanVM[];
      cta: TextRef;
      noChargeToday: boolean;
      disclosure: TextRef;
      /** 구매 중 — 플랜 카드·닫기·복원 비활성, 뒤로가기 차단, CTA 스피너 */
      locked: boolean;
      /** 반영 확인 중 CTA 아래 문구(reflecting → reflectingLong). 그 외 null */
      status: TextRef | null;
    };

export type PaywallVM = { header: PaywallHeaderVM; body: PaywallBodyVM };

/** 상단 공통(상태와 무관한 고정 문구의 파라미터) */
export const PAYWALL_SUBHEAD: TextRef = { key: 'paywall.subhead', params: { gb: PLUS_STORAGE_GB } };
export const PAYWALL_COMPARE_STORAGE = {
  free: { key: 'paywall.compare.storageValue', params: { gb: FREE_STORAGE_GB } } as TextRef,
  plus: { key: 'paywall.compare.storageValue', params: { gb: PLUS_STORAGE_GB } } as TextRef,
};

/** 화면 표시 순서 — 연간이 위(기본 선택) */
export const PAYWALL_PLAN_ORDER: PaywallPlanKind[] = ['annual', 'monthly'];
export const PAYWALL_DEFAULT_PLAN: PaywallPlanKind = 'annual';

/** 상품 조회 여부 — 미인증(딥링크 진입 등)·이미 Plus 면 부르지 않는다 */
export function shouldLoadOffer(input: Pick<PaywallVMInput, 'isAuthenticated' | 'isPlus'>): boolean {
  return input.isAuthenticated && !input.isPlus;
}

function planVM(kind: PaywallPlanKind, plan: PaywallPlanOffer, selected: boolean, discountPercent: number | null): PaywallPlanVM {
  const isAnnual = kind === 'annual';
  return {
    kind,
    title: { key: isAnnual ? 'paywall.annual' : 'paywall.monthly' },
    selected,
    price: plan.priceString,
    period: { key: isAnnual ? 'paywall.perYear' : 'paywall.perMonth' },
    perMonth:
      isAnnual && plan.perMonthPriceString !== null
        ? { key: 'paywall.perMonthEquivalent', params: { price: plan.perMonthPriceString } }
        : null,
    discount: isAnnual && discountPercent !== null ? { key: 'paywall.discountBadge', params: { percent: discountPercent } } : null,
  };
}

/** 선택 플랜의 체험 상태로 버튼·고지 문구를 고른다(PW-4: 확인 못 하면 체험을 약속하지 않는다) */
function ctaAndDisclosure(kind: PaywallPlanKind, plan: PaywallPlanOffer): { cta: TextRef; noChargeToday: boolean; disclosure: TextRef } {
  const trialEligible = plan.trial.eligible === true;
  const isAnnual = kind === 'annual';
  if (trialEligible) {
    return {
      cta: plan.trial.days !== null ? { key: 'paywall.ctaTrial', params: { days: plan.trial.days } } : { key: 'paywall.ctaTrialGeneric' },
      noChargeToday: true,
      disclosure: {
        key: isAnnual ? 'paywall.disclosureTrialAnnual' : 'paywall.disclosureTrialMonthly',
        params: { price: plan.priceString },
      },
    };
  }
  return {
    cta: { key: 'paywall.ctaSubscribe' },
    noChargeToday: false,
    disclosure: { key: isAnnual ? 'paywall.disclosureAnnual' : 'paywall.disclosureMonthly', params: { price: plan.priceString } },
  };
}

const REFLECT_STATUS: Record<PaywallReflectPhase, TextRef | null> = {
  idle: null,
  checking: { key: 'paywall.reflecting' },
  'checking-long': { key: 'paywall.reflectingLong' },
};

export function buildPaywallVM(input: PaywallVMInput): PaywallVM {
  const reflecting = input.reflecting !== 'idle';
  const locked = input.busy || reflecting;
  // 반영 확인 중 재조회로 plan 이 plus 가 돼도 화면을 고정한다 — 완료 화면 replace 직전 "이용 중" 카드 노출 방지
  const isPlus = input.isPlus && !reflecting;
  const header: PaywallHeaderVM = {
    closeEnabled: !locked,
    restoreEnabled: !locked && input.isAuthenticated && !isPlus,
  };

  if (!input.isAuthenticated) return { header, body: { kind: 'unauthenticated' } };
  if (isPlus) return { header, body: { kind: 'already-plus' } };
  if (input.loading || input.offerResult === null) return { header, body: { kind: 'loading' } };
  if (input.offerResult.status === 'unavailable') {
    return { header, body: { kind: 'unavailable', message: { key: 'paywall.unavailable' } } };
  }
  if (input.offerResult.status === 'load_failed') {
    return { header, body: { kind: 'load-failed', message: { key: 'paywall.loadFailed' } } };
  }

  const { offer } = input.offerResult;
  const plans = PAYWALL_PLAN_ORDER.map((kind) =>
    planVM(kind, offer[kind], kind === input.selected, offer.annualDiscountPercent),
  );
  return {
    header,
    body: {
      kind: 'ready',
      plans,
      ...ctaAndDisclosure(input.selected, offer[input.selected]),
      locked,
      status: REFLECT_STATUS[input.reflecting],
    },
  };
}

/**
 * 하단 고정 영역 배치 — 고지문까지 넣은 하단 영역이 화면 높이의 절반을 넘으면(글자 확대 등)
 * 고지문·약관 링크는 스크롤 영역 끝으로 내리고 CTA 만 고정한다.
 */
export function footerFitsWithDisclosure(footerHeight: number, windowHeight: number): boolean {
  return footerHeight <= windowHeight / 2;
}

/**
 * 구매·복원 잠금 구간에서 예상 밖 오류가 났을 때의 처리(D5-b-5).
 * 진행 단계에 따라 다르다 — 스토어 결제·복원이 이미 끝났는데 "실패"만 보여 주면 다시 결제할 수 있다.
 *  - before-completion: 스토어 거래 완료 전 → paywall.failed 안내(화면 유지)
 *  - purchase-completed: 구매 completed 뒤 → 완료 화면 반영 중 변형(reflected=0)
 *  - restore-active: 복원 restored-active 뒤 → 완료 화면 반영 중(restore=1)
 */
export type PaywallLockedProgress =
  | { stage: 'before-completion' }
  | { stage: 'purchase-completed'; kind: PaywallPlanKind; trial: boolean; price: string }
  | { stage: 'restore-active' };

export type PaywallLockedErrorAction =
  | { type: 'alert-failed' }
  | { type: 'go-success'; params: Record<string, string> };

export function resolveLockedErrorAction(progress: PaywallLockedProgress): PaywallLockedErrorAction {
  switch (progress.stage) {
    case 'purchase-completed':
      return {
        type: 'go-success',
        params: toPlusSuccessRouteParams({ kind: progress.kind, trial: progress.trial, price: progress.price, reflected: false }),
      };
    case 'restore-active':
      return { type: 'go-success', params: PLUS_SUCCESS_RESTORE_PARAMS };
    default:
      return { type: 'alert-failed' };
  }
}

/**
 * 구매 결과 뒤 화면이 할 일(D5-c 포함). completed 만 반영 확인으로 간다.
 *  - offer-restore: 이미 구독 중인 스토어 계정 → 잠금이 풀린 뒤 [구매 복원]/[닫기] 대화상자, 복원은 새 잠금으로
 */
export type PurchaseFollowUp = 'none' | 'alert-failed' | 'alert-identity' | 'offer-restore' | 'reflect';

export function resolvePurchaseFollowUp(outcome: PurchaseOutcome): PurchaseFollowUp {
  switch (outcome) {
    case 'completed':
      return 'reflect';
    case 'cancelled':
      return 'none';
    case 'identity_mismatch':
      return 'alert-identity';
    case 'already_owned':
      return 'offer-restore';
    default:
      return 'alert-failed';
  }
}

export interface AlreadyOwnedDialogVM {
  title: TextRef;
  /** body 의 {{store}} 는 storeName 키를 t() 한 값으로 채운다 */
  body: TextRef;
  storeName: TextRef;
  confirm: TextRef;
  cancel: TextRef;
}

/** 이미 구독 중 대화상자 — 스토어 이름은 기존 키(subscription.storeApple·storeGoogle) */
export function buildAlreadyOwnedDialog(platform: string): AlreadyOwnedDialogVM {
  return {
    title: { key: 'paywall.alreadyOwnedTitle' },
    body: { key: 'paywall.alreadyOwned' },
    storeName: { key: platform === 'ios' ? 'subscription.storeApple' : 'subscription.storeGoogle' },
    confirm: { key: 'paywall.restore' },
    cancel: { key: 'paywall.close' },
  };
}

/**
 * 이미 Plus 인 사용자가 결제 화면에 들어오면 구독 화면으로 replace(D6-2, 명세 §3.1 "이미 Plus").
 * 반영 확인 중(reflecting ≠ idle)·잠금 중(busy)에는 하지 않는다 — 구매·복원 직후의 이동은 각 흐름이 정한다.
 */
export function shouldRedirectToSubscription(input: {
  isAuthenticated: boolean;
  isPlus: boolean;
  reflecting: PaywallReflectPhase;
  busy: boolean;
}): boolean {
  return input.isAuthenticated && input.isPlus && input.reflecting === 'idle' && !input.busy;
}

export type PaywallExitTarget = { pathname: '/plus-success' | '/subscription'; params: Record<string, string> };

/** 결제 화면 복원 결과의 이동처(D6-2) — 반영되면 구독 화면(복원 안내 1회), 30초 미반영이면 완료 화면 반영 중 */
export function restoreExitTarget(reflected: boolean): PaywallExitTarget {
  return reflected
    ? { pathname: '/subscription', params: SUBSCRIPTION_RESTORED_PARAMS }
    : { pathname: '/plus-success', params: PLUS_SUCCESS_RESTORE_PARAMS };
}

/**
 * 결제 화면 포커스·복귀 때 RC 자격을 보고 시작한 반영 확인의 이동처(B-PURCHASE-ERROR-AFTER-SUCCESS ②).
 * 어떤 상품인지 모르므로 구매 완료 화면 대신: 반영되면 구독 화면(안내 없음), 30초 미반영이면 완료 화면 반영 중(복원 버튼)
 */
export function autoReflectExitTarget(reflected: boolean): PaywallExitTarget {
  return reflected
    ? { pathname: '/subscription', params: {} }
    : { pathname: '/plus-success', params: PLUS_SUCCESS_RESTORE_PARAMS };
}

/** 구독 화면 상단 "구매를 복원했어요" 1회 표시 파라미터 */
export const SUBSCRIPTION_RESTORED_PARAMS: Record<string, string> = { restored: '1' };

export function parseRestoredParam(raw: unknown): boolean {
  return (Array.isArray(raw) ? raw[0] : raw) === '1';
}
