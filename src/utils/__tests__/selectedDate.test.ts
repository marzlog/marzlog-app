import { shouldResetSelectedDate, toLocalDateKey } from '../selectedDate';

// 홈 selectedDate 가 앱 프로세스에 남아 날짜가 넘어가도 "어제"를 보여주던 결함(2026-09-14 recon A, H2).
// 사용자가 **오늘 명시적으로 고른 날짜**만 보존하고, 그 외 오늘이 아닌 값은 오늘로 되돌린다.

const now = new Date(2026, 8, 15, 9, 0); // 2026-09-15 09:00 로컬
const yesterday = new Date(2026, 8, 14, 21, 0);
const lastWeek = new Date(2026, 8, 8, 12, 0);

describe('toLocalDateKey', () => {
  it('로컬 날짜로 키를 만든다 — toISOString(UTC) 과 달리 KST 저녁에도 하루 밀리지 않는다', () => {
    expect(toLocalDateKey(new Date(2026, 8, 15, 23, 30))).toBe('2026-09-15');
    expect(toLocalDateKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
});

describe('shouldResetSelectedDate', () => {
  it('오늘이 아니고 명시 선택도 아니면 리셋한다(어제 잔존 = 증상)', () => {
    expect(shouldResetSelectedDate(yesterday, now, null)).toBe(true);
  });

  it('오늘 명시적으로 고른 과거 날짜는 보존한다', () => {
    expect(shouldResetSelectedDate(lastWeek, now, '2026-09-15')).toBe(false);
  });

  it('이미 오늘이면 리셋하지 않는다', () => {
    expect(shouldResetSelectedDate(new Date(2026, 8, 15, 0, 1), now, null)).toBe(false);
  });

  it('어제 명시 선택한 값은 자정을 넘기면 보존하지 않는다', () => {
    expect(shouldResetSelectedDate(lastWeek, now, '2026-09-14')).toBe(true);
  });
});
