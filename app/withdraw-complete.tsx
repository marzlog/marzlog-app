import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';
import { useAuthStore } from '@/src/store/authStore';
import { useAppLockStore } from '@/src/store/appLockStore';
import { secureStorage, SECURE_KEYS } from '@/src/utils/secureStorage';

const APPLE_HELP_URL_KO = 'https://support.apple.com/ko-kr/HT210426';
const APPLE_HELP_URL_EN = 'https://support.apple.com/HT210426';

export default function WithdrawCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslation();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const handleStart = async () => {
    // Ensure all auth state is cleared (defensive — deleteAccount should have done this)
    useAuthStore.getState().forceLogout();

    // Clear app lock / PIN data
    await secureStorage.removeItem(SECURE_KEYS.PIN_HASH);
    await secureStorage.removeItem(SECURE_KEYS.APP_LOCK_ENABLED);
    useAppLockStore.getState().unlock();

    router.replace('/login');
  };

  const handleOpenAppleGuide = () => {
    const url = language?.startsWith('ko') ? APPLE_HELP_URL_KO : APPLE_HELP_URL_EN;
    WebBrowser.openBrowserAsync(url).catch(() => {
      // swallow — non-critical informational link
    });
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.content}>
        <Logo size={64} showText={false} color={isDark ? '#F9FAFB' : '#1F2937'} />
        <Text style={[styles.title, isDark && styles.textLight]}>{t('account.withdrawCompleteTitle')}</Text>
        <Text style={[styles.description, isDark && styles.descriptionDark]}>{t('account.withdrawCompleteDesc')}</Text>

        <View style={styles.infoBlock}>
          <Text style={[styles.infoTitle, isDark && styles.infoTitleDark]}>
            {t('account.withdrawCompletePhotoNoticeTitle')}
          </Text>
          <Text style={[styles.infoBody, isDark && styles.infoBodyDark]}>
            {t('account.withdrawCompletePhotoNoticeBody')}
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={[styles.infoTitle, isDark && styles.infoTitleDark]}>
            {t('account.withdrawCompleteAppleTitle')}
          </Text>
          <Text style={[styles.infoBody, isDark && styles.infoBodyDark]}>
            {t('account.withdrawCompleteAppleBody')}
          </Text>
          <TouchableOpacity
            style={styles.appleLinkButton}
            onPress={handleOpenAppleGuide}
            activeOpacity={0.7}
          >
            <Text style={[styles.appleLinkText, isDark && styles.appleLinkTextDark]}>
              {t('account.withdrawCompleteAppleLinkLabel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStart}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>{t('account.startService')}</Text>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  textLight: {
    color: '#F9FAFB',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
  },
  descriptionDark: {
    color: '#9CA3AF',
  },
  infoBlock: {
    alignSelf: 'stretch',
    marginTop: 8,
    gap: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoTitleDark: {
    color: '#F3F4F6',
  },
  infoBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6B7280',
  },
  infoBodyDark: {
    color: '#9CA3AF',
  },
  appleLinkButton: {
    marginTop: 4,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  appleLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FA5252',
    textDecorationLine: 'underline',
  },
  appleLinkTextDark: {
    color: '#FF7B7B',
  },
  bottomBar: {
    paddingHorizontal: 24,
  },
  startButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
