import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

import ko from './locales/ko.json';
import en from './locales/en.json';
import vi from './locales/vi.json';

// 지원 언어 단일 진실 — 판정과 타입 모두 이 배열에서 파생
export const SUPPORTED_LOCALES = ['ko', 'en', 'vi'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// 미지원 시스템 로케일이 들어왔을 때의 폴백
const FALLBACK_LOCALE: SupportedLocale = 'en';

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

// i18n 인스턴스 생성
const i18n = new I18n({
  ko,
  en,
  vi,
});

// 기본 설정
i18n.defaultLocale = 'ko';
i18n.enableFallback = true;

// 시스템 언어 감지 및 설정 (지원 목록에 있으면 그대로, 없으면 en)
const systemLocale = Localization.getLocales()[0]?.languageCode;
i18n.locale = isSupportedLocale(systemLocale) ? systemLocale : FALLBACK_LOCALE;

// 언어 변경 함수
export function setLanguage(lang: SupportedLocale) {
  i18n.locale = lang;
}

// 현재 언어 가져오기
export function getLanguage(): SupportedLocale {
  return i18n.locale as SupportedLocale;
}

// 번역 함수
export function t(key: string, options?: object): string {
  return i18n.t(key, options);
}

export default i18n;
