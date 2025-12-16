/**
 * Login Screen
 *
 * OAuth login with Google and Apple
 */

import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { useAuthStore } from '@/store/authStore';
import { colors, spacing, textStyles, borderRadius } from '@/theme';

// Required for Google Sign In on web
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const handleGoogleLogin = async () => {
    try {
      clearError();
      // TODO: Implement actual Google Sign-In with expo-auth-session
      // For now, using mock data for testing
      await loginWithGoogle({ idToken: 'mock-google-id-token' });
      router.replace('/(main)/timeline');
    } catch (e) {
      console.error('Google login error:', e);
    }
  };

  const handleAppleLogin = async () => {
    // TODO: Implement Apple Sign-In
    console.log('Apple login - coming soon');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
      </View>

      {/* Logo Section */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🚀</Text>
        </View>
        <Text style={styles.title}>MarZlog</Text>
        <Text style={styles.subtitle}>AI로 더 스마트한 사진 관리</Text>
      </View>

      {/* Login Buttons */}
      <View style={styles.buttonSection}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Google Login */}
        <Pressable
          style={[styles.loginButton, styles.googleButton]}
          onPress={handleGoogleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text.primary} />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.loginButtonText}>Google로 로그인</Text>
            </>
          )}
        </Pressable>

        {/* Apple Login (iOS only or web) */}
        {(Platform.OS === 'ios' || Platform.OS === 'web') && (
          <Pressable
            style={[styles.loginButton, styles.appleButton]}
            onPress={handleAppleLogin}
            disabled={true} // Coming soon
          >
            <Text style={styles.appleIcon}></Text>
            <Text style={[styles.loginButtonText, styles.appleButtonText]}>
              Apple로 로그인 (준비 중)
            </Text>
          </Pressable>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          로그인 시{' '}
          <Text style={styles.footerLink}>이용약관</Text>
          {' '}및{' '}
          <Text style={styles.footerLink}>개인정보처리방침</Text>
          에 동의합니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.xl,
  },
  headerSection: {
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text.primary,
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoEmoji: {
    fontSize: 48,
  },
  title: {
    ...textStyles.displayMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...textStyles.bodyMedium,
    color: colors.text.secondary,
  },
  buttonSection: {
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  errorContainer: {
    backgroundColor: colors.semantic.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...textStyles.bodySmall,
    color: colors.semantic.error,
    textAlign: 'center',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  googleButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  appleButton: {
    backgroundColor: colors.neutral[900],
  },
  appleIcon: {
    fontSize: 20,
    color: colors.neutral[0],
  },
  loginButtonText: {
    ...textStyles.buttonMedium,
    color: colors.text.primary,
  },
  appleButtonText: {
    color: colors.neutral[0],
  },
  footer: {
    paddingBottom: spacing['2xl'],
    alignItems: 'center',
  },
  footerText: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLink: {
    color: colors.text.link,
    textDecorationLine: 'underline',
  },
});
