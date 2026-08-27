import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/src/i18n';

/** 선택지 렌더 정본. 언어 추가 시 여기 1행만 더하면 카드가 늘어난다. */
const LANGUAGE_OPTIONS: ReadonlyArray<{ code: SupportedLocale; labelKey: string }> = [
  { code: 'ko', labelKey: 'language.korean' },
  { code: 'en', labelKey: 'language.english' },
  { code: 'vi', labelKey: 'language.vietnamese' },
  { code: 'th', labelKey: 'language.thai' },
];

// SUPPORTED_LOCALES 에 언어가 늘었는데 위 배열을 안 고치면 개발 중에 바로 드러난다.
if (__DEV__ && LANGUAGE_OPTIONS.length !== SUPPORTED_LOCALES.length) {
  console.warn(
    `[language-select] LANGUAGE_OPTIONS(${LANGUAGE_OPTIONS.length}) != SUPPORTED_LOCALES(${SUPPORTED_LOCALES.length})`
  );
}

export default function LanguageSelectScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t, language, changeLanguage } = useTranslation();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<SupportedLocale>(language);

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const handleConfirm = async () => {
    // from=login: app_lang NULL 게이트 경유 → 선택값 반드시 서버 반영 후 tabs로
    if (from === 'login') {
      await changeLanguage(selected);   // selected===language여도 app_lang push 보장
      router.replace('/(tabs)');
      return;
    }
    if (selected !== language) {
      await changeLanguage(selected);
    }
    router.back();
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Logo size={28} showText={false} color={isDark ? '#F9FAFB' : '#1F2937'} />
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>{t('language.title')}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        {LANGUAGE_OPTIONS.map(({ code, labelKey }) => {
          const isSelected = selected === code;
          return (
            <TouchableOpacity
              key={code}
              style={[
                styles.langCard,
                isSelected && styles.langCardSelected,
                isDark && !isSelected && styles.langCardDark,
              ]}
              onPress={() => setSelected(code)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.langText,
                  isDark && !isSelected && styles.langTextDark,
                  isSelected && styles.langTextSelected,
                ]}
              >
                {t(labelKey)}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Confirm button */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmText}>{t('language.confirm')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: '#1F2937',
  },
  textLight: {
    color: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  langCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  langCardDark: {
    backgroundColor: '#1F2937',
  },
  langCardSelected: {
    backgroundColor: '#2D3436',
  },
  langText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  langTextDark: {
    color: '#9CA3AF',
  },
  langTextSelected: {
    color: '#FFFFFF',
  },
  confirmButton: {
    backgroundColor: '#FA5252',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
