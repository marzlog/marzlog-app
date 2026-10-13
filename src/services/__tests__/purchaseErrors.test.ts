/**
 * classifyPurchaseError 단위 테스트 (PAYWALL D5-c)
 *
 * 코드 값은 SDK 상수 그대로 — react-native-purchases 가 다시 내보내는 것과 같은 enum(RN 비의존 패키지)에서 가져온다.
 */
import { PURCHASES_ERROR_CODE } from '@revenuecat/purchases-typescript-internal';
import { classifyPurchaseError, purchaseFailureReason } from '../purchaseErrors';

const C = PURCHASES_ERROR_CODE;
const err = (fields: Record<string, unknown>) => Object.assign(new Error('rc'), fields);

describe('classifyPurchaseError', () => {
  it('사용자 취소(userCancelled) → cancelled', () => {
    expect(classifyPurchaseError(err({ userCancelled: true }), C)).toBe('cancelled');
  });

  it('PURCHASE_CANCELLED_ERROR → cancelled', () => {
    expect(classifyPurchaseError(err({ code: C.PURCHASE_CANCELLED_ERROR }), C)).toBe('cancelled');
  });

  it('PRODUCT_ALREADY_PURCHASED_ERROR → already_owned', () => {
    expect(classifyPurchaseError(err({ code: C.PRODUCT_ALREADY_PURCHASED_ERROR, userCancelled: false }), C)).toBe('already_owned');
  });

  it.each([C.RECEIPT_ALREADY_IN_USE_ERROR, C.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR])(
    '영수증이 다른 사용자에 묶인 계열(%s) → failed 유지',
    (code) => {
      expect(classifyPurchaseError(err({ code }), C)).toBe('failed');
    },
  );

  it.each<[string, unknown]>([
    ['네트워크 오류', err({ code: C.NETWORK_ERROR })],
    ['알 수 없는 코드', err({ code: 'zzz' })],
    ['코드 없음', new Error('boom')],
    ['null', null],
    ['undefined', undefined],
    ['문자열 throw', 'boom'],
  ])('%s → failed', (_label, e) => {
    expect(classifyPurchaseError(e, C)).toBe('failed');
  });
});

describe('purchaseFailureReason (Sentry tag)', () => {
  it('영수증 사용 중 계열 → receipt_in_use', () => {
    expect(purchaseFailureReason(err({ code: C.RECEIPT_ALREADY_IN_USE_ERROR }), C)).toBe('receipt_in_use');
    expect(purchaseFailureReason(err({ code: C.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR }), C)).toBe('receipt_in_use');
  });

  it('그 외 → other', () => {
    expect(purchaseFailureReason(err({ code: C.NETWORK_ERROR }), C)).toBe('other');
    expect(purchaseFailureReason(new Error('x'), C)).toBe('other');
  });
});
