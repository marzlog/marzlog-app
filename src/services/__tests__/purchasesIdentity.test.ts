import {
  isAnonymousAppUserId,
  normalizeAppUserId,
  resolveIdentityTransition,
  runWithVerifiedIdentity,
  shouldRetryIdentity,
  verifyPurchaseIdentity,
  type IdentityDeps,
} from '../purchasesIdentity';

describe('resolveIdentityTransition', () => {
  it('미인증 → 로그인: logIn(서버 user id)', () => {
    expect(resolveIdentityTransition(null, 'u-1')).toEqual({ type: 'login', appUserId: 'u-1' });
  });

  it('로그인 → 로그아웃: logOut', () => {
    expect(resolveIdentityTransition('u-1', null)).toEqual({ type: 'logout' });
  });

  it('다른 계정으로 직접 교체: 새 id 로 logIn (logOut 경유 불요)', () => {
    expect(resolveIdentityTransition('u-1', 'u-2')).toEqual({ type: 'login', appUserId: 'u-2' });
  });

  it('id 불변(다른 필드 변화)은 무동작', () => {
    expect(resolveIdentityTransition('u-1', 'u-1')).toBeNull();
    expect(resolveIdentityTransition(null, null)).toBeNull();
  });

  it('undefined·빈 문자열은 미인증으로 본다', () => {
    expect(resolveIdentityTransition(undefined, null)).toBeNull();
    expect(resolveIdentityTransition('', undefined)).toBeNull();
    expect(resolveIdentityTransition('u-1', '')).toEqual({ type: 'logout' });
  });
});

// ─── D5-b-3 구매·복원 직전 신원 대조 ─────────────────────────────────────────────

const SERVER = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const ANON = '$RCAnonymousID:abc123';

/** RC 쪽 상태를 흉내 — logIn 성공 시 현재 id 가 바뀐다 */
function fakeRc(initial: string | null, opts: { logInThrows?: unknown; logInSetsTo?: string; getThrows?: boolean } = {}) {
  let current = initial;
  const order: string[] = [];
  const deps: IdentityDeps = {
    waitForQueue: jest.fn(async () => {
      order.push('wait');
    }),
    getAppUserId: jest.fn(async () => {
      order.push('get');
      if (opts.getThrows || current === null) throw new Error('no user');
      return current;
    }),
    logIn: jest.fn(async (id: string) => {
      order.push('logIn');
      if (opts.logInThrows) throw opts.logInThrows;
      current = opts.logInSetsTo ?? id;
    }),
  };
  return { deps, order };
}

describe('normalizeAppUserId — 서버 웹훅 매핑(uuid.UUID)과 같은 규칙', () => {
  it('대소문자는 무시한다', () => {
    expect(normalizeAppUserId(SERVER.toUpperCase())).toBe(SERVER);
  });

  it('공백은 무시하지 않는다(서버도 매핑 못 함 → 다름)', () => {
    expect(normalizeAppUserId(` ${SERVER}`)).not.toBe(normalizeAppUserId(SERVER));
    expect(normalizeAppUserId(`${SERVER}\n`)).not.toBe(normalizeAppUserId(SERVER));
  });

  it('null·undefined·빈 문자열 → null', () => {
    expect(normalizeAppUserId(null)).toBeNull();
    expect(normalizeAppUserId(undefined)).toBeNull();
    expect(normalizeAppUserId('')).toBeNull();
  });

  it('익명 id 판별', () => {
    expect(isAnonymousAppUserId(ANON)).toBe(true);
    expect(isAnonymousAppUserId(SERVER)).toBe(false);
    expect(isAnonymousAppUserId(null)).toBe(false);
  });
});

