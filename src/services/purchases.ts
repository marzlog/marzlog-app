import { Linking, NativeModules, Platform } from 'react-native';
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

import { PAYWALL_OFFER_TIMEOUT_MS, PAYWALL_PURCHASE_TIMEOUT_MS, PAYWALL_RESTORE_TIMEOUT_MS } from '../constants/plus';
import { withTimeout } from '../utils/withTimeout';
import { captureError, captureMessage } from '../utils/sentry';
import { resolvePurchasesSetup } from './purchasesGuard';
import {
  normalizeAppUserId,
  resolveIdentityTransition,
  runWithVerifiedIdentity,
  shouldRetryIdentity,
  verifyPurchaseIdentity,
  type IdentityVerdict,
} from './purchasesIdentity';
import { resolveRestoreOutcome, type RestoreOutcome, type RestoreRun } from './purchasesRestore';
import { classifyPurchaseError, purchaseFailureReason } from './purchaseErrors';
import { hasPlusEntitlement, shouldRecoverAfterPurchaseError } from './purchaseRecovery';
import { PAYWALL_OFFERING_ID, pickPaywallPackages, type PaywallPlanKind } from './paywallPackages';
import { annualDiscountPercent, trialPeriodToDays } from './paywallOffer';

export type { PaywallPlanKind };

/**
 * RevenueCat SDK 래퍼 — 앱 코드는 react-native-purchases 를 직접 import 하지 않고 여기를 거친다.
 *
 * ★ADR-2026-09-18-01 조건 ②: entitlement 판정은 서버 `plan` 필드(/auth/me)만.
 *   이 모듈의 SDK 상태(customerInfo 등)로 Plus 여부를 판정하지 말 것.
 *
 * 가드: 네이티브 모듈 부재 / web / 키 미주입이면 no-op — 단, 조용히 삼키지 않고
 * captureMessage 로 남긴다(dev = console.warn, production = Sentry warning).
 */

let configured = false;

export function initPurchases(): void {
  if (configured) return;

  const setup = resolvePurchasesSetup({
    platform: Platform.OS,
    hasNativeModule: !!NativeModules.RNPurchases,
    iosKey: process.env.EXPO_PUBLIC_RC_API_KEY_IOS,
    androidKey: process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID,
  });

  if (!setup.ok) {
    if (setup.reason === 'web') return;
    captureMessage('[RC] purchases init skipped', { reason: setup.reason, platform: Platform.OS });
    return;
  }

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: setup.apiKey });
    configured = true;
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { scope: 'purchases.init' });
  }
}

/** configure 완료 여부 — false 면 모든 RC 호출을 건너뛴다(2c logIn/logOut, 2d 페이월). */
export function isPurchasesReady(): boolean {
  return configured;
}

// 식별 호출 직렬화 — 로그인 직후 로그아웃처럼 전이가 연달아 와도 SDK 호출 순서를 보장한다.
let identityQueue: Promise<void> = Promise.resolve();
// 마지막으로 원한 식별 상태 — logIn 이 실패하면 synced=false 로 남아 앱 복귀 때 재시도한다(D5-b-3)
let identityTarget: string | null = null;
let identitySynced = true;
let identityRetryInFlight = false;

/** 식별 큐에 SDK 호출을 넣고, 그 호출의 결과(throw 포함)를 돌려준다. 큐 자체는 실패해도 이어진다 */
function enqueueIdentity<T>(task: () => Promise<T>): Promise<T> {
  const run = identityQueue.then(task);
  identityQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function logInTracked(appUserId: string): Promise<void> {
  await Purchases.logIn(appUserId);
  if (identityTarget === appUserId) identitySynced = true;
}

/**
 * authStore user.id 전이를 RC 식별에 반영한다(_layout 의 subscribe 단일 지점에서 호출).
 * configure 전/가드 skip 상태면 무동작 — skip 사실은 initPurchases 가 이미 관측으로 남겼다.
 */
export function syncPurchasesIdentity(prevUserId: string | null | undefined, nextUserId: string | null | undefined): void {
  const transition = resolveIdentityTransition(prevUserId, nextUserId);
  if (!transition || !configured) return;

  identityTarget = transition.type === 'login' ? transition.appUserId : null;
  identitySynced = transition.type !== 'login';
  enqueueIdentity(async () => {
    try {
      if (transition.type === 'login') {
        await logInTracked(transition.appUserId);
      } else if (!(await Purchases.isAnonymous())) {
        await Purchases.logOut();
      }
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), {
        scope: 'purchases.identity',
        transition: transition.type,
      });
    }
  });
}

