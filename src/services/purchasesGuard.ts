/**
 * RevenueCat 초기화 가드 — 순수 판정 함수 (RN/SDK 비의존, 단위 테스트 대상).
 *
 * no-op 사유:
 *  - web: 결제 대상 플랫폼 아님
 *  - no-native-module: RNPurchases 네이티브 모듈이 없는 바이너리 (RC 도입 전 1.0.2 런타임).
 *    ★production 에서 발동 = "Build 34 출고 전 1.0.2 대상 OTA 금지" 원칙 위반 신호 → 관측 필수.
 *  - no-api-key: 해당 플랫폼 EXPO_PUBLIC_RC_API_KEY_* 미주입
 */
export type PurchasesSkipReason = 'web' | 'no-native-module' | 'no-api-key';

export type PurchasesSetup =
  | { ok: true; apiKey: string }
  | { ok: false; reason: PurchasesSkipReason };

export interface PurchasesSetupInput {
  platform: string;
  hasNativeModule: boolean;
  iosKey?: string;
  androidKey?: string;
}

export function resolvePurchasesSetup(input: PurchasesSetupInput): PurchasesSetup {
  if (input.platform === 'web') return { ok: false, reason: 'web' };
  if (!input.hasNativeModule) return { ok: false, reason: 'no-native-module' };

  const raw = input.platform === 'ios' ? input.iosKey : input.platform === 'android' ? input.androidKey : undefined;
  const apiKey = raw?.trim();
  if (!apiKey) return { ok: false, reason: 'no-api-key' };

  return { ok: true, apiKey };
}
