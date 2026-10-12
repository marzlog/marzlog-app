/**
 * 결제 완료 후 서버 반영(/auth/me plan === 'plus') 확인 반복 — PAYWALL 명세 §3.1 구매 흐름 4.
 *
 * 전체 대기는 count × intervalMs 근처에서 끝난다:
 *  - 각 시도는 intervalMs 를 시간 제한으로 쓴다(호출부가 refreshUser(intervalMs) 로 넘긴다).
 *  - 다음 시도까지는 max(0, intervalMs − 이번 시도 소요 시간)만 기다린다.
 *  - 반영되면 즉시 끝. 시도 중 throw(시간 초과·네트워크)는 "아직 미반영"으로 센다.
 * 시계·대기는 주입받는다(테스트에서 가짜 시계 사용).
 */

export interface ReflectOptions {
  count: number;
  intervalMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface ReflectResult {
  reflected: boolean;
  attempts: number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function waitForPlusReflected(
  isReflected: () => Promise<boolean>,
  { count, intervalMs, now = Date.now, sleep = defaultSleep }: ReflectOptions,
): Promise<ReflectResult> {
  for (let attempt = 1; attempt <= count; attempt++) {
    const startedAt = now();
    let reflected = false;
    try {
      reflected = await isReflected();
    } catch {
      reflected = false;
    }
    if (reflected) return { reflected: true, attempts: attempt };
    if (attempt < count) {
      const wait = intervalMs - (now() - startedAt);
      if (wait > 0) await sleep(wait);
    }
  }
  return { reflected: false, attempts: count };
}
