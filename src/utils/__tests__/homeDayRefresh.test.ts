import { nextDaySnapshot } from '../selectedDate';

// 날짜 탭 열람 중(dayItems !== null)에는 폴링·포커스 refetch 가 allItems 만 갱신해
// dayItems 스냅샷이 분석 완료·편집 결과를 반영하지 못했다(10차 recon 3).
// refetch 후 같은 날짜로 재조회한 결과로 스냅샷을 갈아끼운다.

describe('nextDaySnapshot', () => {
  it('refetch 후 살아 있는 같은 날짜 스냅샷을 최신 항목으로 갱신한다 — 사라졌거나 날짜가 바뀌었으면 건드리지 않는다', () => {
    type Card = { id: string; title: string | null };
    const stale: Card[] = [{ id: 'c1', title: null }];
    const fresh: Card[] = [{ id: 'c1', title: '분석 완료 제목' }];

    expect(nextDaySnapshot(stale, '2026-09-14', '2026-09-14', fresh)).toBe(fresh);
    // 재조회 도중 리셋으로 비워졌으면 되살리지 않는다
    expect(nextDaySnapshot(null, null, '2026-09-14', fresh)).toBeNull();
    // 재조회 도중 다른 날짜를 골랐으면 그 날짜 스냅샷을 유지한다
    expect(nextDaySnapshot(stale, '2026-09-13', '2026-09-14', fresh)).toBe(stale);
  });
});
