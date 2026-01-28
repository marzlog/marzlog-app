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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import { router } from 'expo-router';
import { useAuthStore } from '@src/store/authStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { authApi } from '@src/api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const inputBg = isDark ? '#1F2937' : '#F3F4F6';
  const inputText = isDark ? '#F9FAFB' : '#111827';
  const inputBorder = isDark ? '#374151' : '#E5E7EB';
  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';
  const bgColor = isDark ? '#111827' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subtextColor = isDark ? '#9CA3AF' : '#6B7280';

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
      Alert.alert(t('common.error'), t('auth.registerFailed'));
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

  // Registration complete screen
  if (showComplete) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.completeContainer}>
          <View style={styles.completeIconWrap}>
            <Ionicons name="checkmark-circle" size={72} color="#F97066" />
          </View>
          <Text style={[styles.completeTitle, { color: textColor }]}>
            {t('auth.registerComplete')}
          </Text>
          <Text style={[styles.completeDesc, { color: subtextColor }]}>
            {t('auth.registerCompleteDesc')}
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
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
          <Text style={[styles.title, { color: textColor }]}>
            {t('auth.registerTitle')}
          </Text>

          {/* Name Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor }]}>
              {t('auth.name')} <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: errors.name ? '#EF4444' : inputBorder }]}>
              <TextInput
                style={[styles.input, { color: inputText }]}
                placeholder={t('auth.namePlaceholder')}
                placeholderTextColor={placeholderColor}
                value={name}
                onChangeText={(text) => { setName(text); setErrors({ ...errors, name: '' }); }}
                autoCapitalize="words"
              />
            </View>
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          {/* Email Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor }]}>
              {t('auth.email')} <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.emailRow}>
              <View style={[styles.inputWrapper, styles.emailInput, { backgroundColor: inputBg, borderColor: errors.email ? '#EF4444' : inputBorder }]}>
                <TextInput
                  style={[styles.input, { color: inputText }]}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor={placeholderColor}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailChecked(false);
                    setEmailStatus(null);
                    setErrors({ ...errors, email: '' });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
              <TouchableOpacity
                style={[styles.checkButton, emailCheckLoading && { opacity: 0.6 }]}
                onPress={handleCheckEmail}
                disabled={emailCheckLoading}
                activeOpacity={0.8}
              >
                {emailCheckLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.checkButtonText}>{t('auth.checkDuplicate')}</Text>
                )}
              </TouchableOpacity>
            </View>
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : emailStatus === 'available' ? (
              <Text style={styles.successText}>{t('auth.emailAvailable')}</Text>
            ) : null}
          </View>

          {/* Password Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor }]}>
              {t('auth.password')} <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: errors.password ? '#EF4444' : inputBorder }]}>
              <TextInput
                style={[styles.input, { color: inputText, flex: 1 }]}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={placeholderColor}
                value={password}
                onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: '' }); }}
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
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {/* Password Confirm Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor }]}>
              {t('auth.passwordConfirm')} <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: errors.passwordConfirm ? '#EF4444' : inputBorder }]}>
              <TextInput
                style={[styles.input, { color: inputText, flex: 1 }]}
                placeholder={t('auth.passwordConfirmPlaceholder')}
                placeholderTextColor={placeholderColor}
                value={passwordConfirm}
                onChangeText={(text) => { setPasswordConfirm(text); setErrors({ ...errors, passwordConfirm: '' }); }}
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
            {errors.passwordConfirm ? <Text style={styles.errorText}>{errors.passwordConfirm}</Text> : null}
          </View>

          {/* Form Error */}
          {errors.form ? (
            <View style={styles.formError}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
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
  required: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
  eyeIcon: {
    padding: 4,
  },
  emailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emailInput: {
    flex: 1,
  },
  checkButton: {
    backgroundColor: '#6B7280',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 50,
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  successText: {
    color: '#10B981',
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
  registerButton: {
    backgroundColor: '#F97066',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 50,
  },
  registerButtonText: {
    color: '#FFFFFF',
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
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  completeDesc: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#F97066',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 48,
    alignItems: 'center',
    minHeight: 50,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
