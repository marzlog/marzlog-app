import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import { router } from 'expo-router';
import { useTranslation } from '@src/hooks/useTranslation';

export default function TermsAgreementScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const bgColor = isDark ? '#111827' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subtextColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const cardBg = isDark ? '#1F2937' : '#F9FAFB';

  const allRequired = agreeTerms && agreePrivacy;
  const allChecked = agreeTerms && agreePrivacy && agreeMarketing;

  const handleAgreeAll = () => {
    const newVal = !allChecked;
    setAgreeTerms(newVal);
    setAgreePrivacy(newVal);
    setAgreeMarketing(newVal);
  };

  const handleNext = () => {
    if (!allRequired) return;
    router.push({
      pathname: '/register',
      params: { marketing: agreeMarketing ? '1' : '0' },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Step Tabs */}
      <View style={styles.tabRow}>
        <View style={styles.tabActive}>
          <Text style={styles.tabActiveText}>{t('auth.tabTerms')}</Text>
        </View>
        <View style={[styles.tabInactive, { borderBottomColor: borderColor }]}>
          <Text style={[styles.tabInactiveText, { color: subtextColor }]}>{t('auth.tabRegister')}</Text>
        </View>
      </View>

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
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.nextButton, !allRequired && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!allRequired}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>{t('terms.agreeAndNext')}</Text>
        </TouchableOpacity>
      </View>
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
  },
  tabActive: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#F08E76',
    alignItems: 'center',
  },
  tabActiveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F08E76',
  },
  tabInactive: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tabInactiveText: {
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
    backgroundColor: '#F08E76',
    borderColor: '#F08E76',
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  nextButton: {
    backgroundColor: '#F08E76',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
