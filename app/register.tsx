import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@src/store/authStore';
import { useTranslation } from '@src/hooks/useTranslation';
import {
  authApi,
  AccountAlreadyExistsError,
  AccountExistsDifferentProviderError,
  EmailRecentlyWithdrawnError,
  EmailRateLimitedError,
  resolveVerifyErrorI18nKey,
  type RegistrationTypedError,
} from '@src/api/auth';
import { CoolingOffModal } from '@src/components/auth/CoolingOffModal';
import { AccountConflictModal } from '@src/components/auth/AccountConflictModal';
import { recordConsentSafe } from '@src/api/consent';
import { FloatingInput } from '@/src/components/common/FloatingInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { register } = useAuthStore();
  const { t } = useTranslation();

  // PIPA 22조 동의 payload — terms-agreement에서 전달
  const params = useLocalSearchParams<{ age_14?: string; marketing?: string }>();
  const ageConfirmed = params.age_14 === '1';
  const marketingOptIn = params.marketing === '1';

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
  // B-CN A.4: 이메일 인증 step
  const [step, setStep] = useState<'form' | 'verify' | 'complete'>('form');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(600);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // B-CF: typed error modals
  const [coolingOffData, setCoolingOffData] = useState<{
    withdrawnAt: string;
    rejoinAvailableAt: string;
  } | null>(null);
  const [conflictData, setConflictData] = useState<{
    conflictCode: 'ACCOUNT_ALREADY_EXISTS' | 'ACCOUNT_EXISTS_DIFFERENT_PROVIDER';
    registeredProvider: string;
    emailMasked: string;
  } | null>(null);

  const handleTypedAuthError = (e: RegistrationTypedError): boolean => {
    if (e instanceof EmailRecentlyWithdrawnError) {
      setCoolingOffData({
        withdrawnAt: e.withdrawnAt,
        rejoinAvailableAt: e.rejoinAvailableAt,
      });
      return true;
    }
    if (e instanceof AccountAlreadyExistsError) {
      setConflictData({
        conflictCode: 'ACCOUNT_ALREADY_EXISTS',
        registeredProvider: e.registeredProvider,
        emailMasked: e.emailMasked,
      });
      return true;
    }
    if (e instanceof AccountExistsDifferentProviderError) {
      setConflictData({
        conflictCode: 'ACCOUNT_EXISTS_DIFFERENT_PROVIDER',
        registeredProvider: e.registeredProvider,
        emailMasked: e.emailMasked,
      });
      return true;
    }
    return false;
  };

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

  // B-CN A.4: 인증코드 타이머 (600초)
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timeLeft]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(600);
    setTimerActive(true);
  }, []);

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
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

  // B-CN A.4: 1단계 — 폼 검증 후 인증코드 발송 → verify step
  const handleStartVerification = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      await authApi.sendVerification(email.trim());
      setStep('verify');
      startTimer();
    } catch (e: any) {
      if (e instanceof EmailRateLimitedError) {
        setErrors({ form: t('auth.rateLimited', { retryAfter: e.retryAfterSeconds }) });
        return;
      }
      if (
        e instanceof EmailRecentlyWithdrawnError ||
        e instanceof AccountAlreadyExistsError ||
        e instanceof AccountExistsDifferentProviderError
      ) {
        handleTypedAuthError(e);
        return;
      }
      setErrors({ form: e?.message || t('auth.registerFailed') });
    } finally {
      setIsSubmitting(false);
    }
  };

  // B-CN A.4: 2단계 — 코드 검증 → verify_token 받은 직후 register
  const handleVerifyAndRegister = async () => {
    if (verifyCode.trim().length !== 6) {
      setErrors({ code: t('auth.invalidCode') });
      return;
    }
    setIsSubmitting(true);
    setErrors({});
    try {
      const result = await authApi.verifyCode(email.trim(), verifyCode.trim());
      const token = result.verify_token;
      setVerifyToken(token);
      await register(name.trim(), email.trim(), password, token);
      await recordConsentSafe({ ageConfirmed, marketingOptIn });
      if (timerRef.current) clearInterval(timerRef.current);
      setStep('complete');
    } catch (e: any) {
      if (e instanceof EmailRateLimitedError) {
        setErrors({ form: t('auth.rateLimited', { retryAfter: e.retryAfterSeconds }) });
        return;
      }
      if (
        e instanceof EmailRecentlyWithdrawnError ||
        e instanceof AccountAlreadyExistsError ||
        e instanceof AccountExistsDifferentProviderError
      ) {
        handleTypedAuthError(e);
        return;
      }
      const verifyKey = resolveVerifyErrorI18nKey(e);
      setErrors({ code: verifyKey ? t(verifyKey) : t('auth.invalidCode') });
    } finally {
      setIsSubmitting(false);
    }
  };

  // B-CN A.4: 코드 재발송
  const handleResendCode = async () => {
    setErrors({});
    try {
      await authApi.sendVerification(email.trim());
      setVerifyCode('');
      startTimer();
    } catch (e: any) {
      if (e instanceof EmailRateLimitedError) {
        setErrors({ form: t('auth.rateLimited', { retryAfter: e.retryAfterSeconds }) });
        return;
      }
      setErrors({ form: e?.message || t('auth.registerFailed') });
    }
  };

  const handleGoogleSuccess = async () => {
    await recordConsentSafe({ ageConfirmed, marketingOptIn });
    router.replace('/(tabs)');
  };
  const handleGoogleError = (errorMessage: string) => {
    setErrors({ form: errorMessage });
  };

  // Registration complete screen
  if (step === 'complete') {
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

  // B-CN A.4: 이메일 인증 코드 입력 단계
  if (step === 'verify') {
    return (
      <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Header — 뒤로가기: form 단계로 복귀 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              setTimerActive(false);
              setVerifyCode('');
              setErrors({});
              setStep('form');
            }}
            style={styles.backButton}
          >
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
          <Text style={[styles.sectionTitle, isDark && { color: '#F9FAFB' }]}>
            {t('auth.verificationCode')}
          </Text>
          <Text style={[styles.description, isDark && { color: '#9CA3AF' }]}>
            {t('auth.verificationCodeDesc')}
          </Text>

          {/* Timer */}
          <View style={styles.timerContainer}>
            <Ionicons
              name="time-outline"
              size={18}
              color={timeLeft <= 60 ? '#EF4444' : isDark ? '#9CA3AF' : '#6B7280'}
            />
            <Text
              style={[
                styles.timerText,
                { color: timeLeft <= 60 ? '#EF4444' : isDark ? '#F9FAFB' : '#2D3A35' },
              ]}
            >
              {formatTime(timeLeft)}
            </Text>
          </View>

          {/* Code Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, isDark && { color: '#F9FAFB' }]}>
              {t('auth.verificationCode')}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                  borderColor: errors.code
                    ? '#EF4444'
                    : isDark
                    ? '#374151'
                    : '#E5E7EB',
                },
              ]}
            >
              <Ionicons
                name="key-outline"
                size={20}
                color={isDark ? '#6B7280' : '#9CA3AF'}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  { color: isDark ? '#F9FAFB' : '#111827' },
                ]}
                placeholder={t('auth.verificationCodePlaceholder')}
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={verifyCode}
                onChangeText={(text) => {
                  setVerifyCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                  setErrors({});
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!isSubmitting && timeLeft > 0}
              />
            </View>
            {errors.code ? <Text style={styles.errorText}>{errors.code}</Text> : null}
          </View>

          {errors.form ? (
            <View style={[styles.formError, isDark && styles.formErrorDark]}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.formErrorText}>{errors.form}</Text>
            </View>
          ) : null}

          {timeLeft === 0 ? (
            <View style={[styles.formError, isDark && styles.formErrorDark]}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.formErrorText}>{t('auth.codeExpired')}</Text>
            </View>
          ) : null}

          {/* Verify & Register Button */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              (isSubmitting || timeLeft === 0) && { opacity: 0.6 },
            ]}
            onPress={handleVerifyAndRegister}
            disabled={isSubmitting || timeLeft === 0}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.registerButtonText}>{t('auth.verifyCode')}</Text>
            )}
          </TouchableOpacity>

          {/* Resend link */}
          <TouchableOpacity
            style={styles.resendLink}
            onPress={handleResendCode}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={[styles.resendText, isDark && { color: '#9CA3AF' }]}>
              {t('auth.resendCode')}
            </Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
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
            onTypedError={handleTypedAuthError}
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
            onSubmitEditing={handleStartVerification}
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
          onPress={handleStartVerification}
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

      {coolingOffData && (
        <CoolingOffModal
          visible
          withdrawnAt={coolingOffData.withdrawnAt}
          rejoinAvailableAt={coolingOffData.rejoinAvailableAt}
          onClose={() => setCoolingOffData(null)}
        />
      )}
      {conflictData && (
        <AccountConflictModal
          visible
          conflictCode={conflictData.conflictCode}
          registeredProvider={conflictData.registeredProvider}
          emailMasked={conflictData.emailMasked}
          onClose={() => setConflictData(null)}
          onLoginPress={() => {
            setConflictData(null);
            router.replace('/login');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // B-CN A.4: verify step
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 28 },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 14 },
  codeInput: { letterSpacing: 6, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  timerText: { fontSize: 20, fontWeight: '700' },
  resendLink: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  resendText: { fontSize: 14, textDecorationLine: 'underline', color: '#888' },

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
