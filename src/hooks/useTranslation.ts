import { useCallback } from 'react';
import i18n, { setLanguage as setI18nLanguage } from '../i18n';
import { useSettingsStore } from '../store/settingsStore';

/**
 * 다국어 지원 훅
 * settingsStore의 language 설정과 i18n을 연동
 */
export function useTranslation() {
  const { language, setLanguage: setStoreLanguage } = useSettingsStore();

  // settingsStore의 언어로 i18n 동기화
  if (i18n.locale !== language) {
    setI18nLanguage(language);
  }

  // 번역 함수 - 매번 새로 생성하여 최신 locale 사용
  const t = (key: string, options?: object): string => {
    const result = i18n.t(key, options);
    return result;
  };

  // 언어 변경 함수 (settingsStore와 i18n 모두 업데이트)
  const changeLanguage = useCallback(async (lang: 'ko' | 'en') => {
    setI18nLanguage(lang);
    await setStoreLanguage(lang);
  }, [setStoreLanguage]);

  return {
    t,
    language,
    changeLanguage,
  };
}

export default useTranslation;
