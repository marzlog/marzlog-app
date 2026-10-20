/**
 * 시간 제한 — 순수 함수 (RN/SDK 비의존, 단위 테스트 대상). B-PAYWALL-HANG 에서 결제 경로 공용으로 분리.
 *
 * ms 안에 끝나지 않으면 TimeoutError 로 거부한다. 원래 작업은 취소하지 않는다(SDK 호출은 취소 수단이 없다) —
 * 늦게 끝난 결과는 버려진다. 호출부는 isTimeoutError 로 시간 초과를 다른 오류와 구분해 기록한다.
 */
export class TimeoutError extends Error {
  readonly label: string;

  constructor(label: string) {
    super(`${label}_TIMEOUT`);
    this.name = 'TimeoutError';
    this.label = label;
  }
}

export function isTimeoutError(e: unknown): e is TimeoutError {
  return e instanceof TimeoutError;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
