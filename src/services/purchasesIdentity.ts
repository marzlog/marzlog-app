/**
 * RC 사용자 식별 전이 판정 — 순수 함수 (RN/SDK 비의존, 단위 테스트 대상).
 *
 * authStore 의 user.id 변화만 본다. 로그인 경로 6곳(google/kakao/apple/email/register/checkAuth)과
 * 해제 경로 3곳(logout/forceLogout/deleteAccount)을 각각 건드리지 않고 이 한 지점에서 처리한다.
 *  - id 등장 또는 다른 id 로 교체 → logIn(서버 user id). 익명 → 식별 alias/transfer 는 RC logIn 이 수행.
 *  - id 소멸 → logOut (익명 상태면 래퍼가 건너뜀 — RC logOut 은 익명에서 reject)
 *  - id 불변(isLoading 등 다른 필드 변화) → 무동작
 */
export type IdentityTransition = { type: 'login'; appUserId: string } | { type: 'logout' } | null;

export function resolveIdentityTransition(
  prevId: string | null | undefined,
  nextId: string | null | undefined,
): IdentityTransition {
  const prev = prevId || null;
  const next = nextId || null;
  if (prev === next) return null;
  if (next) return { type: 'login', appUserId: next };
  return { type: 'logout' };
}

// ─── 구매·복원 직전 신원 대조 (PAYWALL D5-b-3, 신원 수리안 ①②③) ─────────────────────────
// ① 식별 큐(identityQueue) 대기 → ② RC appUserID 와 서버 user.id 대조, 다르면 재 logIn 1회 후 재대조
// → ③ 그래도 다르면 스토어 호출(구매 시트·복원) 전에 차단. 기록(Sentry)은 호출부(purchases.ts)가 한다.

/** RC 익명 사용자 접두사 — 이 id 로 산 구매는 서버가 사용자에 매핑하지 못한다(웹훅 resolve_user_id → None) */
export const RC_ANONYMOUS_PREFIX = '$RCAnonymousID:';

/**
 * 대조용 정규화 — 서버 웹훅 매핑 규칙(uuid.UUID 파싱)과 같게 맞춘다.
 *  - 대소문자: 무시(소문자로). 서버도 대소문자와 무관하게 같은 사용자로 매핑한다.
 *  - 공백: 무시하지 않는다. 앞뒤 공백이 붙은 id 는 서버도 매핑하지 못하므로 "다름"이 맞다 — 재 logIn 이 교정한다.
 *  - null·undefined·빈 문자열 → null(값 없음).
 */
export function normalizeAppUserId(id: string | null | undefined): string | null {
  if (typeof id !== 'string' || id === '') return null;
  return id.toLowerCase();
}

export function isAnonymousAppUserId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(RC_ANONYMOUS_PREFIX);
}

/**
 * 차단 사유 — Sentry tag `reason` 으로 구분한다.
 *  - no_server_user: 서버 user.id 없음(비로그인). SDK 를 부르지 않고 차단.
 *  - relogin_failed: 재 logIn 이 throw(네트워크 등) — RC 쪽 id 는 그대로.
 *  - id_mismatch: 재 logIn 은 끝났는데도 RC id 가 서버 id 와 다름.
 */
export type IdentityBlockReason = 'no_server_user' | 'relogin_failed' | 'id_mismatch';

export type IdentityVerdict =
  | { ok: true; relogged: boolean }
  | { ok: false; reason: IdentityBlockReason; rcAnonymous: boolean; reloginError: unknown };

export interface IdentityDeps {
  /** 진행 중인 식별 호출(logIn/logOut)이 끝날 때까지 대기 */
  waitForQueue: () => Promise<void>;
  /** RC 현재 appUserID. throw 하면 "알 수 없음"(null)으로 다룬다 */
  getAppUserId: () => Promise<string>;
  /** 서버 id 로 RC logIn — 식별 큐를 거쳐야 한다 */
  logIn: (appUserId: string) => Promise<void>;
}

async function readAppUserId(deps: IdentityDeps): Promise<string | null> {
  try {
    return await deps.getAppUserId();
  } catch {
    return null;
  }
}

export async function verifyPurchaseIdentity(
  serverUserId: string | null | undefined,
  deps: IdentityDeps,
): Promise<IdentityVerdict> {
  const server = normalizeAppUserId(serverUserId);
  if (!server) return { ok: false, reason: 'no_server_user', rcAnonymous: false, reloginError: null };

  await deps.waitForQueue();
  const first = await readAppUserId(deps);
  if (normalizeAppUserId(first) === server) return { ok: true, relogged: false };

  let reloginError: unknown = null;
  try {
    await deps.logIn(serverUserId as string);
  } catch (e) {
    reloginError = e ?? new Error('logIn failed');
  }
  const second = await readAppUserId(deps);
  if (normalizeAppUserId(second) === server) return { ok: true, relogged: true };

  return {
    ok: false,
    reason: reloginError ? 'relogin_failed' : 'id_mismatch',
    rcAnonymous: isAnonymousAppUserId(second ?? first),
    reloginError,
  };
}

/**
 * 대조를 통과해야만 스토어 호출(구매 시트·복원)을 실행한다 — 차단이면 storeCall 을 부르지 않는다.
 */
export async function runWithVerifiedIdentity<T>(
  verify: () => Promise<IdentityVerdict>,
  storeCall: () => Promise<T>,
): Promise<{ blocked: Extract<IdentityVerdict, { ok: false }> } | { blocked: null; result: T }> {
  const verdict = await verify();
  if (!verdict.ok) return { blocked: verdict };
  return { blocked: null, result: await storeCall() };
}

/**
 * 앱 복귀 시 logIn 재시도 여부 — 로그인 상태에서 마지막 logIn 이 실패한 채로 남아 있을 때만.
 * inFlight 면 건너뛴다(복귀가 연달아 와도 1회).
 */
export function shouldRetryIdentity(state: {
  configured: boolean;
  target: string | null;
  synced: boolean;
  inFlight: boolean;
}): boolean {
  return state.configured && !!state.target && !state.synced && !state.inFlight;
}
