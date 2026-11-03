/**
 * D12 · 결과 미확인 구매 유예 — resolveUnconfirmedRecheck(경과·유예) + pollUnconfirmedWithinGrace.
 * 2026-10-30 iPhone 실기 28: 구매 10:17:48Z → RC 수신 10:18:01Z(13초). 복귀 직후 첫 재확인의 '없음' 1회로
 * 실패를 확정하지 않게 한다.
 */
import { UNCONFIRMED_GRACE_MS, UNCONFIRMED_MAX_MS, UNCONFIRMED_POLL_MS } from '../../constants/plus';
import {
  pollUnconfirmedWithinGrace,
  resolveGraceWindow,
  resolveUnconfirmedRecheck,
  type EntitlementCheck,
  type UnconfirmedPollDeps,
} from '../reconnectRecheck';

const OPTS = { graceMs: UNCONFIRMED_GRACE_MS, pollMs: UNCONFIRMED_POLL_MS };

/** 가짜 시계 — sleep 이 시계를 진행시킨다. 호출 순서를 log 에 남긴다 */
function harness(opts: {
  rc?: EntitlementCheck[] | ((i: number) => EntitlementCheck);
  server?: Array<boolean | null> | ((i: number) => boolean | null);
  identityThrows?: boolean;
  stopAfterReads?: number;
  startOffsetMs?: number;
}) {
  let clock = 1_000_000;
  const startedAt = clock - (opts.startOffsetMs ?? 0);
  const log: string[] = [];
  let reads = 0;
  const pick = <T,>(src: T[] | ((i: number) => T) | undefined, i: number, fallback: T): T => {
    if (!src) return fallback;
    if (typeof src === 'function') return (src as (i: number) => T)(i);
    return i < src.length ? src[i] : src[src.length - 1];
  };
  const deps: UnconfirmedPollDeps = {
    now: () => clock,
    sleep: async (ms) => {
      log.push(`sleep:${ms}`);
      clock += ms;
    },
    ensureIdentity: async () => {
      log.push('identity');
      if (opts.identityThrows) throw new Error('logIn failed');
      return true;
    },
    readRc: async () => {
      const i = reads;
      log.push(`rc:${i}`);
      return pick(opts.rc, i, 'none');
    },
    readServerPlus: async () => {
      const v = pick(opts.server, reads, false as boolean | null);
      reads += 1;
      return v;
    },
    shouldStop: () => opts.stopAfterReads !== undefined && reads >= opts.stopAfterReads,
  };
  return { deps, startedAt, log, reads: () => reads, elapsed: () => clock - startedAt };
}

describe('상수', () => {
  it('유예 60초 · 폴링 5초', () => {
    expect(UNCONFIRMED_GRACE_MS).toBe(60_000);
    expect(UNCONFIRMED_POLL_MS).toBe(5_000);
  });
});

describe('resolveUnconfirmedRecheck — 유예 경계', () => {
  it.each([
    [0, 'poll'],
    [13_000, 'poll'], // 실측: 구매 13초 뒤 RC 수신
    [UNCONFIRMED_GRACE_MS - 1, 'poll'],
    [UNCONFIRMED_GRACE_MS, 'suggest-restore'],
    [UNCONFIRMED_GRACE_MS + 30_000, 'suggest-restore'],
  ])("'없음' · 경과 %pms → %p", (elapsed, expected) => {
    expect(resolveUnconfirmedRecheck('none', elapsed as number, UNCONFIRMED_GRACE_MS)).toBe(expected);
  });

  it.each([0, UNCONFIRMED_GRACE_MS * 2])("'있음'은 경과와 무관하게 confirm (%pms)", (elapsed) => {
    expect(resolveUnconfirmedRecheck('active', elapsed, UNCONFIRMED_GRACE_MS)).toBe('confirm');
  });

  it.each([0, UNCONFIRMED_GRACE_MS * 2])("확인 불가는 경과와 무관하게 keep-waiting (%pms)", (elapsed) => {
    expect(resolveUnconfirmedRecheck('unknown', elapsed, UNCONFIRMED_GRACE_MS)).toBe('keep-waiting');
  });

  it("'없음'은 더 이상 즉시 실패(alert-failed)가 아니다", () => {
    for (const elapsed of [0, UNCONFIRMED_GRACE_MS]) {
      expect(resolveUnconfirmedRecheck('none', elapsed, UNCONFIRMED_GRACE_MS)).not.toBe('alert-failed');
    }
  });
});

