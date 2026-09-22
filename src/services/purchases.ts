import { NativeModules, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { captureError, captureMessage } from '../utils/sentry';
import { resolvePurchasesSetup } from './purchasesGuard';
import { resolveIdentityTransition } from './purchasesIdentity';

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