/**
 * 앱 복귀(AppState active) 때 호출 — 로그인 상태인데 마지막 logIn 이 실패한 채면 1회 다시 시도한다(D5-b-3).
 * 실패는 transition 'retry' 로 기록하고 다음 복귀에서 다시 본다.
 */
export function retryPurchasesIdentity(): void {
  const target = identityTarget;
  if (!shouldRetryIdentity({ configured, target, synced: identitySynced, inFlight: identityRetryInFlight })) return;
  identityRetryInFlight = true;
  enqueueIdentity(async () => {
    try {
      await logInTracked(target as string);
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { scope: 'purchases.identity', transition: 'retry' });
    } finally {
      identityRetryInFlight = false;
    }
  });
}

export type IdentityStage = 'purchase' | 'restore';

/**
 * 구매·복원 직전 신원 대조(신원 수리안 ①②③). 차단이면 여기서 한 번 기록한다 — 식별값(id)은 싣지 않는다.
 * tags.reason 으로 재 logIn 네트워크 실패(relogin_failed)와 id 불일치(id_mismatch)를 구분한다.
 */
async function verifyIdentityFor(stage: IdentityStage, serverUserId: string | null | undefined): Promise<IdentityVerdict> {
  const verdict = await verifyPurchaseIdentity(serverUserId, {
    waitForQueue: () => identityQueue,
    getAppUserId: () => Purchases.getAppUserID(),
    logIn: (appUserId) => {
      identityTarget = appUserId;
      identitySynced = false;
      return enqueueIdentity(() => logInTracked(appUserId));
    },
  });
  if (!verdict.ok) {
    const err = verdict.reloginError as { code?: unknown } | null;
    captureMessage(
      'purchases identity mismatch',
      { stage, reason: verdict.reason, rcAnonymous: verdict.rcAnonymous, reloginCode: err?.code ?? null },
      {
        level: 'warning',
        fingerprint: ['purchases-identity-mismatch', verdict.reason],
        tags: { area: 'paywall', stage, reason: verdict.reason },
      },
    );
  }
  return verdict;
}

// ─── 페이월 (2d) ────────────────────────────────────────────────────────────────
// 화면에는 표시용 값(가격 문자열)만 넘기고 SDK 패키지 객체는 여기서 보관한다.
// ★구매/복원 결과로 Plus 여부를 판정하지 않는다 — 성공은 서버 재조회 트리거일 뿐(ADR 조건 ②).

/** 체험 정보. null = 확인 불가(체험을 약속하지 않는다 — PW-4). days 는 일·주 단위 체험만. */
export type PaywallTrial = { eligible: boolean | null; days: number | null };

export type PaywallPlanOffer = {
  priceString: string; // 스토어 문자열 그대로
  perMonthPriceString: string | null; // 연간만. SDK 제공값이 없으면 null(자체 계산 금지)
  trial: PaywallTrial;
};

export type PaywallOffer = {
  annual: PaywallPlanOffer;
  monthly: PaywallPlanOffer;
  annualDiscountPercent: number | null; // 통화가 다르거나 할인 ≤ 0 이면 null
};

export type PaywallOfferResult =
  | { status: 'ok'; offer: PaywallOffer }
  | { status: 'unavailable' } // 미구성·패키지 부족
  | { status: 'load_failed' }; // 예외·시간 초과

let paywallPackages: Partial<Record<PaywallPlanKind, PurchasesPackage>> = {};

function withOfferTimeout<T>(promise: Promise<T>): Promise<T> {
  return withTimeout(promise, PAYWALL_OFFER_TIMEOUT_MS, 'PAYWALL_OFFER');
}

