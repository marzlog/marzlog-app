/**
 * 결제 화면 표시 모델 — 순수 함수 (RN/SDK 비의존, 단위 테스트 대상). PAYWALL 명세 §3.1.
 *
 * 화면(app/paywall.tsx)은 여기서 나온 kind 에 따라 렌더만 한다. 문구는 i18n 키와 파라미터로만
 * 돌려준다 — t() 는 렌더 시점에만 부른다(§5: 모듈 스코프 평가 금지).
 */
import { FREE_STORAGE_GB, PLUS_STORAGE_GB } from '../constants/plus';
import type { PaywallOfferResult, PaywallPlanKind, PaywallPlanOffer } from '../services/purchases';

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
