/**
 * waitForPlusReflected 단위 테스트 (PAYWALL 명세 §3.1 구매 흐름 4)
 *
 * 가짜 시계: now() 는 누적 시각, sleep 은 시각만 앞으로 민다. 시도 1회의 소요 시간은 cost 로 흉내.
 */
import { waitForPlusReflected } from '../plusReflect';

const COUNT = 5;
const INTERVAL = 2_000;

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

function attempts(clock: ReturnType<typeof fakeClock>, outcomes: Array<boolean | 'throw'>, cost = 300) {
  let i = 0;
  const fn = jest.fn(async () => {
    clock.advance(cost);
    const o = outcomes[Math.min(i, outcomes.length - 1)];
    i += 1;
    if (o === 'throw') throw new Error('timeout of 2000ms exceeded');
    return o;
  });
  return fn;
}

it('1회째 반영 → 바로 끝(대기 없음)', async () => {
  const clock = fakeClock();
  const fn = attempts(clock, [true]);
  const r = await waitForPlusReflected(fn, { count: COUNT, intervalMs: INTERVAL, now: clock.now, sleep: clock.sleep });
  expect(r).toEqual({ reflected: true, attempts: 1 });
  expect(fn).toHaveBeenCalledTimes(1);
  expect(clock.now()).toBe(300);
});

it('3회째 반영 → 3번 시도, 시도 간격은 interval 단위', async () => {
  const clock = fakeClock();
  const fn = attempts(clock, [false, false, true]);
  const r = await waitForPlusReflected(fn, { count: COUNT, intervalMs: INTERVAL, now: clock.now, sleep: clock.sleep });
  expect(r).toEqual({ reflected: true, attempts: 3 });
  expect(clock.now()).toBe(2 * INTERVAL + 300);
});

it('끝까지 미반영 → count 회 시도, 전체 대기 ≤ count × interval', async () => {
  const clock = fakeClock();
  const fn = attempts(clock, [false]);
  const r = await waitForPlusReflected(fn, { count: COUNT, intervalMs: INTERVAL, now: clock.now, sleep: clock.sleep });
  expect(r).toEqual({ reflected: false, attempts: COUNT });
  expect(fn).toHaveBeenCalledTimes(COUNT);
  expect(clock.now()).toBeLessThanOrEqual(COUNT * INTERVAL);
});

it('시도가 interval 만큼 걸리면(호출별 시간 제한 도달) 추가 대기 없이 다음 시도 — 전체 ≈ count × interval', async () => {
  const clock = fakeClock();
  const fn = attempts(clock, ['throw'], INTERVAL);
  const r = await waitForPlusReflected(fn, { count: COUNT, intervalMs: INTERVAL, now: clock.now, sleep: clock.sleep });
  expect(r.reflected).toBe(false);
  expect(clock.now()).toBe(COUNT * INTERVAL);
});

it('시도 중 throw(시간 초과·네트워크)는 미반영으로 세고 계속한다', async () => {
  const clock = fakeClock();
  const fn = attempts(clock, ['throw', 'throw', true]);
  const r = await waitForPlusReflected(fn, { count: COUNT, intervalMs: INTERVAL, now: clock.now, sleep: clock.sleep });
  expect(r).toEqual({ reflected: true, attempts: 3 });
});
