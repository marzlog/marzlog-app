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

/**
 * B-UNCONFIRMED-RACE(2026-10-22 iPhone 실측): 결과 미확인 구매 뒤 비행기 모드 해제 → 포그라운드 복귀의 자동 반영 확인(→ /subscription)과
 * 네트워크 복귀의 미확인 재확인(→ /plus-success)이 둘 다 돌았고, 미확인 직후 예약된 실패 대화상자가 구독 화면 위에 떴다.
 *  - resolveRecheckRoute: 포커스·복귀·네트워크 복귀 트리거 공용 — 미확인 구매가 있으면 그 재확인만(자동 반영 확인은 건너뜀),
 *    연결 없음이 확정이면 다음 복귀까지 기다린다. 확인이 진행 중이면 건너뛴다(두 경로가 겹치지 않게)
 *  - resolveUnconfirmedRecheck: 자격 있음 → 구매 완료 경로 / 없음 → 그때 실패 안내 1회 / 확인 불가(오류·기기 계산) → 계속 대기
 */
export type RecheckRoute = 'unconfirmed' | 'auto-reflect' | 'skip';

export function resolveRecheckRoute(r: { hasUnconfirmed: boolean; online: boolean | null; inFlight: boolean }): RecheckRoute {
  if (r.inFlight) return 'skip';
  if (!r.hasUnconfirmed) return 'auto-reflect';
  return r.online === false ? 'skip' : 'unconfirmed';
}

/** RC 자격 확인 결과 — unknown = 읽기 실패·시간 초과·기기 계산(RC 서버 미확인) */
export type EntitlementCheck = 'active' | 'none' | 'unknown';

export type UnconfirmedRecheckAction = 'confirm' | 'alert-failed' | 'keep-waiting';

export function resolveUnconfirmedRecheck(check: EntitlementCheck): UnconfirmedRecheckAction {
  if (check === 'active') return 'confirm';
  return check === 'none' ? 'alert-failed' : 'keep-waiting';
}
