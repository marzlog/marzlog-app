/**
 * 네트워크 복귀 때 재확인 — 순수 함수 (RN/SDK 비의존, 단위 테스트 대상). B-REFLECT-ON-RECONNECT.
 *
 * 2026-10-21 Android 실측: 결제 시트 승인 직후 비행기 모드 5초 → 구매 결과를 못 받고 실패 안내 → 비행기 모드 해제.
 * Google 결제·RC 웹훅(INITIAL_PURCHASE)·서버 Plus 반영은 4초 안에 끝났지만, 앱은 /auth/me 를 다시 읽지 않았다 —
 * 빠른 설정에서 비행기 모드를 끄는 것은 화면 포커스·AppState 변화가 아니라서 자동 반영 확인이 시작되지 않았다.
 *  - isOnline: NetInfo 상태 → true(연결) / false(연결 없음 확정) / null(판정 불가)
 *  - isNetworkRestored: 연결 없음이 확정됐다가 연결로 바뀐 순간만 true(판정 불가 → 연결은 복귀로 보지 않음)
 *  - countsAsAutoReflectAttempt: 자동 반영 확인 "화면당 1회"에 셀지 — 대기 중 오프라인을 겪고 미반영이면 세지 않는다
 */
export interface NetStateLike {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}

export function isOnline(state: NetStateLike | null | undefined): boolean | null {
  if (!state) return null;
  if (state.isConnected === false || state.isInternetReachable === false) return false;
  if (state.isConnected === true) return true;
  return null;
}

export function isNetworkRestored(prev: boolean | null, next: boolean | null): boolean {
  return prev === false && next === true;
}

export function countsAsAutoReflectAttempt(r: { reflected: boolean; offlineDuringWait: boolean }): boolean {
  return r.reflected || !r.offlineDuringWait;
}
