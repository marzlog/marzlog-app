import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@src/store/authStore';
import { useSettingsStore } from '@src/store/settingsStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { authApi } from '@src/api/auth';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { t } = useTranslation();
  const { themeMode } = useSettingsStore();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const isOAuth = !!user?.oauth_provider;

  // Nickname state
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const displayInitial = (user?.nickname || user?.email || 'U').charAt(0).toUpperCase();

  const handleSaveProfile = async () => {
    if (!nickname.trim()) {
      Alert.alert(t('common.error'), t('profileEdit.nicknameRequired'));
      return;
    }
    try {
      setSaving(true);
      const updatedUser = await authApi.updateProfile({ nickname: nickname.trim() });
      setUser(updatedUser);
      Alert.alert(t('common.success'), t('profileEdit.saved'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('profileEdit.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert(t('common.error'), t('profileEdit.currentPasswordRequired'));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordMinLength'));
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return;
    }
    try {
      setChangingPassword(true);
      await authApi.changePassword(currentPassword, newPassword);
      Alert.alert(t('common.success'), t('profileEdit.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data?.detail || t('profileEdit.passwordChangeFailed'));
    } finally {
      setChangingPassword(false);
    }
  };

  const hasNicknameChanged = nickname.trim() !== (user?.nickname || '');

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>
          {t('profileEdit.title')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, isDark && styles.avatarDark]}>
              <Text style={styles.avatarText}>{displayInitial}</Text>
            </View>
          </View>

          {/* Email (read-only) */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, isDark && styles.labelDark]}>{t('auth.email')}</Text>
            <View style={[styles.readOnlyField, isDark && styles.readOnlyFieldDark]}>
              <Text style={[styles.readOnlyText, isDark && styles.readOnlyTextDark]}>
                {user?.email || ''}
              </Text>
              {isOAuth && (
                <View style={styles.oauthBadge}>
                  <Ionicons
                    name={user?.oauth_provider === 'apple' ? 'logo-apple' : 'logo-google'}
                    size={14}
                    color="#6B7280"
                  />
                </View>
              )}
            </View>
          </View>

          {/* Nickname */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, isDark && styles.labelDark]}>{t('profileEdit.nickname')}</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={nickname}
              onChangeText={setNickname}
              placeholder={t('profileEdit.nicknamePlaceholder')}
              placeholderTextColor="#9CA3AF"
              maxLength={20}
              autoCapitalize="none"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasNicknameChanged || saving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSaveProfile}
            disabled={!hasNicknameChanged || saving}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>

          {/* Password Change Section - only for non-OAuth users */}
          {!isOAuth && (
            <View style={styles.passwordSection}>
              <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
                {t('profileEdit.changePassword')}
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  {t('profileEdit.currentPassword')}
                </Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder={t('profileEdit.currentPasswordPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  {t('auth.newPassword')}
                </Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('auth.newPasswordPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  {t('auth.newPasswordConfirm')}
                </Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={newPasswordConfirm}
                  onChangeText={setNewPasswordConfirm}
                  placeholder={t('auth.newPasswordConfirmPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.changePasswordButton,
                  (!currentPassword || !newPassword || !newPasswordConfirm || changingPassword)
                    && styles.changePasswordButtonDisabled,
                ]}
                onPress={handleChangePassword}
                disabled={!currentPassword || !newPassword || !newPasswordConfirm || changingPassword}
                activeOpacity={0.7}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#6366F1" />
                ) : (
                  <Text style={styles.changePasswordText}>{t('profileEdit.changePassword')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
      </KeyboardAwareScrollView>
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  textLight: {
    color: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDark: {
    backgroundColor: '#4F46E5',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Fields
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  labelDark: {
    color: '#D1D5DB',
  },
  input: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
    color: '#F9FAFB',
  },
  readOnlyField: {
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyFieldDark: {
    backgroundColor: '#1F2937',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  readOnlyTextDark: {
    color: '#9CA3AF',
  },
  oauthBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Save Button
  saveButton: {
    height: 48,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Password Section
  passwordSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  changePasswordButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePasswordButtonDisabled: {
    borderColor: '#D1D5DB',
  },
  changePasswordText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
});
