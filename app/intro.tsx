import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import { router } from 'expo-router';
import { useTranslation } from '@src/hooks/useTranslation';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INTRO_SEEN_KEY = 'marzlog_intro_seen';

export default function IntroScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const bgColor = isDark ? '#111827' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subtextColor = isDark ? '#9CA3AF' : '#6B7280';

  const markSeen = async () => {
    try {
      await AsyncStorage.setItem(INTRO_SEEN_KEY, 'true');
    } catch {}
  };

  const handleSkip = async () => {
    await markSeen();
    router.replace('/login');
  };

  const handleAllow = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        // Notifications enabled
      }
    } catch {
      // Notification request failed
    }
    await markSeen();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.content}>
        {/* Logo Area */}
        <View style={styles.logoArea}>
          <Image
            source={require('@/assets/images/mascot.png')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
          <Image
            source={require('@/assets/images/marzlog-text-logo.png')}
            style={[styles.textLogo, { tintColor: isDark ? '#FFFFFF' : '#252525' }]}
            resizeMode="contain"
          />
          <Text style={[styles.slogan, { color: subtextColor }]}>
            {t('intro.slogan')}
          </Text>
        </View>

        {/* Notification Section */}
        <View style={styles.notificationArea}>
          <Text style={[styles.notificationTitle, { color: textColor }]}>
            {t('intro.notificationTitle')}
          </Text>
          <Text style={[styles.notificationDesc, { color: subtextColor }]}>
            {t('intro.notificationDesc')}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonArea}>
          <TouchableOpacity
            style={styles.allowButton}
            onPress={handleAllow}
            activeOpacity={0.8}
          >
            <Text style={styles.allowButtonText}>{t('intro.allowNotification')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text style={[styles.skipButtonText, { color: subtextColor }]}>
              {t('intro.skipNotification')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  mascotImage: {
    width: 120,
    height: 120,
    borderRadius: 30,
    marginBottom: 20,
  },
  textLogo: {
    width: 180,
    height: 45,
    marginBottom: 12,
  },
  slogan: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  notificationArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  notificationDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonArea: {
    width: '100%',
    gap: 12,
  },
  allowButton: {
    backgroundColor: '#FF6A5F',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 50,
  },
  allowButtonText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 50,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
