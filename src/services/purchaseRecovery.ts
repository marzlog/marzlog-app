/**
 * 구매 오류 뒤 자격 재확인 — 순수 함수 (RN/SDK 런타임 비의존, 단위 테스트 대상). B-PURCHASE-ERROR-AFTER-SUCCESS.
 *
 * 결제 시트 승인 뒤 네트워크 오류 등으로 purchasePackage 가 거부돼도 스토어 거래는 끝났을 수 있다
 * (2026-10-19 실측: 앱 "A network error has occurred" → RC RENEWAL 웹훅 200 · 서버 Plus 반영).
 * RC CustomerInfo 에 Plus 자격이 있으면 실패 안내 대신 서버 반영 확인(/auth/me)으로 넘긴다.
 * ★자격은 "반영 확인을 시작할지"만 정한다 — Plus 판정·표시는 서버 plan 만(ADR-2026-09-18-01 ②, PW-1).
 */
import type { PURCHASES_ERROR_CODE } from 'react-native-purchases';

/** RevenueCat entitlement 식별자(대시보드 entitlement `plus`) */
export const PLUS_ENTITLEMENT_ID = 'plus';

export type RecoveryErrorCodes = Pick<typeof PURCHASES_ERROR_CODE, 'PURCHASE_CANCELLED_ERROR'>;

export interface EntitlementInfoLike {
  entitlements?: { active?: Record<string, { isActive?: boolean } | null | undefined> | null } | null;
}

export function hasPlusEntitlement(info: EntitlementInfoLike | null | undefined): boolean {
  const ent = info?.entitlements?.active?.[PLUS_ENTITLEMENT_ID];
  return !!ent && ent.isActive !== false;
}

/**
 * 구매 오류 뒤 반영 확인으로 넘길지.
 *  - 사용자 취소: 아니오(결제가 없었다)
 *  - customerInfo 를 못 읽었으면(null): 아니오 — 기존 실패 안내
 *  - 그 외: Plus 자격이 활성이면 예
 */
export function shouldRecoverAfterPurchaseError(
  code: unknown,
  customerInfo: EntitlementInfoLike | null | undefined,
  codes: RecoveryErrorCodes,
): boolean {
  if (code === codes.PURCHASE_CANCELLED_ERROR) return false;
  return hasPlusEntitlement(customerInfo);
}

/**
 * 결제 화면 포커스·앱 복귀 때 RC 자격을 확인할지 — 서버가 아직 free 이고, 잠금 중이 아니고,
 * 이 화면에서 자동 반영 확인을 아직 하지 않았을 때만(미반영이 계속되면 매 복귀마다 30초 잠그지 않게).
 */
export function shouldCheckEntitlementOnResume(s: {
  isAuthenticated: boolean;
  isPlus: boolean;
  busy: boolean;
  autoReflectDone: boolean;
}): boolean {
  return s.isAuthenticated && !s.isPlus && !s.busy && !s.autoReflectDone;
}
