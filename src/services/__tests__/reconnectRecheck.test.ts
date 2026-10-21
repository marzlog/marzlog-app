/**
 * 네트워크 복귀 재확인 단위 테스트 (B-REFLECT-ON-RECONNECT)
 */
import { PURCHASES_ERROR_CODE } from '@revenuecat/purchases-typescript-internal';
import { countsAsAutoReflectAttempt, isNetworkRestored, isOnline } from '../reconnectRecheck';
import { isUnconfirmedPurchaseError } from '../purchaseErrors';
import { TimeoutError } from '../../utils/withTimeout';

const C = PURCHASES_ERROR_CODE;
const err = (fields: Record<string, unknown>) => Object.assign(new Error('rc'), fields);

describe('isNetworkRestored', () => {
  it('연결 없음 확정 → 연결일 때만 복귀', () => {
    expect(isNetworkRestored(isOnline({ isConnected: false }), isOnline({ isConnected: true, isInternetReachable: true }))).toBe(true);
    // 판정 불가(null)에서 연결로 바뀐 것·연결 유지·연결이 끊긴 것은 복귀가 아니다
    expect(isNetworkRestored(isOnline({ isConnected: null }), isOnline({ isConnected: true }))).toBe(false);
    expect(isNetworkRestored(true, true)).toBe(false);
    expect(isNetworkRestored(true, isOnline({ isConnected: true, isInternetReachable: false }))).toBe(false);
  });
});

describe('countsAsAutoReflectAttempt', () => {
  it('대기 중 오프라인을 겪고 미반영이면 화면당 1회에 세지 않는다(복귀 때 다시 시도)', () => {
    expect(countsAsAutoReflectAttempt({ reflected: false, offlineDuringWait: true })).toBe(false);
    expect(countsAsAutoReflectAttempt({ reflected: false, offlineDuringWait: false })).toBe(true);
    expect(countsAsAutoReflectAttempt({ reflected: true, offlineDuringWait: true })).toBe(true);
  });
});

describe('isUnconfirmedPurchaseError', () => {
  it('네트워크·스토어 문제·오프라인·시간 초과 → 결과 미확인(복귀 때 조용히 재확인), 그 외 → 아님', () => {
    expect(isUnconfirmedPurchaseError(err({ code: C.NETWORK_ERROR }), C)).toBe(true);
    expect(isUnconfirmedPurchaseError(err({ code: C.STORE_PROBLEM_ERROR }), C)).toBe(true);
    expect(isUnconfirmedPurchaseError(err({ code: C.OFFLINE_CONNECTION_ERROR }), C)).toBe(true);
    expect(isUnconfirmedPurchaseError(new TimeoutError('PAYWALL_PURCHASE'), C)).toBe(true);
    expect(isUnconfirmedPurchaseError(err({ code: C.RECEIPT_ALREADY_IN_USE_ERROR }), C)).toBe(false);
    expect(isUnconfirmedPurchaseError(new Error('x'), C)).toBe(false);
  });
});