function mapIosEligibility(status: INTRO_ELIGIBILITY_STATUS | undefined): boolean | null {
  if (status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) return true;
  if (status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE) return false;
  return null;
}

/**
 * 체험 자격·일수 (명세 §2.3).
 *  - iOS: checkTrialOrIntroductoryPriceEligibility — ELIGIBLE true / INELIGIBLE false / 그 외 null.
 *    유료 첫 할인(무료가 아닌 introPrice)은 무료 체험이 아니므로 자격이 있어도 false.
 *  - Android: defaultOption.freePhase 존재 여부(Play 는 자격 있는 혜택만 내려준다).
 *  - 자격 조회 실패는 null(체험을 약속하지 않음).
 */
async function resolveTrials(
  products: Record<PaywallPlanKind, PurchasesStoreProduct>,
): Promise<Record<PaywallPlanKind, PaywallTrial>> {
  const kinds = Object.keys(products) as PaywallPlanKind[];
  const result = {} as Record<PaywallPlanKind, PaywallTrial>;

  if (Platform.OS === 'ios') {
    let eligibility: Record<string, { status: INTRO_ELIGIBILITY_STATUS }> = {};
    try {
      eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(
        kinds.map((k) => products[k].identifier),
      );
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { scope: 'purchases.trialEligibility' }, { tags: { area: 'paywall' } });
    }
    for (const kind of kinds) {
      const product = products[kind];
      const intro = product.introPrice;
      const freeIntro = !!intro && intro.price === 0;
      const mapped = mapIosEligibility(eligibility[product.identifier]?.status);
      result[kind] = {
        eligible: freeIntro ? mapped : mapped === true ? false : mapped,
        days: freeIntro ? trialPeriodToDays(intro!.periodUnit, intro!.periodNumberOfUnits, intro!.cycles) : null,
      };
    }
    return result;
  }

  for (const kind of kinds) {
    const freePhase = products[kind].defaultOption?.freePhase ?? null;
    result[kind] = {
      eligible: !!freePhase,
      days: freePhase
        ? trialPeriodToDays(freePhase.billingPeriod.unit, freePhase.billingPeriod.value, freePhase.billingCycleCount ?? 1)
        : null,
    };
  }
  return result;
}

/**
 * offering 'default' 의 월/연 패키지를 불러온다(PAYWALL_OFFER_TIMEOUT_MS 시간 제한).
 * 미구성·월/연 중 하나라도 없으면 unavailable, 예외·시간 초과면 load_failed.
 */
export async function loadPaywallOffer(): Promise<PaywallOfferResult> {
  if (!configured) return { status: 'unavailable' };

  let loaded: { picked: Record<PaywallPlanKind, PurchasesPackage>; trials: Record<PaywallPlanKind, PaywallTrial> } | null;
  try {
    loaded = await withOfferTimeout(
      (async () => {
        const offerings = await Purchases.getOfferings();
        const offering = offerings.all[PAYWALL_OFFERING_ID];
        const picked = offering ? pickPaywallPackages(offering.availablePackages) : {};
        if (!picked.annual || !picked.monthly) return null;
        const complete = { annual: picked.annual, monthly: picked.monthly };
        const trials = await resolveTrials({ annual: complete.annual.product, monthly: complete.monthly.product });
        return { picked: complete, trials };
      })(),
    );
  } catch (e) {
    paywallPackages = {};
    captureError(e instanceof Error ? e : new Error(String(e)), { scope: 'purchases.loadOffer' }, { tags: { area: 'paywall' } });
    return { status: 'load_failed' };
  }

  if (!loaded) {
    paywallPackages = {};
    // 스토어·RC 설정 이상 신호(명세 §6) — production 은 Sentry warning, dev 는 console.warn
    captureMessage('[RC] paywall offer unavailable', { offering: PAYWALL_OFFERING_ID });
    return { status: 'unavailable' };
  }

  paywallPackages = loaded.picked;
  const annual = loaded.picked.annual.product;
  const monthly = loaded.picked.monthly.product;
  return {
    status: 'ok',
    offer: {
      annual: {
        priceString: annual.priceString,
        perMonthPriceString: annual.pricePerMonthString ?? null,
        trial: loaded.trials.annual,
      },
      monthly: {
        priceString: monthly.priceString,
        perMonthPriceString: null,
        trial: loaded.trials.monthly,
      },
      annualDiscountPercent: annualDiscountPercent(
        { price: monthly.price, currencyCode: monthly.currencyCode },
        { price: annual.price, currencyCode: annual.currencyCode },
      ),
    },
  };
}