describe('pollUnconfirmedWithinGrace', () => {
  it('서버 /auth/me 가 Plus 면 즉시 active (RC 가 아직 없음이어도)', async () => {
    const h = harness({ rc: ['none'], server: [true] });
    await expect(pollUnconfirmedWithinGrace(h.startedAt, h.deps, OPTS)).resolves.toBe('active');
    expect(h.reads()).toBe(1);
  });

  it('RC 가 세 번째 읽기(10초)에 Plus 가 되면 active — 실측 13초 수신 시나리오', async () => {
    const h = harness({ rc: ['none', 'none', 'active'], server: [false] });
    await expect(pollUnconfirmedWithinGrace(h.startedAt, h.deps, OPTS)).resolves.toBe('active');
    expect(h.reads()).toBe(3);
    expect(h.log.filter((l) => l.startsWith('sleep'))).toEqual(['sleep:5000', 'sleep:5000']);
  });

  it('유예 끝까지 없음이면 none (→ 구매 복원 제안), 유예를 넘겨 기다리지 않는다', async () => {
    const h = harness({ rc: ['none'], server: [false] });
    await expect(pollUnconfirmedWithinGrace(h.startedAt, h.deps, OPTS)).resolves.toBe('none');
    expect(h.elapsed()).toBe(UNCONFIRMED_GRACE_MS);
    expect(h.reads()).toBe(UNCONFIRMED_GRACE_MS / UNCONFIRMED_POLL_MS + 1); // 0·5·…·60초
  });

  it('유예 중 일부가 이미 지났으면 남은 시간만 기다린다', async () => {
    const h = harness({ rc: ['none'], server: [false], startOffsetMs: 57_000 });
    await expect(pollUnconfirmedWithinGrace(h.startedAt, h.deps, OPTS)).resolves.toBe('none');
    expect(h.log.filter((l) => l.startsWith('sleep'))).toEqual(['sleep:3000']);
  });

  it('유예가 이미 끝났어도 최소 1회는 확인한다', async () => {
    const h = harness({ rc: ['active'], startOffsetMs: UNCONFIRMED_GRACE_MS + 1 });
    await expect(pollUnconfirmedWithinGrace(h.startedAt, h.deps, OPTS)).resolves.toBe('active');
    expect(h.reads()).toBe(1);
  });

  it('끝까지 확인 불가(RC unknown·서버 실패)면 unknown — 복원 제안하지 않고 계속 대기', async () => {
    const h = harness({ rc: ['unknown'], server: [null] });
    await expect(pollUnconfirmedWithinGrace(h.startedAt, h.deps, OPTS)).resolves.toBe('unknown');
  });

  it('마지막 RC 판정이 확인 불가면 앞서 없음이었어도 unknown', async () => {
    const h = harness({ rc: (i) => (i < 5 ? 'none' : 'unknown'), server: [false] });
    await expect(pollUnconfirmedWithinGrace(h.startedAt, h.deps, OPTS)).resolves.toBe('unknown');
  });

  it('로그인 사용자 불일치 대비 — 폴링 전에 ensureIdentity(logIn) 1회, 그 뒤 읽기', async () => {
    const h = harness({ rc: ['none', 'active'], server: [false] });
    await expect(pollUnconfirmedWithinGrace(h.startedAt, h.deps, OPTS)).resolves.toBe('active');
    expect(h.log[0]).toBe('identity');
    expect(h.log.filter((l) => l === 'identity')).toHaveLength(1);
    expect(h.log[1]).toBe('rc:0');
  });

  it('logIn 이 실패해도 폴링은 진행한다 (결과는 읽기가 드러낸다)', async () => {
    const h = harness({ rc: ['active'], identityThrows: true });
    await expect(pollUnconfirmedWithinGrace(h.startedAt, h.deps, OPTS)).resolves.toBe('active');
    expect(h.log.slice(0, 2)).toEqual(['identity', 'rc:0']);
  });

  it('미확인이 다른 경로로 정리되면 stopped (완료 화면 중복 이동 방지)', async () => {
    const h = harness({ rc: ['none'], server: [false], stopAfterReads: 2 });
    await expect(pollUnconfirmedWithinGrace(h.startedAt, h.deps, OPTS)).resolves.toBe('stopped');
    expect(h.reads()).toBe(2);
  });

  it('처음부터 정리돼 있으면 logIn·읽기 없이 stopped', async () => {
    const h = harness({ stopAfterReads: 0 });
    await expect(pollUnconfirmedWithinGrace(h.startedAt, h.deps, OPTS)).resolves.toBe('stopped');
    expect(h.log).toEqual([]);
  });
});

