import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

import ko from './locales/ko.json';
import en from './locales/en.json';

// i18n 인스턴스 생성
const i18n = new I18n({
  ko,
  en,
});

// 기본 설정
i18n.defaultLocale = 'ko';
i18n.enableFallback = true;

// 시스템 언어 감지 및 설정
const systemLocale = Localization.getLocales()[0]?.languageCode || 'ko';
i18n.locale = systemLocale === 'ko' ? 'ko' : 'en';

// 언어 변경 함수
export function setLanguage(lang: 'ko' | 'en') {
  i18n.locale = lang;
}

// 현재 언어 가져오기
export function getLanguage(): 'ko' | 'en' {
  return i18n.locale as 'ko' | 'en';
}

// 번역 함수
export function t(key: string, options?: object): string {
  return i18n.t(key, options);
}

export default i18n;
