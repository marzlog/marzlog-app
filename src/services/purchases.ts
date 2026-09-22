import { NativeModules, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { captureError, captureMessage } from '../utils/sentry';
import { resolvePurchasesSetup } from './purchasesGuard';

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
