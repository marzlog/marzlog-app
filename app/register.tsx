import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import GoogleLoginButton from '@src/components/auth/GoogleLoginButton';
import { router } from 'expo-router';
import { useAuthStore } from '@src/store/authStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { authApi } from '@src/api/auth';
import { FloatingInput } from '@/src/components/common/FloatingInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { register } = useAuthStore();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'available' | 'taken' | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const passwordConfirmRef = useRef<TextInput>(null);

  const insets = useSafeAreaInsets();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const validateEmail = (emailValue: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailValue);
  };

  const handleCheckEmail = async () => {
    if (!email.trim()) {
      setErrors({ ...errors, email: t('auth.requiredField') });
      return;
    }
    if (!validateEmail(email.trim())) {
      setErrors({ ...errors, email: t('auth.invalidEmail') });
      return;
    }

    setEmailCheckLoading(true);
    try {
      const result = await authApi.checkEmail(email.trim());
      setEmailChecked(true);
      setEmailStatus(result.available ? 'available' : 'taken');
      if (!result.available) {
        setErrors({ ...errors, email: t('auth.emailTaken') });
      } else {
        const { email: _, ...rest } = errors;
        setErrors(rest);
      }
    } catch {
      setErrors({ ...errors, email: t('auth.emailCheckFailed') });
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = t('auth.requiredField');
    if (!email.trim()) newErrors.email = t('auth.requiredField');
    else if (!validateEmail(email.trim())) newErrors.email = t('auth.invalidEmail');
    if (!password) newErrors.password = t('auth.requiredField');
    else if (password.length < 6) newErrors.password = t('auth.passwordMinLength');
    if (!passwordConfirm) newErrors.passwordConfirm = t('auth.requiredField');
    else if (password !== passwordConfirm) newErrors.passwordConfirm = t('auth.passwordMismatch');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      setShowComplete(true);
    } catch (e: any) {
      const message = e.message || t('auth.registerFailed');
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = () => router.replace('/(tabs)');
  const handleGoogleError = (errorMessage: string) => {
    setErrors({ form: errorMessage });
  };

  // Registration complete screen
  if (showComplete) {
    return (
      <View style={[styles.completeScreen, isDark && styles.completeScreenDark, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.completeContainer}>
          <Image
            source={require('@/assets/images/mascot.png')}
            style={styles.completeMascot}
            resizeMode="contain"
          />
          <Image
            source={require('@/assets/images/marzlog-text-logo.png')}
            style={[styles.completeTextLogo, isDark && { tintColor: '#FFFFFF' }]}
            resizeMode="contain"
          />
          <Text style={[styles.completeWelcome, isDark && { color: '#F9FAFB' }]}>
            {t('auth.registerCompleteWelcome')}
          </Text>
          <Text style={[styles.completeBody, isDark && { color: '#9CA3AF' }]}>
            {t('auth.registerCompleteBody')}
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={async () => {
              await AsyncStorage.setItem('marzlog_intro_seen', 'true');
              router.replace('/(tabs)');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>{t('auth.startUsing')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        enableOnAndroid
        extraScrollHeight={20}
        keyboardDismissMode="on-drag"
      >
        {/* Title */}
        <Text style={[styles.title, isDark && { color: '#F9FAFB' }]}>
          {t('auth.registerTitle')}
        </Text>

        {/* Social Login */}
        <View style={styles.socialArea}>
          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            style={{ marginHorizontal: 16 }}
          />
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
          <Text style={[styles.dividerText, isDark && { color: '#6B7280' }]}>
            {t('common.or')}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
        </View>

        {/* Input Fields */}
        <View style={styles.inputArea}>
          {/* Name */}
          <FloatingInput
            label={t('auth.namePlaceholder')}
            value={name}
            onChangeText={(text) => { setName(text); setErrors({ ...errors, name: '' }); }}
            isDark={isDark}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            blurOnSubmit={false}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

          {/* Email + Check */}
          <View style={styles.emailRow}>
            <View style={styles.emailInput}>
              <FloatingInput
                label={t('auth.emailPlaceholder')}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailChecked(false);
                  setEmailStatus(null);
                  setErrors({ ...errors, email: '' });
                }}
                isDark={isDark}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                inputRef={emailRef}
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <TouchableOpacity
              style={[styles.checkButton, isDark && styles.checkButtonDark, emailCheckLoading && { opacity: 0.5 }]}
              onPress={handleCheckEmail}
              disabled={emailCheckLoading}
              activeOpacity={0.7}
            >
              {emailCheckLoading ? (
                <ActivityIndicator color={isDark ? '#F9FAFB' : '#374151'} size="small" />
              ) : (
                <Text style={[styles.checkButtonText, isDark && styles.checkButtonTextDark]}>
                  {t('auth.checkDuplicate')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          {errors.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
          ) : emailStatus === 'available' ? (
            <Text style={styles.successText}>{t('auth.emailAvailable')}</Text>
          ) : null}

          {/* Password */}
          <FloatingInput
            label={t('auth.passwordPlaceholder')}
            value={password}
            onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: '' }); }}
            isDark={isDark}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            returnKeyType="next"
            inputRef={passwordRef}
            onSubmitEditing={() => passwordConfirmRef.current?.focus()}
            blurOnSubmit={false}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={isDark ? '#6B7280' : '#9CA3AF'}
                />
              </TouchableOpacity>
            }
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

          {/* Password Confirm */}
          <FloatingInput
            label={t('auth.passwordConfirmPlaceholder')}
            value={passwordConfirm}
            onChangeText={(text) => { setPasswordConfirm(text); setErrors({ ...errors, passwordConfirm: '' }); }}
            isDark={isDark}
            secureTextEntry={!showPasswordConfirm}
            autoCapitalize="none"
            returnKeyType="done"
            inputRef={passwordConfirmRef}
            onSubmitEditing={handleRegister}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPasswordConfirm(!showPasswordConfirm)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={showPasswordConfirm ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={isDark ? '#6B7280' : '#9CA3AF'}
                />
              </TouchableOpacity>
            }
          />
          {errors.passwordConfirm ? <Text style={styles.errorText}>{errors.passwordConfirm}</Text> : null}
        </View>

        {/* Form Error */}
        {errors.form ? (
          <View style={[styles.formError, isDark && styles.formErrorDark]}>
            <Ionicons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.formErrorText}>{errors.form}</Text>
          </View>
        ) : null}

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.registerButton, isSubmitting && { opacity: 0.6 }]}
          onPress={handleRegister}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.registerButtonText}>{t('auth.register')}</Text>
          )}
        </TouchableOpacity>

        {/* Login link */}
        <View style={styles.linkRow}>
          <Text style={[styles.linkLabel, isDark && { color: '#9CA3AF' }]}>
            {t('auth.alreadyHaveAccount')}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.linkText}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 48,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: '300',
    color: '#1F2937',
    marginBottom: 20,
  },
  socialArea: {
    alignItems: 'stretch',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  inputArea: {
    marginBottom: 4,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  emailInput: {
    flex: 1,
  },
  checkButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkButtonDark: {
    borderColor: '#4B5563',
  },
  checkButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  checkButtonTextDark: {
    color: '#D1D5DB',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 4,
  },
  successText: {
    color: '#10B981',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 4,
  },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  formErrorDark: {
    backgroundColor: '#1C1917',
  },
  formErrorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  registerButton: {
    backgroundColor: '#FF6A5F',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  linkLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  linkText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
  },
  // Complete screen
  completeScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  completeScreenDark: {
    backgroundColor: '#111827',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  completeMascot: {
    width: 100,
    height: 100,
    borderRadius: 25,
    marginBottom: 24,
  },
  completeTextLogo: {
    width: 160,
    height: 40,
    marginBottom: 12,
  },
  completeWelcome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3A35',
    marginBottom: 12,
    textAlign: 'center',
  },
  completeBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#FF6A5F',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    width: '100%',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
