import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useAuthStore } from '@/src/store/authStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useDialog } from '@/src/components/ui/Dialog';
import { Logo } from '@/src/components/common/Logo';

const WITHDRAW_REASONS = [
  { id: 'not_using', label: '잘 사용 하지 않아요' },
  { id: 'difficult', label: '사용하는 것이 어려워요' },
  { id: 'other_service', label: '이용 중인 다른 서비스가 있어요' },
  { id: 'privacy', label: '개인정보가 걱정돼요' },
  { id: 'other', label: '기타' },
];

export default function WithdrawScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { deleteAccount } = useAuthStore();
  const { t } = useTranslation();
  const { confirm } = useDialog();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleReason = (id: string) => {
    setSelectedReasons(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const isOtherSelected = selectedReasons.includes('other');
  const isButtonActive = selectedReasons.length > 0 &&
    (!isOtherSelected || otherText.trim().length > 0);

  const handleWithdraw = async () => {
    if (!isButtonActive) return;

    const confirmed = await confirm({
      title: t('account.withdraw'),
      description: t('account.withdrawConfirm'),
      confirmText: t('account.withdraw'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await deleteAccount();
      router.replace('/withdraw-complete');
    } catch {
      Alert.alert(t('common.error'), t('account.withdrawError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Logo size={28} showText={false} color={isDark ? '#F9FAFB' : '#1F2937'} />
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>{t('account.withdraw')}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <View style={styles.flex}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          enableOnAndroid={true}
          extraScrollHeight={20}
          keyboardShouldPersistTaps="handled"
        >
          {/* Description */}
          <Text style={[styles.description, isDark && styles.textSecondaryDark]}>
            {t('account.withdrawDesc')}
          </Text>

          {/* Reason Selection */}
          <Text style={[styles.sectionLabel, isDark && styles.textLight]}>
            {t('account.withdrawReason')}
          </Text>

          <View style={styles.reasonList}>
            {WITHDRAW_REASONS.map((reason) => {
              const isSelected = selectedReasons.includes(reason.id);
              return (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonButton,
                    isDark && styles.reasonButtonDark,
                    isSelected && styles.reasonButtonSelected,
                  ]}
                  onPress={() => toggleReason(reason.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.reasonText,
                    isDark && !isSelected && styles.textLight,
                    isSelected && styles.reasonTextSelected,
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Other text input */}
          {isOtherSelected && (
            <TextInput
              style={[
                styles.otherInput,
                isDark && styles.otherInputDark,
              ]}
              placeholder={t('account.withdrawOtherPlaceholder')}
              placeholderTextColor="#999"
              value={otherText}
              onChangeText={setOtherText}
              multiline
              maxLength={200}
            />
          )}
        </KeyboardAwareScrollView>

        {/* Bottom Button */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[
              styles.withdrawButton,
              isButtonActive ? styles.withdrawButtonActive : styles.withdrawButtonDisabled,
            ]}
            onPress={handleWithdraw}
            disabled={!isButtonActive || isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.withdrawButtonText,
              isButtonActive ? styles.withdrawButtonTextActive : styles.withdrawButtonTextDisabled,
            ]}>
              {isSubmitting ? t('common.loading') : t('account.withdraw')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    paddingHorizontal: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: '#1F2937',
  },
  textLight: {
    color: '#F9FAFB',
  },
  textSecondaryDark: {
    color: '#9CA3AF',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  reasonList: {
    gap: 10,
  },
  reasonButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  reasonButtonDark: {
    backgroundColor: '#1F2937',
  },
  reasonButtonSelected: {
    backgroundColor: '#2D3436',
  },
  reasonText: {
    fontSize: 15,
    color: '#374151',
  },
  reasonTextSelected: {
    color: '#FFFFFF',
  },
  otherInput: {
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  otherInputDark: {
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  withdrawButton: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  withdrawButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  withdrawButtonTextDisabled: {
    color: '#999',
  },
  withdrawButtonTextActive: {
    color: '#FFFFFF',
  },
});
