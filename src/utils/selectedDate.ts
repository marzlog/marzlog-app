/**
 * 홈 선택 날짜 판정 (순수 함수).
 *
 * 선택 날짜는 zustand 메모리 스토어에 살고 persist 되지 않지만, 앱 프로세스가 살아 있으면
 * 자정을 넘겨도 그대로 남는다. 어제 연 앱을 리마인더로 다시 열면 홈이 "어제"를 보여주고
 * 새 항목은 오늘 버킷에 들어가 목록에서 사라져 보였다(2026-09-14 recon A, H2).
 */

/** 로컬 날짜 키(YYYY-MM-DD). toISOString() 은 UTC 라 KST 00~09시에 하루 어긋난다. */
export const toLocalDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * 선택 날짜를 오늘로 되돌려야 하는가.
 *
 * @param selected 현재 선택 날짜
 * @param now 현재 시각
 * @param selectedByUserOn 사용자가 날짜를 명시 선택한 날의 로컬 키(없으면 null)
 *   — 오늘 고른 선택만 보존한다. 어제 고른 선택은 자정을 넘기면 보존하지 않는다.
 */
/**
 * 홈 목록이 dayItems 스냅샷 경로를 타는가. handleDateSelect 가 /timeline/day 결과를 담으면
 * 그 스냅샷이 allItems(오늘 버킷 포함) 대신 렌더된다.
 */
export const isDayListPath = <T>(dayItems: T[] | null, dayLoading: boolean): boolean =>
  dayLoading || dayItems !== null;

/**
 * 리셋 결과를 홈 상태에 적용한다. 리셋되면 날짜와 함께 dayItems 스냅샷도 비워야
 * 목록이 오늘 버킷으로 돌아온다 — 날짜만 바꾸면 헤더=오늘 / 목록=이전 날짜로 갇힌다.
 *
 * @param resetDate resetToTodayIfStale 의 반환값(리셋 안 됐으면 null)
 */
export const applyDateReset = <T>(
  resetDate: Date | null,
  current: { selectedDate: Date; dayItems: T[] | null },
): { selectedDate: Date; dayItems: T[] | null } =>
  resetDate ? { selectedDate: resetDate, dayItems: null } : current;

export const shouldResetSelectedDate = (
  selected: Date,
  now: Date,
  selectedByUserOn: string | null,
): boolean => {
  const todayKey = toLocalDateKey(now);
  if (toLocalDateKey(selected) === todayKey) return false;
  return selectedByUserOn !== todayKey;
};
