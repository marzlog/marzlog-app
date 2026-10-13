/**
 * waitForPlusReflected 단위 테스트 (PAYWALL 명세 §3.1 구매 흐름 4, D5-b 마감 시각 기준)
 *
 * 가짜 시계: now() 는 누적 시각, sleep 은 시각만 앞으로 민다. 시도 1회의 소요 시간은 cost 로 흉내.
 */
import { waitForPlusReflected } from '../plusReflect';
import {
  PLUS_REFLECT_ATTEMPT_TIMEOUT_MS,
  PLUS_REFLECT_INTERVAL_MS,
  PLUS_REFLECT_MAX_WAIT_MS,
} from '../../constants/plus';

const INTERVAL = 2_000;
const MAX_WAIT = 30_000;
const ATTEMPT_TIMEOUT = 5_000;

function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
    advance: (ms: number) => {
      t += ms;
    },
  };
}

type Outcome = boolean | 'throw';

/** cost: 고정 소요(ms) 또는 받은 시간 제한을 그대로 다 쓰는 'timeout' */
function attempts(clock: ReturnType<typeof fakeClock>, outcomes: Outcome[], cost: number | 'timeout' = 300) {
  let i = 0;
  return jest.fn(async (timeoutMs: number) => {
    clock.advance(cost === 'timeout' ? timeoutMs : cost);
    const o = outcomes[Math.min(i, outcomes.length - 1)];
    i += 1;
    if (o === 'throw') throw new Error(`timeout of ${timeoutMs}ms exceeded`);
    return o;
  });
}

/** 반영 시각(ms) 이후 시작한 시도부터 true */
function reflectsAt(clock: ReturnType<typeof fakeClock>, atMs: number, cost = 300) {
  return jest.fn(async (_timeoutMs: number) => {
    const started = clock.now();
    clock.advance(cost);
    return started >= atMs;
  });
}

const opts = (clock: ReturnType<typeof fakeClock>) => ({
  intervalMs: INTERVAL,
  maxWaitMs: MAX_WAIT,
  attemptTimeoutMs: ATTEMPT_TIMEOUT,
  now: clock.now,
  sleep: clock.sleep,
});

it('확정 상수: 간격 2초 · 최대 30초 · 시도별 5초', () => {
  expect([PLUS_REFLECT_INTERVAL_MS, PLUS_REFLECT_MAX_WAIT_MS, PLUS_REFLECT_ATTEMPT_TIMEOUT_MS]).toEqual([
    INTERVAL,
    MAX_WAIT,
    ATTEMPT_TIMEOUT,
  ]);
});

it('1회째 반영 → 바로 끝(대기 없음)', async () => {
  const clock = fakeClock();
  const fn = attempts(clock, [true]);
  const r = await waitForPlusReflected(fn, opts(clock));
  expect(r).toEqual({ reflected: true, attempts: 1 });
  expect(fn).toHaveBeenCalledTimes(1);
  expect(clock.now()).toBe(300);
});

it('3회째 반영 → 3번 시도, 시도 시작 간격은 interval', async () => {
  const clock = fakeClock();
  const fn = attempts(clock, [false, false, true]);
  const r = await waitForPlusReflected(fn, opts(clock));
  expect(r).toEqual({ reflected: true, attempts: 3 });
  expect(clock.now()).toBe(2 * INTERVAL + 300);
});

it.each([5_800, 14_300, 17_400, 6_600])('실측 웹훅 지연 %ims → 30초 안에 반영 확인', async (delay) => {
  const clock = fakeClock();
  const fn = reflectsAt(clock, delay);
  const r = await waitForPlusReflected(fn, opts(clock));
  expect(r.reflected).toBe(true);
  // 반영 뒤 첫 시도(최대 interval 뒤)에서 잡는다
  expect(clock.now()).toBeLessThanOrEqual(delay + INTERVAL + 300);
});

