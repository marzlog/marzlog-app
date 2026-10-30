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
 *  - resolveUnconfirmedRecheck: 자격 있음 → 구매 완료 경로 / 없음 → (D12) 유예 안이면 폴링, 유예 뒤면 구매 복원 제안
 *    / 확인 불가(오류·기기 계산) → 계속 대기
 *
 * D12(2026-10-30 iPhone 실기 28): 복귀 직후 첫 재확인이 RC 의 거래 수신(구매 후 13초)보다 먼저 '없음'을 읽고 그 1회로
 * "완료하지 못했어요"를 확정했다. 미확인 구매는 이제 실패로 끝내지 않는다 — 유예(UNCONFIRMED_GRACE_MS) 동안 RC·서버를
 * 다시 보고(pollUnconfirmedWithinGrace), 그래도 없으면 실패 대신 구매 복원을 제안한다. "완료하지 못했어요"는 미확인이
 * 아닌 즉시 실패(failed outcome)에만 남는다.
 */
export type RecheckRoute = 'unconfirmed' | 'auto-reflect' | 'skip';

export function resolveRecheckRoute(r: { hasUnconfirmed: boolean; online: boolean | null; inFlight: boolean }): RecheckRoute {
  if (r.inFlight) return 'skip';
  if (!r.hasUnconfirmed) return 'auto-reflect';
  return r.online === false ? 'skip' : 'unconfirmed';
}

/** RC 자격 확인 결과 — unknown = 읽기 실패·시간 초과·기기 계산(RC 서버 미확인) */
export type EntitlementCheck = 'active' | 'none' | 'unknown';

export type UnconfirmedRecheckAction = 'confirm' | 'poll' | 'suggest-restore' | 'keep-waiting';

/**
 * @param elapsedMs 미확인 시각부터 지난 시간. 유예 안의 '없음'은 RC 가 아직 거래를 못 받았을 수 있다 → 폴링
 */
export function resolveUnconfirmedRecheck(
  check: EntitlementCheck,
  elapsedMs: number,
  graceMs: number,
): UnconfirmedRecheckAction {
  if (check === 'active') return 'confirm';
  if (check === 'unknown') return 'keep-waiting';
  return elapsedMs < graceMs ? 'poll' : 'suggest-restore';
}

/**
 * 유예 구간(D12 조건부 승인 2026-10-30) — 시작 = 복귀 후 첫 재확인 시각, 끝 = min(시작 + graceMs, 미확인 시각 + maxMs).
 * resolveUnconfirmedRecheck·pollUnconfirmedWithinGrace 에는 (startedAt = 시작, graceMs = 끝 - 시작)으로 넘긴다.
 * 이미 상한을 지났으면 graceMs 0 → 첫 재확인 1회 뒤 바로 구매 복원 제안.
 */
export function resolveGraceWindow(r: {
  unconfirmedAt: number;
  firstRecheckAt: number;
  graceMs: number;
  maxMs: number;
}): { startedAt: number; graceMs: number } {
  const end = Math.min(r.firstRecheckAt + r.graceMs, r.unconfirmedAt + r.maxMs);
  return { startedAt: r.firstRecheckAt, graceMs: Math.max(0, end - r.firstRecheckAt) };
}

/** 유예 폴링 결과 — active: 구매 완료 경로 / none: 구매 복원 제안 / unknown: 계속 대기 / stopped: 중단(다른 경로가 처리) */
export type UnconfirmedPollResult = 'active' | 'none' | 'unknown' | 'stopped';

export interface UnconfirmedPollDeps {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  /** RC 현재 사용자가 로그인 사용자와 다르면 logIn 1회 — 폴링 전 한 번만 부른다. 결과와 무관하게 폴링은 진행 */
  ensureIdentity: () => Promise<unknown>;
  /** RC 캐시를 비운 자격 읽기 */
  readRc: () => Promise<EntitlementCheck>;
  /** 서버 /auth/me plan === 'plus'. 읽기 실패면 null */
  readServerPlus: () => Promise<boolean | null>;
  /** 미확인 구매가 다른 경로로 정리됐거나 화면을 떠났으면 true */
  shouldStop: () => boolean;
}

/**
 * 미확인 시각(startedAt)부터 graceMs 까지 pollMs 간격으로 RC·서버를 본다 — 어느 한쪽이 Plus 면 즉시 active.
 * 유예가 끝날 때 마지막 RC 판정이 '없음'이면 none(구매 복원 제안), 끝까지 확인 불가였으면 unknown(계속 대기).
 * 유예 안에서 최소 1회는 확인한다(이미 지났더라도 1회).
 */
export async function pollUnconfirmedWithinGrace(
  startedAt: number,
  deps: UnconfirmedPollDeps,
  opts: { graceMs: number; pollMs: number },
): Promise<UnconfirmedPollResult> {
  if (deps.shouldStop()) return 'stopped';
  try {
    await deps.ensureIdentity();
  } catch {
    // 재 logIn 실패 — 읽기에서 '없음'(다른 사용자) 또는 확인 불가로 드러난다
  }
  let lastRc: EntitlementCheck = 'unknown';
  for (;;) {
    if (deps.shouldStop()) return 'stopped';
    const [rc, serverPlus] = await Promise.all([deps.readRc(), deps.readServerPlus()]);
    if (deps.shouldStop()) return 'stopped';
    if (rc === 'active' || serverPlus === true) return 'active';
    lastRc = rc;
    const remaining = startedAt + opts.graceMs - deps.now();
    if (remaining <= 0) break;
    await deps.sleep(Math.min(opts.pollMs, remaining));
  }
  return lastRc === 'none' ? 'none' : 'unknown';
}
