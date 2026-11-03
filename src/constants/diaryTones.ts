/**
 * 일기 문체(톤) 정본 (D10) — 백엔드 app/constants/diary_tones.py 와 같아야 한다.
 *
 * 저장 형식은 언어 중립 키: users.diary_tone(/auth/me·PATCH /auth/me/settings),
 * 재생성 요청 body 의 tone(POST /media/{id}/generate-diary), 상세 응답의 diary_tone.
 *  - sincere   담백·진솔 (기본, Free 사용 가능)
 *  - literary  문학적·감각적 (Plus)
 *  - plain     간결·꾸밈없음 (Plus)
 */
import type { SupportedLocale } from '../i18n';

export type DiaryTone = 'sincere' | 'literary' | 'plain';

export const DIARY_TONES: readonly DiaryTone[] = ['sincere', 'literary', 'plain'];
export const DEFAULT_DIARY_TONE: DiaryTone = 'sincere';

/** 문체 UI 를 보여 주는 앱 언어 — vi/th 는 프리셋 검수 전이라 UI 전부 숨김(기본 톤으로 재생성) */
export const TONE_UI_LANGS: readonly SupportedLocale[] = ['ko', 'en'];

export function isDiaryTone(value: unknown): value is DiaryTone {
  return typeof value === 'string' && (DIARY_TONES as readonly string[]).includes(value);
}

/** 허용값이면 그대로, 아니면(null·레거시·오염 값) 기본 톤 — 서버 resolve_tone 과 같다 */
export function resolveDiaryTone(value: unknown): DiaryTone {
  return isDiaryTone(value) ? value : DEFAULT_DIARY_TONE;
}

export function isToneUiEnabled(lang: SupportedLocale | null | undefined): boolean {
  return !!lang && TONE_UI_LANGS.includes(lang);
}

/** Free 가 고를 수 있는 문체인가 */
export function isFreeTone(tone: DiaryTone): boolean {
  return tone === DEFAULT_DIARY_TONE;
}