it('끝까지 미반영 → 30초 안에서만 시도, 15회', async () => {
  const clock = fakeClock();
  const fn = attempts(clock, [false]);
  const r = await waitForPlusReflected(fn, opts(clock));
  expect(r).toEqual({ reflected: false, attempts: MAX_WAIT / INTERVAL });
  expect(fn).toHaveBeenCalledTimes(MAX_WAIT / INTERVAL);
  expect(clock.now()).toBeLessThanOrEqual(MAX_WAIT);
});

it('각 시도에 시간 제한 5초를 넘긴다', async () => {
  const clock = fakeClock();
  const fn = attempts(clock, [false, true]);
  await waitForPlusReflected(fn, opts(clock));
  expect(fn.mock.calls.map((c) => c[0])).toEqual([ATTEMPT_TIMEOUT, ATTEMPT_TIMEOUT]);
});

it('시도가 시간 제한까지 걸리면 기다림 없이 다음 시도, 마지막 시도는 남은 시간으로 잘린다 — 전체 ≤ 30초', async () => {
  const clock = fakeClock();
  const fn = attempts(clock, ['throw'], 'timeout');
  const r = await waitForPlusReflected(fn, opts(clock));
  expect(r.reflected).toBe(false);
  // 0·5·10·15·20·25초 시작 → 6회, 마지막은 남은 5초
  expect(fn.mock.calls.map((c) => c[0])).toEqual([5_000, 5_000, 5_000, 5_000, 5_000, 5_000]);
  expect(clock.now()).toBe(MAX_WAIT);
});

it('마감 직전 시작한 시도의 시간 제한은 남은 시간', async () => {
  const clock = fakeClock();
  // 시도 1회가 4.5초 → 0·4.5·9·…·27초 시작, 마지막 27초 시도의 제한은 3초
  const fn = attempts(clock, ['throw'], 4_500);
  await waitForPlusReflected(fn, opts(clock));
  const timeouts = fn.mock.calls.map((c) => c[0]);
  expect(timeouts[timeouts.length - 1]).toBe(3_000);
  expect(timeouts.slice(0, -1).every((t) => t === ATTEMPT_TIMEOUT)).toBe(true);
});

it('시도 중 throw(시간 초과·네트워크)는 미반영으로 세고 계속한다', async () => {
  const clock = fakeClock();
  const fn = attempts(clock, ['throw', 'throw', true]);
  const r = await waitForPlusReflected(fn, opts(clock));
  expect(r).toEqual({ reflected: true, attempts: 3 });
});

it('maxWait 0 이면 시도하지 않는다', async () => {
  const clock = fakeClock();
  const fn = attempts(clock, [true]);
  const r = await waitForPlusReflected(fn, { ...opts(clock), maxWaitMs: 0 });
  expect(r).toEqual({ reflected: false, attempts: 0 });
  expect(fn).not.toHaveBeenCalled();
});

describe('shouldContinue — 주기 재확인 중단(D5-b-4)', () => {
  it('처음부터 false 면 시도하지 않는다', async () => {
    const clock = fakeClock();
    const fn = attempts(clock, [true]);
    const r = await waitForPlusReflected(fn, { ...opts(clock), shouldContinue: () => false });
    expect(r).toEqual({ reflected: false, attempts: 0 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('도중에 false 가 되면 다음 시도 전에 멈춘다', async () => {
    const clock = fakeClock();
    const fn = attempts(clock, [false]);
    let allowed = 3;
    const r = await waitForPlusReflected(fn, { ...opts(clock), shouldContinue: () => allowed-- > 0 });
    expect(r).toEqual({ reflected: false, attempts: 3 });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('반복마다 확인한다 — 5초 간격·2분이면 계속 true 일 때 24회', async () => {
    const clock = fakeClock();
    const fn = attempts(clock, [false]);
    const keep = jest.fn(() => true);
    const r = await waitForPlusReflected(fn, {
      intervalMs: 5_000,
      maxWaitMs: 120_000,
      attemptTimeoutMs: ATTEMPT_TIMEOUT,
      shouldContinue: keep,
      now: clock.now,
      sleep: clock.sleep,
    });
    expect(r.attempts).toBe(24);
    expect(keep).toHaveBeenCalledTimes(24);
    expect(clock.now()).toBeLessThanOrEqual(120_000);
  });
});
