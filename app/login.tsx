import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import GoogleLoginButton from '@src/components/auth/GoogleLoginButton';
import { router } from 'expo-router';
import { useAuthStore } from '@src/store/authStore';
import { useTranslation } from '@src/hooks/useTranslation';

export default function LoginScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { setError, error } = useAuthStore();
  const { t } = useTranslation();

  // 다크모드 결정
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const handleSuccess = () => {
    router.replace('/(tabs)/home');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot / Logo Image */}
        <View style={styles.logoArea}>
          <Image
            source={require('@/assets/images/mascot.png')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </View>

        {/* App Name (Text Logo) + Slogan */}
        <View style={styles.titleArea}>
          <Image
            source={require('@/assets/images/marzlog-text-logo.png')}
            style={[styles.textLogo, { tintColor: isDark ? '#FFFFFF' : '#252525' }]}
            resizeMode="contain"
          />
          <Text style={[styles.slogan, isDark && styles.sloganDark]}>
            {t('login.slogan')}
          </Text>
        </View>

        {/* Login Buttons */}
        <View style={styles.buttonArea}>
          <GoogleLoginButton
            onSuccess={handleSuccess}
            onError={handleError}
          />

          {/* Apple Login Button */}
          <TouchableOpacity
            style={[styles.appleButton, styles.appleButtonDisabled]}
            activeOpacity={0.8}
            disabled={true}
          >
            <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
            <Text style={styles.appleButtonText}>
              {t('auth.continueWithApple')}
            </Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>{t('common.comingSoon')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Terms Agreement */}
        <View style={styles.termsArea}>
          <Text style={[styles.termsText, isDark && styles.termsTextDark]}>
            {t('login.termsAgreement')}
          </Text>
          <View style={styles.termsLinks}>
            <TouchableOpacity>
              <Text style={styles.termsLink}>{t('support.terms')}</Text>
            </TouchableOpacity>
            <Text style={[styles.termsDivider, isDark && styles.termsTextDark]}>|</Text>
            <TouchableOpacity>
              <Text style={styles.termsLink}>{t('support.privacy')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 20,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mascotImage: {
    width: 120,
    height: 120,
    borderRadius: 30,
  },
  titleArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  textLogo: {
    width: 180,
    height: 45,
  },
  slogan: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  sloganDark: {
    color: '#9CA3AF',
  },
  buttonArea: {
    gap: 12,
    marginBottom: 24,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 52,
    gap: 12,
  },
  appleButtonDisabled: {
    opacity: 0.5,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 4,
  },
  comingSoonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  termsArea: {
    alignItems: 'center',
    marginTop: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsTextDark: {
    color: '#6B7280',
  },
  termsLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  termsLink: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  termsDivider: {
    fontSize: 12,
    color: '#D1D5DB',
  },
});
