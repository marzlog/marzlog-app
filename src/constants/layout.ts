/**
 * 레이아웃 상수 — 떠 있는(floating) 탭바 기하 (B-ANDROID-EDGE-INSET 14차 재수리)
 *
 * 탭바는 `app/(tabs)/_layout.tsx` 에서 **absolute + 좌우 여백**으로 떠 있다. 그래서 화면 하단
 * 콘텐츠는 `insets.bottom` 만으로는 부족하고 **탭바 높이까지** 비워야 가려지지 않는다
 * (JJ 제스처 내비 기기에서 버전 워터마크가 계속 가린 원인).
 *
 * 필요 여백 = TAB_BAR_HEIGHT + max(insets.bottom, TAB_BAR_MIN_BOTTOM) + TAB_BAR_CONTENT_GAP
 * — 3버튼 내비(insets.bottom 큼)·제스처 내비(작음) 양쪽에서 성립한다.
 * ★이 값들은 탭바와 화면이 **같은 상수를 공유**해야 한다 — 한쪽에 하드코딩하면 다시 어긋난다.
 */

/** 탭바 자체 높이 (`_layout` styles.tabBar / styles.tabBarContainer 와 공유) */
export const TAB_BAR_HEIGHT = 64;
/** 탭바를 화면 하단에서 최소한 이만큼 띄운다 (insets.bottom 이 더 크면 그 값) */
export const TAB_BAR_MIN_BOTTOM = 16;
/** 탭바 좌우 여백 */
export const TAB_BAR_SIDE_GAP = 16;
/** 탭바와 그 위 콘텐츠 사이 숨 */
export const TAB_BAR_CONTENT_GAP = 12;

/** 떠 있는 탭바를 피하는 하단 여백 — 탭 화면의 스크롤·절대배치 콘텐츠가 공유한다. */
export function tabBarClearance(bottomInset: number): number {
  return TAB_BAR_HEIGHT + Math.max(bottomInset, TAB_BAR_MIN_BOTTOM) + TAB_BAR_CONTENT_GAP;
}
