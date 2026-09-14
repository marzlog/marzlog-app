import { applyDateReset, isDayListPath, toLocalDateKey } from '../selectedDate';

// 7차 리셋은 헤더 날짜만 오늘로 바꾸고, handleDateSelect 가 채운 dayItems 스냅샷은 남겼다.
// 화면은 `dayLoading || dayItems !== null` 이면 dayItems 경로를 타므로 헤더=오늘 / 목록=이전 날짜로
// 갇혔다(2026-09-15 JJ 실기). 리셋은 "헤더 날짜 + 목록 소스"를 한 동작으로 바꿔야 한다.

const now = new Date(2026, 8, 15, 9, 0);
const oldDay = new Date(2026, 8, 14, 21, 0);
const snapshot = [{ id: 'yesterday-card' }];

describe('applyDateReset', () => {
  it('리셋되면 날짜는 오늘, dayItems 스냅샷은 비워 오늘 버킷(allItems 경로)으로 돌아간다', () => {
    const next = applyDateReset(now, { selectedDate: oldDay, dayItems: snapshot });
    expect(toLocalDateKey(next.selectedDate)).toBe('2026-09-15');
    expect(next.dayItems).toBeNull();
    expect(isDayListPath(next.dayItems, false)).toBe(false);
  });

  it('리셋이 없으면(null) 날짜와 스냅샷을 그대로 둔다 — 오늘 명시 선택한 날짜의 목록 보존', () => {
    const current = { selectedDate: oldDay, dayItems: snapshot };
    const next = applyDateReset(null, current);
    expect(next.selectedDate).toBe(oldDay);
    expect(next.dayItems).toBe(snapshot);
    expect(isDayListPath(next.dayItems, false)).toBe(true);
  });
});

describe('isDayListPath', () => {
  it('로딩 중이거나 스냅샷이 있으면 dayItems 경로다', () => {
    expect(isDayListPath(null, true)).toBe(true);
    expect(isDayListPath([], false)).toBe(true);
    expect(isDayListPath(null, false)).toBe(false);
  });
});
