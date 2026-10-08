/**
 * 부트(콜드스타트) 상수 (B-HOME-PREMOUNT).
 */

/**
 * 스플래시 안전장치 — 판정된 첫 화면에 도착하지 못해도 이 시간이 지나면 스플래시를 내린다
 * (스플래시에 갇히는 것 방지). 판정·replace 는 보통 수십 ms 안에 끝나므로 2초면 정상 경로를
 * 건드리지 않는다. 시간 초과로 내린 경우 Sentry warning(boot-splash-timeout)으로 감시한다.
 */
export const BOOT_SPLASH_MAX_WAIT_MS = 2_000;
