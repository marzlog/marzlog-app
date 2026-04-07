import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';

export default function LanguageSelectScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t, language, changeLanguage } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<'ko' | 'en'>(language);

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const handleConfirm = () => {
    if (selected !== language) {
      changeLanguage(selected);
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
        {/* Korean */}
        <TouchableOpacity
          style={[
            styles.langCard,
            selected === 'ko' && styles.langCardSelected,
            isDark && selected !== 'ko' && styles.langCardDark,
          ]}
          onPress={() => setSelected('ko')}
          activeOpacity={0.7}
        >
          <Text style={[styles.langText, isDark && selected !== 'ko' && styles.langTextDark, selected === 'ko' && styles.langTextSelected]}>
            {t('language.korean')}
          </Text>
          {selected === 'ko' && (
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        {/* English */}
        <TouchableOpacity
          style={[
            styles.langCard,
            selected === 'en' && styles.langCardSelected,
            isDark && selected !== 'en' && styles.langCardDark,
          ]}
          onPress={() => setSelected('en')}
          activeOpacity={0.7}
        >
          <Text style={[styles.langText, isDark && selected !== 'en' && styles.langTextDark, selected === 'en' && styles.langTextSelected]}>
            {t('language.english')}
          </Text>
          {selected === 'en' && (
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>

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
