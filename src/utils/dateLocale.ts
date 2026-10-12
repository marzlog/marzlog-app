/**
 * 날짜 표시 로케일 — 앱 언어 → BCP-47 (timeline 에서 옮김, 결제 완료 화면과 공유).
 *
 * ★ 번역문 값(t('date.today'))으로 언어를 역추론하지 말 것: 번역이 바뀌면 조용히 깨진다.
 *   Record<SupportedLocale, …> 이므로 지원 언어를 늘리고 여기 등록을 빠뜨리면 tsc 가 실패한다.
 */
import type { SupportedLocale } from '../i18n';

export const DATE_LOCALES: Record<SupportedLocale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  vi: 'vi-VN',
  th: 'th-TH',
};

/** "2026년 11월 8일" / "November 8, 2026" 형태(timeline 날짜 헤더와 같은 형식). 잘못된 값은 null. */
export function formatLongDate(iso: string | null | undefined, language: SupportedLocale): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(DATE_LOCALES[language], { year: 'numeric', month: 'long', day: 'numeric' });
}
