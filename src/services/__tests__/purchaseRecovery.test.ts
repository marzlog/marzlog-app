/**
 * 구매 오류 뒤 자격 재확인 단위 테스트 (B-PURCHASE-ERROR-AFTER-SUCCESS)
 */
import { PURCHASES_ERROR_CODE } from '@revenuecat/purchases-typescript-internal';
import {
  hasPlusEntitlement,
  shouldCheckEntitlementOnResume,
  shouldRecoverAfterPurchaseError,
} from '../purchaseRecovery';

const C = PURCHASES_ERROR_CODE;
const withPlus = { entitlements: { active: { plus: { isActive: true } } } };
const withoutPlus = { entitlements: { active: {} } };

describe('shouldRecoverAfterPurchaseError', () => {
  it('사용자 취소 → 재확인하지 않음(자격이 있어도)', () => {
    expect(shouldRecoverAfterPurchaseError(C.PURCHASE_CANCELLED_ERROR, withPlus, C)).toBe(false);
  });

  it('네트워크 오류 + Plus 자격 있음 → 반영 확인으로', () => {
    expect(shouldRecoverAfterPurchaseError(C.NETWORK_ERROR, withPlus, C)).toBe(true);
  });

  it('네트워크 오류 + 자격 없음 → 실패 안내', () => {
    expect(shouldRecoverAfterPurchaseError(C.NETWORK_ERROR, withoutPlus, C)).toBe(false);
  });

  it('getCustomerInfo 자체 실패(null) → 실패 안내', () => {
    expect(shouldRecoverAfterPurchaseError(C.NETWORK_ERROR, null, C)).toBe(false);
  });
});

describe('hasPlusEntitlement', () => {
  it('다른 entitlement 만 있으면 false', () => {
    expect(hasPlusEntitlement({ entitlements: { active: { other: { isActive: true } } } })).toBe(false);
  });

  it('isActive false 면 false', () => {
    expect(hasPlusEntitlement({ entitlements: { active: { plus: { isActive: false } } } })).toBe(false);
  });
});

describe('shouldCheckEntitlementOnResume', () => {
  const base = { isAuthenticated: true, isPlus: false, busy: false, autoReflectDone: false };

  it('로그인·free·잠금 아님·미실행 → 확인', () => {
    expect(shouldCheckEntitlementOnResume(base)).toBe(true);
  });

  it.each([
    ['미인증', { isAuthenticated: false }],
    ['이미 Plus', { isPlus: true }],
    ['잠금 중', { busy: true }],
    ['이 화면에서 이미 실행', { autoReflectDone: true }],
  ])('%s → 확인 안 함', (_label, patch) => {
    expect(shouldCheckEntitlementOnResume({ ...base, ...patch })).toBe(false);
  });
});