describe('verifyPurchaseIdentity', () => {
  it('일치 → 통과, 재 logIn 없음. 큐 대기가 먼저', async () => {
    const { deps, order } = fakeRc(SERVER);
    expect(await verifyPurchaseIdentity(SERVER, deps)).toEqual({ ok: true, relogged: false });
    expect(deps.logIn).not.toHaveBeenCalled();
    expect(order).toEqual(['wait', 'get']);
  });

  it('대소문자만 다름 → 오탐 없이 통과', async () => {
    const { deps } = fakeRc(SERVER.toUpperCase());
    expect(await verifyPurchaseIdentity(SERVER, deps)).toEqual({ ok: true, relogged: false });
    expect(deps.logIn).not.toHaveBeenCalled();
  });

  it('익명(로그인 때 logIn 실패) → 재 logIn 1회로 교정 후 통과', async () => {
    const { deps, order } = fakeRc(ANON);
    expect(await verifyPurchaseIdentity(SERVER, deps)).toEqual({ ok: true, relogged: true });
    expect(deps.logIn).toHaveBeenCalledTimes(1);
    expect(deps.logIn).toHaveBeenCalledWith(SERVER);
    expect(order).toEqual(['wait', 'get', 'logIn', 'get']);
  });

  it('다른 계정 id → 재 logIn 으로 교정 후 통과', async () => {
    const { deps } = fakeRc('11111111-2222-3333-4444-555555555555');
    expect(await verifyPurchaseIdentity(SERVER, deps)).toEqual({ ok: true, relogged: true });
  });

  it('getAppUserID 실패(알 수 없음) → 재 logIn 후 재대조', async () => {
    const { deps } = fakeRc(null);
    expect(await verifyPurchaseIdentity(SERVER, deps)).toEqual({ ok: true, relogged: true });
  });

  it('재 logIn 이 throw(네트워크) → relogin_failed, 익명 여부 표시', async () => {
    const netErr = Object.assign(new Error('network'), { code: '10' });
    const { deps } = fakeRc(ANON, { logInThrows: netErr });
    const v = await verifyPurchaseIdentity(SERVER, deps);
    expect(v).toEqual({ ok: false, reason: 'relogin_failed', rcAnonymous: true, reloginError: netErr });
    expect(deps.logIn).toHaveBeenCalledTimes(1);
  });

  it('재 logIn 은 끝났는데 여전히 다름 → id_mismatch(relogin_failed 와 구분)', async () => {
    const { deps } = fakeRc(ANON, { logInSetsTo: 'someone-else' });
    const v = await verifyPurchaseIdentity(SERVER, deps);
    expect(v).toEqual({ ok: false, reason: 'id_mismatch', rcAnonymous: false, reloginError: null });
    expect(deps.logIn).toHaveBeenCalledTimes(1);
  });

  it.each([null, undefined, ''])('서버 user.id 없음(%p, 비로그인) → no_server_user, SDK 호출 0', async (id) => {
    const { deps } = fakeRc(SERVER);
    const v = await verifyPurchaseIdentity(id, deps);
    expect(v).toEqual({ ok: false, reason: 'no_server_user', rcAnonymous: false, reloginError: null });
    expect(deps.waitForQueue).not.toHaveBeenCalled();
    expect(deps.getAppUserId).not.toHaveBeenCalled();
    expect(deps.logIn).not.toHaveBeenCalled();
  });
});

describe('runWithVerifiedIdentity — 차단이면 스토어 호출(구매 시트·복원) 전에 반환', () => {
  it('불일치 → storeCall(purchasePackage) 미호출', async () => {
    const { deps } = fakeRc(ANON, { logInThrows: new Error('network') });
    const storeCall = jest.fn(async () => 'sheet');
    const run = await runWithVerifiedIdentity(() => verifyPurchaseIdentity(SERVER, deps), storeCall);
    expect(run.blocked).toMatchObject({ ok: false, reason: 'relogin_failed' });
    expect(storeCall).not.toHaveBeenCalled();
  });

  it('비로그인 → storeCall 미호출', async () => {
    const { deps } = fakeRc(SERVER);
    const storeCall = jest.fn(async () => 'sheet');
    const run = await runWithVerifiedIdentity(() => verifyPurchaseIdentity(null, deps), storeCall);
    expect(run.blocked).toMatchObject({ reason: 'no_server_user' });
    expect(storeCall).not.toHaveBeenCalled();
  });

  it('통과 → storeCall 은 대조 뒤에 1회', async () => {
    const { deps, order } = fakeRc(ANON);
    const storeCall = jest.fn(async () => {
      order.push('store');
      return 'sheet';
    });
    const run = await runWithVerifiedIdentity(() => verifyPurchaseIdentity(SERVER, deps), storeCall);
    expect(run).toEqual({ blocked: null, result: 'sheet' });
    expect(order).toEqual(['wait', 'get', 'logIn', 'get', 'store']);
  });
});

describe('shouldRetryIdentity — 앱 복귀 시 logIn 재시도', () => {
  const base = { configured: true, target: SERVER, synced: false, inFlight: false };

  it('로그인 상태 + 마지막 logIn 실패 → 재시도', () => {
    expect(shouldRetryIdentity(base)).toBe(true);
  });

  it('이미 동기화 · 비로그인 · RC 미설정 · 진행 중 → 건너뜀', () => {
    expect(shouldRetryIdentity({ ...base, synced: true })).toBe(false);
    expect(shouldRetryIdentity({ ...base, target: null })).toBe(false);
    expect(shouldRetryIdentity({ ...base, configured: false })).toBe(false);
    expect(shouldRetryIdentity({ ...base, inFlight: true })).toBe(false);
  });
});
