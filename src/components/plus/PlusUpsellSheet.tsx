import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useAuthStore } from '@/src/store/authStore';
import { usePlusSheetStore } from '@/src/store/plusSheetStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { addBreadcrumb } from '@/src/utils/sentry';
import { loadPaywallOffer, type PaywallTrial } from '@/src/services/purchases';
import { buildUpsellSheetVM, sheetTrialFromOffer } from '@/src/utils/plusSheetViewModel';
import type { TextRef } from '@/src/utils/paywallViewModel';
import { borderRadius, darkTheme, lightTheme, spacing, typography, type Theme } from '@/src/theme';
import { PlusCta } from './PlusCta';
import { plusColors } from './plusColors';

/**
 * Plus 안내 시트 (PAYWALL 명세 §3.4, 시안 02-regen-gate·05-storage-full, D7-1).
 *
 * 루트 레이아웃에 하나만 둔다. 열기·닫기는 usePlusSheetStore — 화면이 바뀌어도(업로드 후 홈 이동) 시트가 남는다.
 * 표시는 buildUpsellSheetVM(순수 함수). Plus 여부는 서버 /auth/me plan(PW-1).
 * regen 은 열린 뒤 상품을 조회해 체험 줄을 덧붙인다 — 조회를 기다리느라 늦게 띄우지 않는다.
 * 바깥 누름·Android 뒤로가기로 닫으면 "다음에 할게요"와 같다.
 */
const MIN_TOUCH = 44;

export function PlusUpsellSheet() {
  const request = usePlusSheetStore((s) => s.request);
  const close = usePlusSheetStore((s) => s.close);
  const isPlus = useAuthStore((s) => s.user?.plan === 'plus');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const theme: Theme = isDark ? darkTheme : lightTheme;
  const accent = plusColors(theme, isDark);

  const [trial, setTrial] = useState<PaywallTrial | null>(null);

  // 열릴 때 1회 기록, regen 이면 체험 줄을 위해 상품 조회(실패·지연은 줄 없이 그대로)
  useEffect(() => {
    if (!request) return;
    addBreadcrumb('paywall', 'sheet', { variant: request.variant, action: 'open' });
    setTrial(null);
    if (request.variant !== 'regen' || isPlus) return;
    let alive = true;
    loadPaywallOffer().then((result) => {
      if (alive) setTrial(sheetTrialFromOffer(result));
    });
    return () => {
      alive = false;
    };
    // isPlus 는 열린 시점 기준 — 열린 뒤 바뀌어도 다시 조회하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  if (!request) return null;

  const vm = buildUpsellSheetVM({ request, isPlus, trial });
  const tx = (ref: TextRef) => t(ref.key, ref.params);

  const dismiss = () => {
    addBreadcrumb('paywall', 'sheet', { variant: request.variant, action: 'later' });
    close();
  };

  const onPrimary = () => {
    addBreadcrumb('paywall', 'sheet', { variant: request.variant, action: vm.primary.action === 'paywall' ? 'cta' : 'confirm' });
    close();
    if (vm.primary.action === 'paywall') router.push({ pathname: '/paywall', params: { source: vm.source } });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={dismiss}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={dismiss} accessibilityLabel={tx(vm.secondary ?? vm.primary.label)}>
        <View
          style={[styles.sheet, { backgroundColor: theme.background.primary, paddingBottom: insets.bottom + spacing.base }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.handle, { backgroundColor: theme.border.default }]} />
          {/* 글자 확대에서 버튼이 화면 밖으로 밀리지 않게 내용 전체를 스크롤 */}
          <ScrollView contentContainerStyle={styles.content} bounces={false}>
            <Text style={[styles.brand, { color: theme.text.secondary }]}>{tx(vm.brand)}</Text>
            <Text style={[styles.title, { color: theme.text.primary }]} accessibilityRole="header">
              {tx(vm.title)}
            </Text>
            <Text style={[styles.body, { color: theme.text.secondary }]}>{tx(vm.body)}</Text>

            {vm.trialNote && (
              <View style={[styles.infoBox, { backgroundColor: theme.surface.secondary }]}>
                <Ionicons name="calendar-outline" size={20} color={theme.icon.primary} />
                <Text style={[styles.infoText, { color: theme.text.primary }]}>{tx(vm.trialNote)}</Text>
              </View>
            )}

            {vm.usage && (
              <View style={[styles.usageBox, { backgroundColor: theme.surface.secondary }]}>
                <View style={styles.usageRow}>
                  <Text style={[styles.usageLabel, { color: theme.text.secondary }]}>{tx(vm.usage.label)}</Text>
                  <Text style={[styles.usageValue, { color: theme.text.primary }]}>{tx(vm.usage.value)}</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: theme.border.light }]}>
                  <View style={[styles.barFill, { backgroundColor: theme.text.primary, width: `${vm.usage.percent}%` }]} />
                </View>
              </View>
            )}

            <View style={styles.buttons}>
              <PlusCta label={tx(vm.primary.label)} onPress={onPrimary} colors={accent} />
              {vm.secondary && (
                <TouchableOpacity onPress={dismiss} style={styles.secondary} accessibilityRole="button">
                  <Text style={[styles.secondaryText, { color: theme.text.secondary }]}>{tx(vm.secondary)}</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingTop: spacing.sm },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: borderRadius.full, marginBottom: spacing.sm },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  brand: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semiBold },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold },
  body: { fontSize: typography.fontSize.base, lineHeight: typography.fontSize.base * typography.lineHeight.normal },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: borderRadius.lg, padding: spacing.base },
  infoText: { flexShrink: 1, fontSize: typography.fontSize.base },
  usageBox: { borderRadius: borderRadius.lg, padding: spacing.base, gap: spacing.sm },
  usageRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  usageLabel: { fontSize: typography.fontSize.base },
  usageValue: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold },
  barTrack: { height: 8, borderRadius: borderRadius.full, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: borderRadius.full, minWidth: 4 },
  buttons: { gap: spacing.xs, marginTop: spacing.sm },
  secondary: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium },
});