describe('유예 기준 시각 — 복귀 후 첫 재확인부터 60초, 미확인부터 총 180초 상한 (조건부 승인 수정)', () => {
  const T0 = 5_000_000; // 미확인이 된 시각
  const window = (offlineMs: number) =>
    resolveGraceWindow({
      unconfirmedAt: T0,
      firstRecheckAt: T0 + offlineMs,
      graceMs: UNCONFIRMED_GRACE_MS,
      maxMs: UNCONFIRMED_MAX_MS,
    });

  it('총 상한은 180초', () => {
    expect(UNCONFIRMED_MAX_MS).toBe(180_000);
  });

  it('바로 복귀(1초)면 첫 재확인부터 60초', () => {
    expect(window(1_000)).toEqual({ startedAt: T0 + 1_000, graceMs: 60_000 });
  });

  it('오프라인 2분 후 복귀 → 복귀 시점부터 60초 폴링', async () => {
    const w = window(120_000);
    expect(w).toEqual({ startedAt: T0 + 120_000, graceMs: 60_000 });
    expect(resolveUnconfirmedRecheck('none', 0, w.graceMs)).toBe('poll');
    const h = harness({ rc: ['none'], server: [false] }); // 시계 = 첫 재확인 시각
    await expect(
      pollUnconfirmedWithinGrace(h.startedAt, h.deps, { graceMs: w.graceMs, pollMs: UNCONFIRMED_POLL_MS }),
    ).resolves.toBe('none');
    expect(h.elapsed()).toBe(60_000);
    expect(h.reads()).toBe(13);
  });

  it('오프라인 2분 30초 후 복귀 → 30초만 폴링 (총 상한이 먼저 끝남)', async () => {
    const w = window(150_000);
    expect(w).toEqual({ startedAt: T0 + 150_000, graceMs: 30_000 });
    expect(resolveUnconfirmedRecheck('none', 0, w.graceMs)).toBe('poll');
    const h = harness({ rc: ['none'], server: [false] });
    await expect(
      pollUnconfirmedWithinGrace(h.startedAt, h.deps, { graceMs: w.graceMs, pollMs: UNCONFIRMED_POLL_MS }),
    ).resolves.toBe('none');
    expect(h.elapsed()).toBe(30_000);
    expect(h.reads()).toBe(7);
  });

  it.each([180_000, 200_000, 600_000])(
    '오프라인 %pms — 둘 다 지나면 첫 재확인 1회 뒤 바로 suggest-restore (폴링 없음)',
    (offlineMs) => {
      const w = window(offlineMs);
      expect(w.graceMs).toBe(0);
      expect(resolveUnconfirmedRecheck('none', 0, w.graceMs)).toBe('suggest-restore');
      expect(resolveUnconfirmedRecheck('active', 0, w.graceMs)).toBe('confirm');
    },
  );

  it('두 번째 재확인은 첫 재확인 시각을 그대로 쓴다 — 유예가 복귀마다 늘어나지 않는다', () => {
    const first = window(10_000);
    // 40초 뒤 다른 트리거로 다시 들어와도 같은 구간(첫 재확인 + 60초)
    expect(resolveUnconfirmedRecheck('none', 40_000, first.graceMs)).toBe('poll');
    expect(resolveUnconfirmedRecheck('none', 60_000, first.graceMs)).toBe('suggest-restore');
  });
});
