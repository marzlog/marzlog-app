import { NativeModules, Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE, type PurchasesPackage } from 'react-native-purchases';

import { captureError, captureMessage } from '../utils/sentry';
import { resolvePurchasesSetup } from './purchasesGuard';
import { resolveIdentityTransition } from './purchasesIdentity';
import { PAYWALL_OFFERING_ID, pickPaywallPackages, type PaywallPlanKind } from './paywallPackages';

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

/**
 * authStore user.id 전이를 RC 식별에 반영한다(_layout 의 subscribe 단일 지점에서 호출).
 * configure 전/가드 skip 상태면 무동작 — skip 사실은 initPurchases 가 이미 관측으로 남겼다.
 */
export function syncPurchasesIdentity(prevUserId: string | null | undefined, nextUserId: string | null | undefined): void {
  const transition = resolveIdentityTransition(prevUserId, nextUserId);
  if (!transition || !configured) return;

  identityQueue = identityQueue.then(async () => {
    try {
      if (transition.type === 'login') {
        await Purchases.logIn(transition.appUserId);
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

// ─── 페이월 (2d) ────────────────────────────────────────────────────────────────
// 화면에는 표시용 값(가격 문자열)만 넘기고 SDK 패키지 객체는 여기서 보관한다.
// ★구매/복원 결과로 Plus 여부를 판정하지 않는다 — 성공은 서버 재조회 트리거일 뿐(ADR 조건 ②).

export type PaywallOffer = Partial<Record<PaywallPlanKind, { priceString: string }>>;

let paywallPackages: Partial<Record<PaywallPlanKind, PurchasesPackage>> = {};

/** offering 'default' 의 월/연 패키지를 불러온다. 미구성·상품 없음이면 null. */
export async function loadPaywallOffer(): Promise<PaywallOffer | null> {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.all[PAYWALL_OFFERING_ID];
    paywallPackages = offering ? pickPaywallPackages(offering.availablePackages) : {};
  } catch (e) {
    paywallPackages = {};
    captureError(e instanceof Error ? e : new Error(String(e)), { scope: 'purchases.loadOffer' });
    return null;
  }

  const offer: PaywallOffer = {};
  (Object.keys(paywallPackages) as PaywallPlanKind[]).forEach((kind) => {
    offer[kind] = { priceString: paywallPackages[kind]!.product.priceString };
  });
  return Object.keys(offer).length > 0 ? offer : null;
}

export type PurchaseOutcome = 'completed' | 'cancelled' | 'failed';

/** 구매 시트 호출. 'completed' 는 "스토어 거래가 끝났다"는 뜻일 뿐 Plus 판정이 아니다. */
export async function purchasePaywallPlan(kind: PaywallPlanKind): Promise<PurchaseOutcome> {
  const pkg = paywallPackages[kind];
  if (!configured || !pkg) return 'failed';
  try {
    await Purchases.purchasePackage(pkg);
    return 'completed';
  } catch (e: any) {
    if (e?.userCancelled || e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    captureError(e instanceof Error ? e : new Error(String(e?.message ?? e)), {
      scope: 'purchases.purchase',
      kind,
      code: e?.code,
    });
    return 'failed';
  }
}

/** 구매 복원. true = 복원 요청 완료(결과 판정은 서버 재조회로). */
export async function restorePaywallPurchases(): Promise<boolean> {
  if (!configured) return false;
  try {
    await Purchases.restorePurchases();
    return true;
  } catch (e: any) {
    captureError(e instanceof Error ? e : new Error(String(e?.message ?? e)), {
      scope: 'purchases.restore',
      code: e?.code,
    });
    return false;
  }
}
