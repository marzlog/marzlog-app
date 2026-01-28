import React, { useState } from 'react';
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
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
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
  const { setError, error, loginWithEmail } = useAuthStore();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const handleSuccess = () => {
    router.replace('/(tabs)');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('auth.requiredField'));
      return;
    }
    setIsSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      // error is set by the store
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBg = isDark ? '#1F2937' : '#F3F4F6';
  const inputText = isDark ? '#F9FAFB' : '#111827';
  const inputBorder = isDark ? '#374151' : '#E5E7EB';
  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

          {/* Email Input */}
          <View style={styles.inputArea}>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <Ionicons name="mail-outline" size={20} color={placeholderColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: inputText }]}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={placeholderColor}
                value={email}
                onChangeText={(text) => { setEmail(text); setError(null); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <Ionicons name="lock-closed-outline" size={20} color={placeholderColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: inputText, flex: 1 }]}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={placeholderColor}
                value={password}
                onChangeText={(text) => { setPassword(text); setError(null); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={placeholderColor}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
            onPress={handleEmailLogin}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
            )}
          </TouchableOpacity>

          {/* Register / Forgot Password Links */}
          <View style={styles.linkRow}>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.linkText}>{t('auth.register')}</Text>
            </TouchableOpacity>
            <View style={[styles.linkDivider, { backgroundColor: isDark ? '#4B5563' : '#D1D5DB' }]} />
            <TouchableOpacity onPress={() => router.push('/forgot-password')}>
              <Text style={styles.linkText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
            <Text style={[styles.dividerText, isDark && { color: '#6B7280' }]}>{t('common.or')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialArea}>
            <GoogleLoginButton
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </View>

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
      </KeyboardAvoidingView>
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
    marginBottom: 16,
  },
  mascotImage: {
    width: 100,
    height: 100,
    borderRadius: 25,
  },
  titleArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  textLogo: {
    width: 160,
    height: 40,
  },
  slogan: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  sloganDark: {
    color: '#9CA3AF',
  },
  inputArea: {
    gap: 12,
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
  eyeIcon: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  loginButton: {
    backgroundColor: '#F97066',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 50,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  linkDivider: {
    width: 1,
    height: 14,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  socialArea: {
    gap: 12,
    marginBottom: 20,
  },
  termsArea: {
    alignItems: 'center',
    marginTop: 8,
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
