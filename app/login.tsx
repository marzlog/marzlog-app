import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import GoogleLoginButton from '@src/components/auth/GoogleLoginButton';
import { router } from 'expo-router';
import { useAuthStore } from '@src/store/authStore';
import { useTranslation } from '@src/hooks/useTranslation';

// Floating Label 입력 컴포넌트
interface FloatingInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  isDark: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  autoComplete?: 'email' | 'password' | 'off';
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  rightIcon?: React.ReactNode;
}

function FloatingInput({
  label,
  value,
  onChangeText,
  isDark,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
  inputRef,
  rightIcon,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }
  };

  const labelTop = animValue.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const labelSize = animValue.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const activeColor = '#FF6A5F';
  const lineColor = isFocused
    ? activeColor
    : isDark ? '#374151' : '#D1D5DB';
  const labelColor = isFocused
    ? activeColor
    : isDark ? '#6B7280' : '#9CA3AF';

  return (
    <View style={floatStyles.wrapper}>
      <Animated.Text
        style={[floatStyles.label, { top: labelTop, fontSize: labelSize, color: labelColor }]}
      >
        {label}
      </Animated.Text>
      <View style={floatStyles.row}>
        <TextInput
          ref={inputRef}
          style={[floatStyles.input, { color: isDark ? '#F9FAFB' : '#111827' }]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
        />
        {rightIcon}
      </View>
      <View style={[floatStyles.line, { backgroundColor: lineColor }]} />
    </View>
  );
}

const floatStyles = StyleSheet.create({
  wrapper: {
    paddingTop: 18,
    paddingBottom: 4,
    marginBottom: 8,
  },
  label: {
    position: 'absolute',
    left: 0,
    fontWeight: '400',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 6,
    paddingRight: 8,
  },
  line: {
    height: 1.5,
    marginTop: 2,
  },
});

export default function LoginScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { setError, error, loginWithEmail } = useAuthStore();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const handleSuccess = () => router.replace('/(tabs)');
  const handleError = (errorMessage: string) => setError(errorMessage);

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

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        enableOnAndroid
        extraScrollHeight={20}
        keyboardDismissMode="on-drag"
      >
        {/* 로고 영역 */}
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
          <Text style={[styles.slogan, isDark && { color: '#9CA3AF' }]}>
            {t('login.slogan')}
          </Text>
        </View>

        {/* 소셜 로그인 - 상단 */}
        <View style={styles.socialArea}>
          <GoogleLoginButton onSuccess={handleSuccess} onError={handleError} style={{ marginHorizontal: 16 }} />
          <TouchableOpacity
            style={[styles.appleButton, isDark && styles.appleButtonDark, { marginHorizontal: 16 }]}
            onPress={() => Alert.alert(t('auth.continueWithApple'), t('auth.appleNotSupported'))}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-apple" size={20} color={isDark ? '#fff' : '#fff'} />
            <Text style={styles.appleButtonText}>{t('auth.continueWithApple')}</Text>
          </TouchableOpacity>
        </View>

        {/* 구분선 */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
          <Text style={[styles.dividerText, isDark && { color: '#6B7280' }]}>
            {t('common.or')}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
        </View>

        {/* 이메일 / 비밀번호 입력 */}
        <View style={styles.inputArea}>
          <FloatingInput
            label={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={(text) => { setEmail(text); setError(null); }}
            isDark={isDark}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />
          <FloatingInput
            label={t('auth.passwordPlaceholder')}
            value={password}
            onChangeText={(text) => { setPassword(text); setError(null); }}
            isDark={isDark}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleEmailLogin}
            inputRef={passwordRef}
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
        </View>

        {/* 에러 메시지 */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 로그인 버튼 */}
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

        {/* 하단 링크 */}
        <View style={styles.linkRow}>
          <TouchableOpacity onPress={() => router.push('/terms-agreement')}>
            <Text style={[styles.linkText, isDark && { color: '#9CA3AF' }]}>{t('auth.register')}</Text>
          </TouchableOpacity>
          <View style={[styles.linkDivider, { backgroundColor: isDark ? '#4B5563' : '#D1D5DB' }]} />
          <TouchableOpacity onPress={() => router.push({ pathname: '/forgot-password', params: { tab: 'findId' } })}>
            <Text style={[styles.linkText, isDark && { color: '#9CA3AF' }]}>{t('auth.findId')}</Text>
          </TouchableOpacity>
          <View style={[styles.linkDivider, { backgroundColor: isDark ? '#4B5563' : '#D1D5DB' }]} />
          <TouchableOpacity onPress={() => router.push({ pathname: '/forgot-password', params: { tab: 'findPassword' } })}>
            <Text style={[styles.linkText, isDark && { color: '#9CA3AF' }]}>{t('auth.findPassword')}</Text>
          </TouchableOpacity>
        </View>

        {/* 이용약관 */}
        <View style={styles.termsArea}>
          <Text style={[styles.termsText, isDark && { color: '#6B7280' }]}>
            {t('login.termsAgreement')}
          </Text>
          <View style={styles.termsLinks}>
            <TouchableOpacity onPress={() => router.push('/policy/terms')}>
              <Text style={styles.termsLink}>{t('support.terms')}</Text>
            </TouchableOpacity>
            <Text style={[styles.termsDivider, isDark && { color: '#6B7280' }]}>|</Text>
            <TouchableOpacity onPress={() => router.push('/policy/privacy')}>
              <Text style={styles.termsLink}>{t('support.privacy')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
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
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8,
    paddingBottom: 24,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  mascotImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginBottom: 8,
  },
  textLogo: {
    width: 120,
    height: 30,
    marginBottom: 4,
  },
  slogan: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  socialArea: {
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 8,
    width: '100%',
    height: 44,
    gap: 8,
  },
  appleButtonDark: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
  },
  loginButton: {
    backgroundColor: '#FF6A5F',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 4,
    marginHorizontal: 16,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 14,
  },
  linkText: {
    fontSize: 13,
    color: '#6B7280',
  },
  linkDivider: {
    width: 1,
    height: 12,
  },
  termsArea: {
    alignItems: 'center',
    marginTop: 4,
  },
  termsText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  termsLink: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '500',
  },
  termsDivider: {
    fontSize: 11,
    color: '#D1D5DB',
  },
});
