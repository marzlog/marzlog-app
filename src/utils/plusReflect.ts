/**
 * 결제·복원 후 서버 반영(/auth/me plan === 'plus') 확인 반복 — PAYWALL 명세 §3.1 구매 흐름 4.
 *
 * 마감 시각 기준(D5-b): 시작 시각 + maxWaitMs 안에서만 시도한다.
 *  - 시도는 intervalMs 마다 시작한다. 시도가 더 빨리 끝나면 다음 시작까지 기다리고, 늦게 끝나면 바로 다음 시도.
 *  - 각 시도에는 시간 제한 min(attemptTimeoutMs, 마감까지 남은 시간)을 넘긴다(호출부가 refreshUser(timeoutMs) 로 쓴다).
 *  - 다음 시작 시각이 마감에 닿으면 더 시도하지 않는다 → 전체 대기 ≤ maxWaitMs.
 *  - 반영되면 즉시 끝. 시도 중 throw(시간 초과·네트워크)는 "아직 미반영"으로 센다.
 * 시계·대기는 주입받는다(테스트에서 가짜 시계 사용).
 */

export interface ReflectOptions {
  intervalMs: number;
  maxWaitMs: number;
  attemptTimeoutMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface ReflectResult {
  reflected: boolean;
  attempts: number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function waitForPlusReflected(
  isReflected: (timeoutMs: number) => Promise<boolean>,
  { intervalMs, maxWaitMs, attemptTimeoutMs, now = Date.now, sleep = defaultSleep }: ReflectOptions,
): Promise<ReflectResult> {
  const deadline = now() + maxWaitMs;
  let attempts = 0;
  for (;;) {
    const startedAt = now();
    const remaining = deadline - startedAt;
    if (remaining <= 0) break;
    attempts += 1;
    let reflected = false;
    try {
      reflected = await isReflected(Math.min(attemptTimeoutMs, remaining));
    } catch {
      reflected = false;
    }
    if (reflected) return { reflected: true, attempts };
    const nextAt = startedAt + intervalMs;
    if (nextAt >= deadline) break;
    const wait = nextAt - now();
    if (wait > 0) await sleep(wait);
  }
  return { reflected: false, attempts };
}
