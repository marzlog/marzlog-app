/**
 * 구매·복원 오류 분류 — 순수 함수 (RN/SDK 런타임 비의존, 단위 테스트 대상). PAYWALL D5-c.
 *
 * 오류 코드는 숫자 리터럴로 쓰지 않고 SDK 의 PURCHASES_ERROR_CODE 를 호출부가 넘긴다
 * (이 파일은 타입만 가져와 jest 에서 RN 네이티브 모듈을 불러오지 않는다).
 *  - cancelled: 사용자가 결제창을 닫음
 *  - already_owned: 이 기기의 스토어 계정이 이미 구독 중(PRODUCT_ALREADY_PURCHASED) → 복원 안내
 *  - failed: 그 외 전부. 영수증이 다른 사용자에 묶인 계열(RECEIPT_ALREADY_IN_USE·RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER)도
 *    failed 를 유지하고 Sentry tag reason 으로만 구분한다.
 */
import type { PURCHASES_ERROR_CODE } from 'react-native-purchases';

export type PurchaseErrorCodes = Pick<
  typeof PURCHASES_ERROR_CODE,
  | 'PURCHASE_CANCELLED_ERROR'
  | 'PRODUCT_ALREADY_PURCHASED_ERROR'
  | 'RECEIPT_ALREADY_IN_USE_ERROR'
  | 'RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR'
>;

export type PurchaseErrorClass = 'cancelled' | 'already_owned' | 'failed';

/** failed 의 Sentry tag reason */
export type PurchaseFailureReason = 'receipt_in_use' | 'other';

type ErrorLike = { userCancelled?: unknown; code?: unknown } | null | undefined;

function codeOf(e: unknown): unknown {
  return (e as ErrorLike)?.code;
}

export function classifyPurchaseError(e: unknown, codes: PurchaseErrorCodes): PurchaseErrorClass {
  if ((e as ErrorLike)?.userCancelled === true || codeOf(e) === codes.PURCHASE_CANCELLED_ERROR) return 'cancelled';
  if (codeOf(e) === codes.PRODUCT_ALREADY_PURCHASED_ERROR) return 'already_owned';
  return 'failed';
}

export function purchaseFailureReason(e: unknown, codes: PurchaseErrorCodes): PurchaseFailureReason {
  const code = codeOf(e);
  return code === codes.RECEIPT_ALREADY_IN_USE_ERROR || code === codes.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR
    ? 'receipt_in_use'
    : 'other';
}
