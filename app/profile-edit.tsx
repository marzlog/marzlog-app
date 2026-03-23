import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@src/store/authStore';
import { useSettingsStore } from '@src/store/settingsStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { authApi } from '@src/api/auth';
import { palette, getTheme } from '@src/theme/colors';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FloatingInput } from '@/src/components/common/FloatingInput';

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { t } = useTranslation();
  const { themeMode } = useSettingsStore();
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';
  const theme = getTheme(isDark);

  const isOAuth = !!user?.oauth_provider;

  // Nickname state
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);

  // Avatar state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState('');
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const displayInitial = (user?.nickname || user?.email || 'U').charAt(0).toUpperCase();
  const avatarUrl = user?.avatar_url;

  const handlePickAvatar = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('갤러리 접근 권한이 필요합니다');
        return;
      }
    }

    try {
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.8,
      };
      if (Platform.OS !== 'web') {
        pickerOptions.allowsEditing = true;
        pickerOptions.aspect = [1, 1];
      }

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setAvatarUploading(true);
      setAvatarStatus('업로드 중...');

      const response = await authApi.uploadAvatar(asset.uri, asset.mimeType || 'image/jpeg');
      setUser(response.user);

      setAvatarStatus('');
      showToast('프로필 사진이 변경되었습니다');
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || '알 수 없는 오류';
      // error shown via toast
      setAvatarStatus('');
      showToast('업로드 실패: ' + String(detail));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setAvatarUploading(true);
      setAvatarStatus('삭제 중...');
      const response = await authApi.deleteAvatar();
      setUser(response.user);
      setAvatarStatus('');
      showToast('프로필 사진이 삭제되었습니다');
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || '알 수 없는 오류';
      setAvatarStatus('');
      showToast('삭제 실패: ' + String(detail));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarPress = () => {
    if (avatarUploading) return;
    if (avatarUrl) {
      setShowAvatarMenu(true);
    } else {
      handlePickAvatar();
    }
  };

  const handleSaveProfile = async () => {
    if (!nickname.trim()) {
      showToast(t('profileEdit.nicknameRequired'));
      return;
    }
    try {
      setSaving(true);
      const updatedUser = await authApi.updateProfile({ nickname: nickname.trim() });
      setUser(updatedUser);
      showToast(t('profileEdit.saved'));
    } catch (error: any) {
      showToast(error?.message || t('profileEdit.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      showToast(t('profileEdit.currentPasswordRequired'));
      return;
    }
    if (newPassword.length < 6) {
      showToast(t('auth.passwordMinLength'));
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      showToast(t('auth.passwordMismatch'));
      return;
    }
    try {
      setChangingPassword(true);
      await authApi.changePassword(currentPassword, newPassword);
      showToast(t('profileEdit.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (error: any) {
      showToast(error?.response?.data?.detail || t('profileEdit.passwordChangeFailed'));
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
            <Pressable
              onPress={handleAvatarPress}
              disabled={avatarUploading}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, cursor: 'pointer' } as any]}
            >
              <View style={[styles.avatar, isDark && styles.avatarDark, avatarUrl && styles.avatarWithImage]}>
                {avatarUrl ? (
                  <Image
                    key={avatarUrl}
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <Text style={styles.avatarText}>{displayInitial}</Text>
                )}
                {avatarUploading && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
              </View>
              <View style={[styles.cameraIcon, isDark && { backgroundColor: '#374151' }, { pointerEvents: 'none' } as any]}>
                <Ionicons name="camera" size={14} color={isDark ? '#F9FAFB' : '#FFFFFF'} />
              </View>
            </Pressable>
            {avatarStatus ? (
              <Text style={[styles.avatarStatusText, isDark && { color: '#9CA3AF' }]}>
                {avatarStatus}
              </Text>
            ) : (
              <Text style={[styles.avatarHintText, isDark && { color: '#6B7280' }]}>
                사진을 눌러 변경
              </Text>
            )}

          </View>

          {/* Email (read-only) */}
          <FloatingInput
            label={t('auth.email')}
            value={user?.email || ''}
            isDark={isDark}
            editable={false}
          />

          {/* Nickname */}
          <FloatingInput
            label={t('profileEdit.nickname')}
            value={nickname}
            onChangeText={setNickname}
            isDark={isDark}
            autoCapitalize="none"
          />

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
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <Text style={[styles.saveButtonText, (!hasNicknameChanged) && styles.saveButtonTextDisabled]}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>

          {/* Password Change Section - only for non-OAuth users */}
          {!isOAuth && (
            <View style={styles.passwordSection}>
              <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
                {t('profileEdit.changePassword')}
              </Text>

              <FloatingInput
                label={t('profileEdit.currentPassword')}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                isDark={isDark}
                secureTextEntry
              />
              <FloatingInput
                label={t('auth.newPassword')}
                value={newPassword}
                onChangeText={setNewPassword}
                isDark={isDark}
                secureTextEntry
              />
              <FloatingInput
                label={t('auth.newPasswordConfirm')}
                value={newPasswordConfirm}
                onChangeText={setNewPasswordConfirm}
                isDark={isDark}
                secureTextEntry
              />

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
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <Text style={styles.changePasswordText}>{t('profileEdit.changePassword')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
      </KeyboardAwareScrollView>

      {/* Toast */}
      {toastMessage !== '' && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={[styles.toast, isDark && styles.toastDark]}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* BottomSheet ActionSheet */}
      {showAvatarMenu && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            style={[styles.sheetOverlay, { backgroundColor: theme.overlay }]}
            onPress={() => setShowAvatarMenu(false)}
          >
            <View style={[styles.sheetContent, { backgroundColor: theme.surface.primary, paddingBottom: Math.max(40, insets.bottom + 16) }]}>
              <Text style={[styles.sheetTitle, { color: theme.text.primary }]}>프로필 사진</Text>

              <Pressable
                style={({ pressed }) => [styles.sheetOption, { borderBottomColor: theme.border.light }, pressed && { opacity: 0.6 }]}
                onPress={() => { setShowAvatarMenu(false); handlePickAvatar(); }}
              >
                <Ionicons name="image-outline" size={24} color={palette.primary[500]} />
                <Text style={[styles.sheetOptionText, { color: theme.text.primary }]}>새 사진 선택</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.sheetOption, { borderBottomColor: theme.border.light }, pressed && { opacity: 0.6 }]}
                onPress={() => { setShowAvatarMenu(false); handleDeleteAvatar(); }}
              >
                <Ionicons name="trash-outline" size={24} color={palette.error[500]} />
                <Text style={[styles.sheetOptionText, { color: palette.error[500] }]}>사진 삭제</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.sheetCancel, pressed && { opacity: 0.6 }]}
                onPress={() => setShowAvatarMenu(false)}
              >
                <Text style={[styles.sheetCancelText, { color: theme.text.secondary }]}>취소</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      )}
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
  avatarWithImage: {
    overflow: 'hidden' as const,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 44,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarStatusText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
  },
  avatarHintText: {
    marginTop: 10,
    fontSize: 13,
    color: '#9CA3AF',
  },
  // BottomSheet ActionSheet (matches home "사진 추가" style)
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sheetOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  sheetCancel: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F9FAFB',
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
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonTextDisabled: {},
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
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
  // Toast
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  toastDark: {
    backgroundColor: 'rgba(55, 65, 81, 0.95)',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
