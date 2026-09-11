import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import { router, useLocalSearchParams } from 'expo-router';
import { recordConsentSafe } from '@src/api/consent';
import { useTranslation } from '@src/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsAgreementScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ from?: string }>();
  // 소셜 자동 가입자 동의 경로(B-U Phase 2). 이 경로는 동의 후 곧장 메인이며 가입 폼 단계가 없다.
  const isSocialConsent = params.from === 'login';

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);

  const insets = useSafeAreaInsets();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const bgColor = isDark ? '#111827' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subtextColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const cardBg = isDark ? '#1F2937' : '#F9FAFB';

  const allRequired = agreeAge && agreeTerms && agreePrivacy;
  const allChecked = agreeAge && agreeTerms && agreePrivacy && agreeMarketing;

  const handleAgreeAll = () => {
    const newVal = !allChecked;
    setAgreeAge(newVal);
    setAgreeTerms(newVal);
    setAgreePrivacy(newVal);
    setAgreeMarketing(newVal);
  };

  const handleNext = async () => {
    if (!allRequired) return;

    if (isSocialConsent) {
      // B-U Phase 2: 소셜 자동 가입자 consent 기록 후 메인 진입.
      // 실패해도 redirect — B-H 미들웨어가 다음 API 호출 시 재redirect로 잡음.
      await recordConsentSafe({
        ageConfirmed: agreeAge,
        marketingOptIn: agreeMarketing,
      });
      router.replace('/(tabs)');
      return;
    }

    // 기존 register 흐름 (변경 없음)
    router.push({
      pathname: '/register',
      params: {
        age_14: agreeAge ? '1' : '0',
        marketing: agreeMarketing ? '1' : '0',
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* 스텝 표기 (탭 아님 — 눌리지 않는다).
          ★소셜 경로(`from=login`)에는 2단계(가입 폼)가 존재하지 않는다 — 동의 후 바로 메인으로
            간다(handleNext) — 그래서 그 경로에서는 렌더하지 않는다. 2단계를 보여주면서
            누를 수 없게 두면 "Đăng ký 가 안 눌린다"는 오인을 부른다(VN 테스터 실보고).
          ★밑줄(borderBottom)을 걷어내고 숫자 접두 + 비활성 투명도로 표기 — 탭으로 읽히지 않게. */}
      {!isSocialConsent && (
        <View style={styles.tabRow}>
          <View style={styles.stepActive}>
            <Text style={styles.stepActiveText}>{`1 · ${t('auth.tabTerms')}`}</Text>
          </View>
          <View style={styles.stepInactive}>
            <Text style={[styles.stepInactiveText, { color: subtextColor }]}>
              {`2 · ${t('auth.tabRegister')}`}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.content}>
        <Text style={[styles.title, { color: textColor }]}>{t('terms.title')}</Text>

        {/* Agree All */}
        <TouchableOpacity
          style={[styles.agreeAllRow, { backgroundColor: cardBg, borderColor }]}
          onPress={handleAgreeAll}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, allChecked && styles.checkboxActive]}>
            {allChecked && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>
          <View style={styles.agreeAllTextWrap}>
            <Text style={[styles.agreeAllLabel, { color: textColor }]}>{t('terms.agreeAll')}</Text>
            <Text style={[styles.agreeAllDesc, { color: subtextColor }]}>{t('terms.agreeAllDesc')}</Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.separator, { backgroundColor: borderColor }]} />

        <Text style={styles.helperText}>{t('terms.tapToView')}</Text>

        {/* Age 14+ confirmation */}
        <View style={styles.itemRow}>
          <TouchableOpacity
            style={styles.itemLeft}
            onPress={() => setAgreeAge(!agreeAge)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreeAge && styles.checkboxActive]}>
              {agreeAge && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={[styles.itemLabel, { color: textColor }]}>{t('terms.ageConfirmRequired')}</Text>
          </TouchableOpacity>
        </View>

        {/* Terms of Service */}
        <View style={styles.itemRow}>
          <TouchableOpacity
            style={styles.itemLeft}
            onPress={() => setAgreeTerms(!agreeTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
              {agreeTerms && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={[styles.itemLabel, { color: textColor }]}>{t('terms.termsOfServiceRequired')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/policy/terms')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={20} color={subtextColor} />
          </TouchableOpacity>
        </View>

        {/* Privacy Policy */}
        <View style={styles.itemRow}>
          <TouchableOpacity
            style={styles.itemLeft}
            onPress={() => setAgreePrivacy(!agreePrivacy)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreePrivacy && styles.checkboxActive]}>
              {agreePrivacy && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={[styles.itemLabel, { color: textColor }]}>{t('terms.privacyPolicyRequired')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/policy/privacy')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={20} color={subtextColor} />
          </TouchableOpacity>
        </View>

        {/* Marketing */}
        <View style={styles.itemRow}>
          <TouchableOpacity
            style={styles.itemLeft}
            onPress={() => setAgreeMarketing(!agreeMarketing)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreeMarketing && styles.checkboxActive]}>
              {agreeMarketing && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={[styles.itemLabel, { color: textColor }]}>{t('terms.marketingOptional')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Button */}
      <View style={[styles.bottomArea, { paddingBottom: Math.max(32, insets.bottom + 12) }]}>
        <TouchableOpacity
          style={[styles.nextButton, !allRequired && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!allRequired}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>{t('terms.agreeAndNext')}</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
  },
  // 스텝 표기 — 밑줄 없음(탭 오인 방지), 현재 단계는 색, 다음 단계는 투명도로 구분한다.
  stepActive: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  stepActiveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6A5F',
  },
  stepInactive: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    opacity: 0.45,
  },
  stepInactiveText: {
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
  agreeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  agreeAllTextWrap: {
    flex: 1,
  },
  agreeAllLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  agreeAllDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  separator: {
    height: 1,
    marginBottom: 16,
  },
  helperText: {
    fontSize: 13,
    color: '#999',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    lineHeight: 18,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  itemLabel: {
    fontSize: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#FF6A5F',
    borderColor: '#FF6A5F',
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  nextButton: {
    backgroundColor: '#FF6A5F',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  nextButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  nextButtonText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: '600',
  },
});