/**
 * identity_mismatch = 신원 대조 차단(구매 시트를 띄우지 않았다)
 * already_owned = 이 기기의 스토어 계정이 이미 구독 중(PRODUCT_ALREADY_PURCHASED) → 화면이 복원을 안내(D5-c)
 */
export type PurchaseOutcome = 'completed' | 'cancelled' | 'failed' | 'identity_mismatch' | 'already_owned';

/** Sentry tag store — 현재 기기의 스토어 */
const deviceStore = (): 'apple' | 'google' => (Platform.OS === 'ios' ? 'apple' : 'google');

/**
 * 구매 시트 호출. 'completed' 는 "스토어 거래가 끝났다"는 뜻일 뿐 Plus 판정이 아니다.
 * failed 는 여기서 한 번만 기록한다(명세 §6 tags area·kind·source) — 화면은 다시 기록하지 않는다.
 */
export async function purchasePaywallPlan(
  kind: PaywallPlanKind,
  serverUserId: string | null | undefined,
  source: string = 'unknown',
): Promise<PurchaseOutcome> {
  const pkg = paywallPackages[kind];
  const tags = { area: 'paywall', kind, source };
  // RC 미설정이면 대조 없이 기존대로 failed(구매 자체가 불가 — 대조할 SDK 가 없다)
  if (!configured || !pkg) {
    captureError(new Error('paywall purchase unavailable'), { scope: 'purchases.purchase', kind, configured }, { tags });
    return 'failed';
  }
  try {
    const run = await runWithVerifiedIdentity(
      () => verifyIdentityFor('purchase', serverUserId),
      // B-PAYWALL-HANG: 결제 시트 뒤 RC 처리가 끝나지 않아도(비행기 모드 등) 화면 잠금이 풀리게 — 시간 초과는 failed 경로
      () => withTimeout(Purchases.purchasePackage(pkg), PAYWALL_PURCHASE_TIMEOUT_MS, 'PAYWALL_PURCHASE'),
    );
    if (run.blocked) return 'identity_mismatch';
    return 'completed';
  } catch (e: any) {
    const errorClass = classifyPurchaseError(e, PURCHASES_ERROR_CODE);
    if (errorClass === 'cancelled') return 'cancelled';
    // B-PURCHASE-ERROR-AFTER-SUCCESS: 결제 시트 승인 뒤 오류(네트워크 등)여도 RC 에 Plus 자격이 생겼으면
    // 실패 안내 대신 서버 반영 확인(completed 경로)으로. 자격은 트리거일 뿐 — Plus 판정은 서버 plan(ADR ②)
    if (shouldRecoverAfterPurchaseError(e?.code, await readCustomerInfo(), PURCHASES_ERROR_CODE)) {
      captureError(
        e instanceof Error ? e : new Error(String(e?.message ?? e)),
        { scope: 'purchases.purchase', kind, code: e?.code },
        { tags: { ...tags, reason: purchaseFailureReason(e, PURCHASES_ERROR_CODE), recovered: 'true' } },
      );
      return 'completed';
    }
    if (errorClass === 'already_owned') {
      // 사용자 상황이지 오류가 아니다 — 건수만 info 로(알림 없음). 식별값 없음
      captureMessage('purchases already owned', { kind }, {
        level: 'info',
        fingerprint: ['purchases-already-owned'],
        tags: { area: 'paywall', stage: 'purchase', store: deviceStore() },
      });
      return 'already_owned';
    }
    captureError(
      e instanceof Error ? e : new Error(String(e?.message ?? e)),
      { scope: 'purchases.purchase', kind, code: e?.code },
      { tags: { ...tags, reason: purchaseFailureReason(e, PURCHASES_ERROR_CODE) } },
    );
    return 'failed';
  }
}

