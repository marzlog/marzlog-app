import { DATE_LOCALES, formatLongDate } from '../dateLocale';

describe('formatLongDate', () => {
  it('언어별 로케일로 긴 날짜(연·월·일)', () => {
    const iso = '2026-11-08T03:12:00Z';
    for (const lang of ['ko', 'en', 'vi', 'th'] as const) {
      const expected = new Date(iso).toLocaleDateString(DATE_LOCALES[lang], { year: 'numeric', month: 'long', day: 'numeric' });
      expect(formatLongDate(iso, lang)).toBe(expected);
    }
  });

  it('값이 없거나 날짜가 아니면 null', () => {
    expect(formatLongDate(null, 'ko')).toBeNull();
    expect(formatLongDate(undefined, 'ko')).toBeNull();
    expect(formatLongDate('not-a-date', 'ko')).toBeNull();
  });
});
