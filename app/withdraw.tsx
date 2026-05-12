// app/withdraw.tsx
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useAuthStore } from '@/src/store/authStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';
import {
  postWithdrawalConsent,
  WithdrawalConsentError,
  CURRENT_WITHDRAWAL_TERMS_VERSION,
} from '@/src/api/withdrawal';
import { AccountDeletionError } from '@/src/api/auth';
import { storageApi } from '@/src/api/storage';

// ─── Constants ───────────────────────────────────────────
const REASON_IDS = [
  'not_using',
  'difficult',
  'other_service',
  'privacy',
  'other',
] as const;
type ReasonId = (typeof REASON_IDS)[number];

const TOTAL_STEPS = 3;
const WITHDRAWAL_TERMS_URL = 'https://marzlog.com/withdrawal-terms';
const CONFIRM_PHRASE_KO = '계정 삭제';
const CONFIRM_PHRASE_EN = 'delete account';
const FREE_PLAN = 'free' as const;

type StepNumber = 1 | 2 | 3;

export default function WithdrawScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode, language } = useSettingsStore();
  const { deleteAccount, forceLogout } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isDark =
    themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  // ─── Step state ────────────────────────────────────────
  const [step, setStep] = useState<StepNumber>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: reasons + Pro detection
  const [selectedReasons, setSelectedReasons] = useState<ReasonId[]>([]);
  const [otherText, setOtherText] = useState('');
  const [plan, setPlan] = useState<string | null>(null);
  const [planLoaded, setPlanLoaded] = useState(false);

  // Step 2: consent checkboxes
  const [agreeDataLoss, setAgreeDataLoss] = useState(false);
  const [agreeIrreversible, setAgreeIrreversible] = useState(false);

  // Step 3: confirm phrase
  const [confirmInput, setConfirmInput] = useState('');

  const confirmPhrase = language === 'en' ? CONFIRM_PHRASE_EN : CONFIRM_PHRASE_KO;

  // ─── Fetch plan on mount (mirror backend 409 ACTIVE_SUBSCRIPTION guard) ──
  useEffect(() => {
    let mounted = true;
    storageApi
      .getStorageUsage()
      .then((usage) => {
        if (mounted) {
          setPlan(usage.plan);
          setPlanLoaded(true);
        }
      })
      .catch(() => {
        // best-effort; backend will 409 if active sub present
        if (mounted) {
          setPlan(null);
          setPlanLoaded(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const hasActiveSubscription = planLoaded && plan !== null && plan !== FREE_PLAN;

  // ─── Step 1 logic ──────────────────────────────────────
  const toggleReason = (id: ReasonId) => {
    setSelectedReasons((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };
  const isOtherSelected = selectedReasons.includes('other');
  const isStep1Valid =
    selectedReasons.length > 0 &&
    (!isOtherSelected || otherText.trim().length > 0) &&
    !hasActiveSubscription;

  const goToStep2 = () => {
    if (!isStep1Valid) return;
    setStep(2);
  };

  // ─── Step 2 logic ──────────────────────────────────────
  const isStep2Valid = agreeDataLoss && agreeIrreversible;

  const submitConsent = async () => {
    if (!isStep2Valid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await postWithdrawalConsent({
        withdrawal_terms_version: CURRENT_WITHDRAWAL_TERMS_VERSION,
        confirm_data_loss: agreeDataLoss,
        confirm_irreversible: agreeIrreversible,
      });
      setStep(3);
    } catch (err) {
      if (err instanceof WithdrawalConsentError) {
        if (err.code === 'TERMS_VERSION_MISMATCH') {
          Alert.alert(
            t('common.error'),
            t('account.withdrawConsentErrorTermsMismatch'),
          );
        } else if (
          err.code === 'CONFIRM_DATA_LOSS_REQUIRED' ||
          err.code === 'CONFIRM_IRREVERSIBLE_REQUIRED'
        ) {
          Alert.alert(t('common.error'), t('account.withdrawConsentErrorRequired'));
        } else if (err.code === 'USER_NOT_FOUND') {
          await forceLogout();
          router.replace('/login');
        } else {
          Alert.alert(t('common.error'), t('account.withdrawErrorGeneric'));
        }
      } else {
        Alert.alert(t('common.error'), t('account.withdrawErrorGeneric'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Step 3 logic ──────────────────────────────────────
  const isStep3Valid = confirmInput.trim() === confirmPhrase;

  const submitDelete = async () => {
    if (!isStep3Valid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await deleteAccount();
      router.replace('/withdraw-complete');
    } catch (err) {
      if (err instanceof AccountDeletionError) {
        if (err.code === 'WITHDRAWAL_CONSENT_REQUIRED') {
          Alert.alert(
            t('common.error'),
            t('account.withdrawErrorConsentRequired'),
          );
          setAgreeDataLoss(false);
          setAgreeIrreversible(false);
          setStep(2);
        } else if (err.code === 'ACTIVE_SUBSCRIPTION') {
          Alert.alert(
            t('common.error'),
            t('account.withdrawErrorActiveSubscription'),
          );
          setStep(1);
        } else if (err.code === 'USER_NOT_FOUND') {
          Alert.alert(t('common.error'), t('account.withdrawErrorUserNotFound'));
          await forceLogout();
          router.replace('/login');
        } else {
          Alert.alert(t('common.error'), t('account.withdrawErrorGeneric'));
        }
      } else {
        Alert.alert(t('common.error'), t('account.withdrawErrorGeneric'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render helpers ────────────────────────────────────
  const handleBack = () => {
    if (step === 1) {
      router.back();
    } else {
      setStep((prev) => (prev === 3 ? 2 : 1) as StepNumber);
    }
  };

  const openWithdrawalTerms = () => {
    WebBrowser.openBrowserAsync(WITHDRAWAL_TERMS_URL).catch(() => {
      Alert.alert(t('common.error'), t('account.withdrawErrorGeneric'));
    });
  };

  return (
    <View
      style={[
        styles.container,
        isDark && styles.containerDark,
        { paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDark ? '#F9FAFB' : '#1F2937'}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Logo size={28} showText={false} color={isDark ? '#F9FAFB' : '#1F2937'} />
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>
            {t('account.withdraw')}
          </Text>
        </View>
        <View style={styles.iconBtn}>
          <Text style={[styles.stepIndicator, isDark && styles.textSecondaryDark]}>
            {t('account.withdrawStepIndicator', { current: step, total: TOTAL_STEPS })}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <Step1
            isDark={isDark}
            t={t}
            selectedReasons={selectedReasons}
            toggleReason={toggleReason}
            isOtherSelected={isOtherSelected}
            otherText={otherText}
            setOtherText={setOtherText}
            hasActiveSubscription={hasActiveSubscription}
          />
        )}
        {step === 2 && (
          <Step2
            isDark={isDark}
            t={t}
            agreeDataLoss={agreeDataLoss}
            setAgreeDataLoss={setAgreeDataLoss}
            agreeIrreversible={agreeIrreversible}
            setAgreeIrreversible={setAgreeIrreversible}
            openTerms={openWithdrawalTerms}
          />
        )}
        {step === 3 && (
          <Step3
            isDark={isDark}
            t={t}
            confirmPhrase={confirmPhrase}
            confirmInput={confirmInput}
            setConfirmInput={setConfirmInput}
          />
        )}
      </ScrollView>

      <View
        style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            (step === 1 && !isStep1Valid) ||
            (step === 2 && !isStep2Valid) ||
            (step === 3 && !isStep3Valid) ||
            isSubmitting
              ? styles.primaryBtnDisabled
              : styles.primaryBtnActive,
          ]}
          onPress={() => {
            if (step === 1) goToStep2();
            else if (step === 2) submitConsent();
            else submitDelete();
          }}
          disabled={
            isSubmitting ||
            (step === 1 && !isStep1Valid) ||
            (step === 2 && !isStep2Valid) ||
            (step === 3 && !isStep3Valid)
          }
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>
            {isSubmitting
              ? t('common.loading')
              : step === 1
                ? t('account.withdrawNext')
                : step === 2
                  ? t('account.withdrawConsentSubmit')
                  : t('account.withdrawSubmit')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 1 ─────────────────────────────────────────────
interface Step1Props {
  isDark: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  selectedReasons: ReasonId[];
  toggleReason: (id: ReasonId) => void;
  isOtherSelected: boolean;
  otherText: string;
  setOtherText: (s: string) => void;
  hasActiveSubscription: boolean;
}
function Step1({
  isDark,
  t,
  selectedReasons,
  toggleReason,
  isOtherSelected,
  otherText,
  setOtherText,
  hasActiveSubscription,
}: Step1Props) {
  return (
    <View>
      <Text style={[styles.stepTitle, isDark && styles.textLight]}>
        {t('account.withdrawStep1Title')}
      </Text>
      <Text style={[styles.stepSubtitle, isDark && styles.textSecondaryDark]}>
        {t('account.withdrawStep1Subtitle')}
      </Text>

      <View style={[styles.dataBox, isDark && styles.dataBoxDark]}>
        {(
          [
            'withdrawDataItem1',
            'withdrawDataItem2',
            'withdrawDataItem3',
            'withdrawDataItem4',
          ] as const
        ).map((k) => (
          <View key={k} style={styles.dataRow}>
            <Ionicons name="ellipse" size={6} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text style={[styles.dataText, isDark && styles.textLight]}>
              {t(`account.${k}`)}
            </Text>
          </View>
        ))}
        <Text style={[styles.dataNote, isDark && styles.textSecondaryDark]}>
          {t('account.withdrawDataNote')}
        </Text>
      </View>

      {hasActiveSubscription && (
        <View style={styles.proBlock}>
          <Ionicons name="warning" size={20} color="#FF6B6B" />
          <View style={styles.proBlockText}>
            <Text style={styles.proBlockTitle}>{t('account.withdrawProBlockTitle')}</Text>
            <Text style={styles.proBlockDesc}>{t('account.withdrawProBlockDesc')}</Text>
          </View>
        </View>
      )}

      <Text style={[styles.sectionLabel, isDark && styles.textLight]}>
        {t('account.withdrawReason')}
      </Text>
      <View style={styles.reasonList}>
        {REASON_IDS.map((id) => {
          const isSelected = selectedReasons.includes(id);
          return (
            <TouchableOpacity
              key={id}
              style={[
                styles.reasonBtn,
                isDark && styles.reasonBtnDark,
                isSelected && styles.reasonBtnSelected,
              ]}
              onPress={() => toggleReason(id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.reasonText,
                  isDark && !isSelected && styles.textLight,
                  isSelected && styles.reasonTextSelected,
                ]}
              >
                {t(`account.reason_${id}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isOtherSelected && (
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder={t('account.withdrawOtherPlaceholder')}
          placeholderTextColor="#999"
          value={otherText}
          onChangeText={setOtherText}
          multiline
          maxLength={200}
        />
      )}
    </View>
  );
}

// ─── Step 2 ─────────────────────────────────────────────
interface Step2Props {
  isDark: boolean;
  t: (key: string) => string;
  agreeDataLoss: boolean;
  setAgreeDataLoss: (v: boolean) => void;
  agreeIrreversible: boolean;
  setAgreeIrreversible: (v: boolean) => void;
  openTerms: () => void;
}
function Step2({
  isDark,
  t,
  agreeDataLoss,
  setAgreeDataLoss,
  agreeIrreversible,
  setAgreeIrreversible,
  openTerms,
}: Step2Props) {
  return (
    <View>
      <Text style={[styles.stepTitle, isDark && styles.textLight]}>
        {t('account.withdrawStep2Title')}
      </Text>
      <Text style={[styles.stepSubtitle, isDark && styles.textSecondaryDark]}>
        {t('account.withdrawStep2Subtitle')}
      </Text>

      <TouchableOpacity
        style={[styles.termsViewBtn, isDark && styles.termsViewBtnDark]}
        onPress={openTerms}
        activeOpacity={0.7}
      >
        <Ionicons
          name="document-text-outline"
          size={20}
          color={isDark ? '#F9FAFB' : '#1F2937'}
        />
        <Text style={[styles.termsViewText, isDark && styles.textLight]}>
          {t('account.withdrawTermsView')}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isDark ? '#9CA3AF' : '#6B7280'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.checkRow}
        onPress={() => setAgreeDataLoss(!agreeDataLoss)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, agreeDataLoss && styles.checkboxActive]}>
          {agreeDataLoss && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
        <Text style={[styles.checkLabel, isDark && styles.textLight]}>
          {t('account.withdrawAgreeDataLoss')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.checkRow}
        onPress={() => setAgreeIrreversible(!agreeIrreversible)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, agreeIrreversible && styles.checkboxActive]}>
          {agreeIrreversible && (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          )}
        </View>
        <Text style={[styles.checkLabel, isDark && styles.textLight]}>
          {t('account.withdrawAgreeIrreversible')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Step 3 ─────────────────────────────────────────────
interface Step3Props {
  isDark: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  confirmPhrase: string;
  confirmInput: string;
  setConfirmInput: (s: string) => void;
}
function Step3({
  isDark,
  t,
  confirmPhrase,
  confirmInput,
  setConfirmInput,
}: Step3Props) {
  return (
    <View>
      <Text style={[styles.stepTitle, isDark && styles.textLight]}>
        {t('account.withdrawStep3Title')}
      </Text>
      <Text style={[styles.stepSubtitle, isDark && styles.textSecondaryDark]}>
        {t('account.withdrawStep3Subtitle')}
      </Text>

      <Text style={[styles.confirmLabel, isDark && styles.textLight]}>
        {t('account.withdrawConfirmTextLabel', { phrase: confirmPhrase })}
      </Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        placeholder={confirmPhrase}
        placeholderTextColor="#999"
        value={confirmInput}
        onChangeText={setConfirmInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  containerDark: { backgroundColor: '#111827' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  iconBtn: { width: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '300', color: '#1F2937' },
  stepIndicator: { fontSize: 14, color: '#6B7280' },
  textLight: { color: '#F9FAFB' },
  textSecondaryDark: { color: '#9CA3AF' },
  content: { padding: 24, paddingBottom: 40 },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    marginBottom: 24,
  },
  dataBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },
  dataBoxDark: { backgroundColor: '#1F2937' },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dataText: { fontSize: 14, color: '#374151', flex: 1 },
  dataNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 18,
  },
  proBlock: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFD0D0',
  },
  proBlockText: { flex: 1, gap: 4 },
  proBlockTitle: { fontSize: 14, fontWeight: '700', color: '#FF6B6B' },
  proBlockDesc: { fontSize: 13, color: '#B85050', lineHeight: 18 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  reasonList: { gap: 10 },
  reasonBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  reasonBtnDark: { backgroundColor: '#1F2937' },
  reasonBtnSelected: { backgroundColor: '#2D3436' },
  reasonText: { fontSize: 15, color: '#374151' },
  reasonTextSelected: { color: '#FFFFFF' },
  input: {
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputDark: { backgroundColor: '#1F2937', color: '#F9FAFB' },
  termsViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  termsViewBtnDark: { backgroundColor: '#1F2937' },
  termsViewText: { flex: 1, fontSize: 15, color: '#1F2937', fontWeight: '500' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#2D3436', borderColor: '#2D3436' },
  checkLabel: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
  confirmLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    fontWeight: '500',
  },
  bottomBar: { paddingHorizontal: 24, paddingTop: 12 },
  primaryBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnActive: { backgroundColor: '#FF6B6B' },
  primaryBtnDisabled: { backgroundColor: '#E0E0E0' },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
