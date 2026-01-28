import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@src/hooks/useTranslation';
import { authApi } from '@src/api/auth';
import { extractErrorMessage } from '@src/utils/errorMessages';

type Tab = 'findId' | 'findPassword';
type Step = 'email' | 'reset' | 'complete';

export default function ForgotPasswordScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<Tab>(
    params.tab === 'findId' ? 'findId' : 'findPassword'
  );
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const inputBg = isDark ? '#1F2937' : '#F3F4F6';
  const inputText = isDark ? '#F9FAFB' : '#111827';
  const inputBorder = isDark ? '#374151' : '#E5E7EB';
  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';
  const bgColor = isDark ? '#111827' : '#F5F5F0';
  const textColor = isDark ? '#F9FAFB' : '#2D3A35';
  const subtextColor = isDark ? '#9CA3AF' : '#6B7280';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    // Reset password step when switching tabs
    if (tab === 'findPassword') {
      setStep('email');
      setErrors({});
    }
  };

  const handleRequestReset = async () => {
    if (!email.trim()) {
      setErrors({ email: t('auth.requiredField') });
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      const result = await authApi.forgotPassword(email.trim());
      setResetToken(result.message);
      setStep('reset');
    } catch (e: any) {
      setErrors({ form: extractErrorMessage(e, t('common.error')) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    const newErrors: Record<string, string> = {};

    if (!newPassword) newErrors.newPassword = t('auth.requiredField');
    else if (newPassword.length < 6) newErrors.newPassword = t('auth.passwordMinLength');
    if (!newPasswordConfirm) newErrors.newPasswordConfirm = t('auth.requiredField');
    else if (newPassword !== newPasswordConfirm) newErrors.newPasswordConfirm = t('auth.passwordMismatch');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      await authApi.resetPassword(resetToken, newPassword);
      setStep('complete');
    } catch (e: any) {
      setErrors({ form: extractErrorMessage(e, t('common.error')) });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete screen
  if (step === 'complete') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.completeContainer}>
          <View style={styles.completeIconWrap}>
            <Ionicons name="checkmark-circle" size={72} color="#FF6A5F" />
          </View>
          <Text style={[styles.completeTitle, { color: textColor }]}>
            {t('auth.resetPasswordComplete')}
          </Text>
          <TouchableOpacity
            style={styles.coralButton}
            onPress={() => router.replace('/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.coralButtonText}>{t('auth.goToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => step === 'reset' ? setStep('email') : router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        <View style={[styles.tabBar, { backgroundColor: isDark ? '#374151' : '#E8E8E3' }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'findId' && [styles.tabActive, { backgroundColor: isDark ? '#F9FAFB' : '#2D3A35' }],
            ]}
            onPress={() => handleTabChange('findId')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.tabText,
              { color: isDark ? '#9CA3AF' : '#6B7280' },
              activeTab === 'findId' && { color: isDark ? '#111827' : '#FFFFFF', fontWeight: '600' },
            ]}>
              {t('auth.findId')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'findPassword' && [styles.tabActive, { backgroundColor: isDark ? '#F9FAFB' : '#2D3A35' }],
            ]}
            onPress={() => handleTabChange('findPassword')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.tabText,
              { color: isDark ? '#9CA3AF' : '#6B7280' },
              activeTab === 'findPassword' && { color: isDark ? '#111827' : '#FFFFFF', fontWeight: '600' },
            ]}>
              {t('auth.findPassword')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ===== Find ID Tab ===== */}
          {activeTab === 'findId' && (
            <View style={styles.findIdContent}>
              {/* Info Card */}
              <View style={[styles.infoCard, { backgroundColor: cardBg }]}>
                <View style={[styles.infoIconWrap, { backgroundColor: isDark ? '#374151' : '#FFF0ED' }]}>
                  <Ionicons name="mail-outline" size={24} color="#FF6A5F" />
                </View>
                <Text style={[styles.infoTitle, { color: textColor }]}>
                  {t('auth.findIdInfo')}
                </Text>
                <Text style={[styles.infoSubtitle, { color: subtextColor }]}>
                  {t('auth.findIdRemember')}
                </Text>

                <View style={styles.tipList}>
                  {[t('auth.findIdTip1'), t('auth.findIdTip2'), t('auth.findIdTip3')].map((tip, i) => (
                    <View key={i} style={styles.tipRow}>
                      <View style={[styles.tipBullet, { backgroundColor: '#FF6A5F' }]} />
                      <Text style={[styles.tipText, { color: textColor }]}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Not a member yet? */}
              <View style={styles.notMemberArea}>
                <Text style={[styles.notMemberText, { color: subtextColor }]}>
                  {t('auth.notMemberYet')}
                </Text>
                <TouchableOpacity
                  style={styles.registerButton}
                  onPress={() => router.push('/terms-agreement')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.registerButtonText}>{t('auth.register')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ===== Find Password Tab ===== */}
          {activeTab === 'findPassword' && step === 'email' && (
            <>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                {t('auth.forgotPasswordTitle')}
              </Text>
              <Text style={[styles.description, { color: subtextColor }]}>
                {t('auth.forgotPasswordDesc')}
              </Text>

              {/* Email Input */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: textColor }]}>{t('auth.email')}</Text>
                <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: errors.email ? '#EF4444' : inputBorder }]}>
                  <Ionicons name="mail-outline" size={20} color={placeholderColor} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: inputText }]}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor={placeholderColor}
                    value={email}
                    onChangeText={(text) => { setEmail(text); setErrors({}); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              {errors.form ? (
                <View style={styles.formError}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.formErrorText}>{errors.form}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.coralButton, isSubmitting && { opacity: 0.6 }]}
                onPress={handleRequestReset}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.coralButtonText}>{t('auth.sendResetLink')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {activeTab === 'findPassword' && step === 'reset' && (
            <>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                {t('auth.resetPassword')}
              </Text>

              {/* New Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: textColor }]}>
                  {t('auth.newPassword')}
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: errors.newPassword ? '#EF4444' : inputBorder }]}>
                  <TextInput
                    style={[styles.input, { color: inputText, flex: 1 }]}
                    placeholder={t('auth.newPasswordPlaceholder')}
                    placeholderTextColor={placeholderColor}
                    value={newPassword}
                    onChangeText={(text) => { setNewPassword(text); setErrors({ ...errors, newPassword: '' }); }}
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
                {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}
              </View>

              {/* New Password Confirm */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: textColor }]}>
                  {t('auth.newPasswordConfirm')}
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: errors.newPasswordConfirm ? '#EF4444' : inputBorder }]}>
                  <TextInput
                    style={[styles.input, { color: inputText, flex: 1 }]}
                    placeholder={t('auth.newPasswordConfirmPlaceholder')}
                    placeholderTextColor={placeholderColor}
                    value={newPasswordConfirm}
                    onChangeText={(text) => { setNewPasswordConfirm(text); setErrors({ ...errors, newPasswordConfirm: '' }); }}
                    secureTextEntry={!showPasswordConfirm}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPasswordConfirm(!showPasswordConfirm)} style={styles.eyeIcon}>
                    <Ionicons
                      name={showPasswordConfirm ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={placeholderColor}
                    />
                  </TouchableOpacity>
                </View>
                {errors.newPasswordConfirm ? <Text style={styles.errorText}>{errors.newPasswordConfirm}</Text> : null}
              </View>

              {errors.form ? (
                <View style={styles.formError}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.formErrorText}>{errors.form}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.coralButton, isSubmitting && { opacity: 0.6 }]}
                onPress={handleResetPassword}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.coralButtonText}>{t('auth.resetPassword')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
  },
  // Tab
  tabContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 25,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 22,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  // Find ID
  findIdContent: {
    flex: 1,
  },
  infoCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  infoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  infoSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  tipList: {
    alignSelf: 'stretch',
    gap: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  notMemberArea: {
    alignItems: 'center',
    gap: 16,
  },
  notMemberText: {
    fontSize: 14,
  },
  registerButton: {
    backgroundColor: '#FF6A5F',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    minHeight: 52,
  },
  registerButtonText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: '600',
  },
  // Find Password
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  formErrorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  // Shared coral button
  coralButton: {
    backgroundColor: '#FF6A5F',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 50,
  },
  coralButtonText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: '600',
  },
  // Complete screen
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  completeIconWrap: {
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
});