/** RC CustomerInfo 1회 — 실패·시간 초과는 null(호출부가 "자격 없음"으로 다룬다) */
async function readCustomerInfo() {
  try {
    return await withOfferTimeout(Purchases.getCustomerInfo());
  } catch {
    return null;
  }
}

/**
 * 결제 화면 포커스·앱 복귀 때(B-PURCHASE-ERROR-AFTER-SUCCESS ②): RC 에 Plus 자격이 있는지.
 * RC 현재 사용자 = 서버 사용자일 때만 본다(다른 사용자의 자격으로 반영 확인을 시작하지 않게).
 * true 는 "서버 반영 확인을 시작하라"는 뜻일 뿐 — Plus 판정·표시는 서버 plan(ADR ②).
 */
export async function hasPlusEntitlementForUser(serverUserId: string | null | undefined): Promise<boolean> {
  if (!configured || !normalizeAppUserId(serverUserId)) return false;
  try {
    await identityQueue;
    if (normalizeAppUserId(await Purchases.getAppUserID()) !== normalizeAppUserId(serverUserId)) return false;
  } catch {
    return false;
  }
  return hasPlusEntitlement(await readCustomerInfo());
}

export type { RestoreOutcome } from './purchasesRestore';

/**
 * 구매 복원 — 구매와 같은 신원 대조를 먼저 한다(익명·다른 id 로 복원하면 영수증이 엉뚱한 RC 사용자에 붙는다).
 * 결과 판정은 resolveRestoreOutcome(Plus entitlement 활성만 restored-active). 신원 대조부터 복원까지 전체에
 * PAYWALL_RESTORE_TIMEOUT_MS 시간 제한(B-PAYWALL-HANG) — 초과는 failed, Sentry reason=timeout.
 */
export async function restorePaywallPurchases(serverUserId: string | null | undefined): Promise<RestoreOutcome> {
  if (!configured) return 'failed';
  let run: RestoreRun;
  try {
    const verified = await withTimeout(
      runWithVerifiedIdentity(
        () => verifyIdentityFor('restore', serverUserId),
        () => Purchases.restorePurchases(),
      ),
      PAYWALL_RESTORE_TIMEOUT_MS,
      'PAYWALL_RESTORE',
    );
    run = verified.blocked ? { kind: 'blocked' } : { kind: 'result', info: verified.result };
  } catch (error) {
    run = { kind: 'error', error };
  }
  if (run.kind === 'error') {
    const e: any = run.error;
    captureError(
      e instanceof Error ? e : new Error(String(e?.message ?? e)),
      { scope: 'purchases.restore', code: e?.code },
      { tags: { area: 'paywall', stage: 'restore', reason: purchaseFailureReason(e, PURCHASES_ERROR_CODE) } },
    );
  }
  return resolveRestoreOutcome(run).outcome;
}

/**
 * 스토어 구독 관리 화면 열기(명세 §2.3). 스토어 URL 을 코드에 직접 쓰지 않는다.
 *  - iOS: showManageSubscriptions() → 실패 시 managementURL
 *  - Android: managementURL
 * customerInfo 는 관리 URL 을 얻는 데만 쓴다 — Plus 판정에 쓰지 않는다(ADR 조건 ②).
 */
export async function openSubscriptionManagement(): Promise<'opened' | 'unavailable'> {
  if (!configured) return 'unavailable';

  if (Platform.OS === 'ios') {
    try {
      await Purchases.showManageSubscriptions();
      return 'opened';
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { scope: 'purchases.manageSheet' }, { tags: { area: 'paywall' } });
    }
  }

  try {
    const info = await Purchases.getCustomerInfo();
    if (info.managementURL) {
      await Linking.openURL(info.managementURL);
      return 'opened';
    }
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { scope: 'purchases.manageUrl' }, { tags: { area: 'paywall' } });
  }
  return 'unavailable';
}

