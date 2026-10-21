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
import { isTimeoutError } from '../utils/withTimeout';

export type PurchaseErrorCodes = Pick<
  typeof PURCHASES_ERROR_CODE,
  | 'PURCHASE_CANCELLED_ERROR'
  | 'PRODUCT_ALREADY_PURCHASED_ERROR'
  | 'RECEIPT_ALREADY_IN_USE_ERROR'
  | 'RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR'
>;

export type PurchaseErrorClass = 'cancelled' | 'already_owned' | 'failed';

/** failed 의 Sentry tag reason — timeout 은 래퍼 시간 제한 초과(B-PAYWALL-HANG) */
export type PurchaseFailureReason = 'receipt_in_use' | 'timeout' | 'other';

type ErrorLike = { userCancelled?: unknown; code?: unknown } | null | undefined;

function codeOf(e: unknown): unknown {
  return (e as ErrorLike)?.code;
}

export function classifyPurchaseError(e: unknown, codes: PurchaseErrorCodes): PurchaseErrorClass {
  if ((e as ErrorLike)?.userCancelled === true || codeOf(e) === codes.PURCHASE_CANCELLED_ERROR) return 'cancelled';
  if (codeOf(e) === codes.PRODUCT_ALREADY_PURCHASED_ERROR) return 'already_owned';
  return 'failed';
}

/** 결과 미확인 계열 — 시트 승인 뒤 거래가 끝났을 수 있다(B-REFLECT-ON-RECONNECT: 네트워크 복귀 때 조용히 재확인) */
export type UnconfirmedErrorCodes = Pick<
  typeof PURCHASES_ERROR_CODE,
  'NETWORK_ERROR' | 'STORE_PROBLEM_ERROR' | 'OFFLINE_CONNECTION_ERROR'
>;

export function isUnconfirmedPurchaseError(e: unknown, codes: UnconfirmedErrorCodes): boolean {
  if (isTimeoutError(e)) return true;
  const code = codeOf(e);
  return code === codes.NETWORK_ERROR || code === codes.STORE_PROBLEM_ERROR || code === codes.OFFLINE_CONNECTION_ERROR;
}

export function purchaseFailureReason(e: unknown, codes: PurchaseErrorCodes): PurchaseFailureReason {
  if (isTimeoutError(e)) return 'timeout';
  const code = codeOf(e);
  return code === codes.RECEIPT_ALREADY_IN_USE_ERROR || code === codes.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR
    ? 'receipt_in_use'
    : 'other';
}
