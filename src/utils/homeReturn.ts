/**
 * 결제·완료·구독 화면에서 홈으로 돌아가는 방식 — 순수 함수 (B-HOME-DUPLICATE-ON-REPLACE).
 *
 * router.replace('/(tabs)') 는 현재 화면만 새 (tabs) 로 바꾸므로, 결제 화면을 열기 전부터 스택에 있던 (tabs) 위에
 * 탭이 하나 더 쌓여 홈이 2개 마운트됐다(2026-10-15, nginx 에서 /timeline 중복 로드로 확인 — 보이는 새 홈의 캘린더에
 * 감정이 늦게 나타남). 스택 아래에 (tabs) 가 있으면 거기까지 되돌리고(dismissTo), 없으면(딥링크로 바로 연 경우)
 * 교체한다.
 */
export const TABS_ROUTE_NAME = '(tabs)';

export type HomeReturn = 'dismiss-to-tabs' | 'replace-with-tabs';

/** stackRouteNames = 현재 화면이 속한 스택의 경로 이름(아래 → 위, 마지막이 현재 화면) */
export function resolveHomeReturn(stackRouteNames: readonly string[]): HomeReturn {
  return stackRouteNames.slice(0, -1).includes(TABS_ROUTE_NAME) ? 'dismiss-to-tabs' : 'replace-with-tabs';
}
