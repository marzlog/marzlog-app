import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import { useAuthStore } from '@src/store/authStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { PlusCta } from '@/src/components/plus/PlusCta';
import { plusColors } from '@/src/components/plus/plusColors';
import { addBreadcrumb } from '@/src/utils/sentry';
import { openSubscriptionManagement } from '@src/services/purchases';
import { formatLongDate } from '@src/utils/dateLocale';
import type { TextRef } from '@src/utils/paywallViewModel';
import {
  buildPlusSuccessVM,
  parsePlusSuccessParams,
  resolvePlusSuccessGuard,
} from '@src/utils/plusSuccessViewModel';
import { borderRadius, darkTheme, lightTheme, palette, spacing, typography, type Theme } from '@src/theme';

/**
 * 구독 시작 완료 화면 (PAYWALL 명세 §3.2, 시안 03-success.png).
 *
 * 결제 화면이 구매 completed 후 replace 로 보낸다(params: kind·trial·price·reflected).
 * 반영 중이면 진입 시와 앱 복귀(AppState active) 때 /auth/me 를 다시 읽고, plus 가 확인되면 반영 변형으로 바뀐다.
 * 미반영 warning(paywall-reflect-timeout)은 결제 화면이 이미 남겼다 — 여기서는 다시 남기지 않는다.
 * "구독 관리 보기"는 D6(/subscription) 전까지 스토어 관리 화면을 직접 연다(열 수 없으면 버튼 숨김).
 */
const MIN_TOUCH = 44;

export default function PlusSuccessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t, language } = useTranslation();
  const raw = useLocalSearchParams<{ kind?: string; trial?: string; price?: string; reflected?: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const theme: Theme = isDark ? darkTheme : lightTheme;
  const isPlus = user?.plan === 'plus';

  const params = useMemo(
    () => parsePlusSuccessParams({ kind: raw.kind, trial: raw.trial, price: raw.price, reflected: raw.reflected }),
    [raw.kind, raw.trial, raw.price, raw.reflected],
  );
  const guard = resolvePlusSuccessGuard({ isAuthenticated, hasParams: params !== null, isPlus });
  const vm = buildPlusSuccessVM({
    params,
    isPlus,
    planExpiresAt: user?.plan_expires_at,
    formatDate: (iso) => formatLongDate(iso, language),
  });
  const tx = (ref: TextRef) => t(ref.key, ref.params);

  const [manageHidden, setManageHidden] = useState(false);

  useEffect(() => {
    if (guard === 'go-home') router.replace('/(tabs)');
  }, [guard, router]);

  useEffect(() => {
    if (guard === 'render') addBreadcrumb('paywall', 'success', { variant: vm.variant });
  }, [guard, vm.variant]);

  // 반영 중: 진입 시 1회 + 앱 복귀 때마다 1회 재조회. 실패는 조용히(다음 복귀·다음 진입에서 다시 본다)
  const pending = guard === 'render' && vm.variant === 'pending';
  const refreshOnce = useCallback(async () => {
    try {
      await useAuthStore.getState().refreshUser();
    } catch {
      // 반영 대기 — 미반영 warning 은 결제 화면이 이미 남겼다
    }
  }, []);

  useEffect(() => {
    if (pending) refreshOnce();
  }, [pending, refreshOnce]);

  useEffect(() => {
    if (!pending) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshOnce();
    });
    return () => sub.remove();
  }, [pending, refreshOnce]);

  const goHome = () => router.replace('/(tabs)');

  const openManage = async () => {
    // D6 에서 /subscription 으로 교체
    if ((await openSubscriptionManagement()) === 'unavailable') setManageHidden(true);
  };

  if (guard !== 'render') {
    return <View style={[styles.container, { backgroundColor: theme.background.primary }]} />;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background.primary, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.base },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.icon, { backgroundColor: theme.primary.default }]}>
          <Ionicons name="checkmark" size={48} color={palette.neutral[0]} />
        </View>
        <Text style={[styles.title, { color: theme.text.primary }]} accessibilityRole="header">
          {tx(vm.title)}
        </Text>
        <Text style={[styles.body, { color: theme.text.secondary }]}>{tx(vm.body)}</Text>

        {vm.rows.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.surface.primary, borderColor: theme.border.light }]}>
            {vm.rows.map((row, i) => (
              <View
                key={row.label.key}
                style={[
                  styles.row,
                  i < vm.rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.light },
                ]}
              >
                <Text style={[styles.rowLabel, { color: theme.text.secondary }]}>{tx(row.label)}</Text>
                <Text style={[styles.rowValue, { color: theme.text.primary }]}>
                  {typeof row.value === 'string' ? row.value : tx(row.value)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {vm.note && <Text style={[styles.note, { color: theme.text.secondary }]}>{tx(vm.note)}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <PlusCta label={t('plusSuccess.cta')} onPress={goHome} colors={plusColors(theme, isDark)} />
        {!manageHidden && (
          <TouchableOpacity onPress={openManage} style={styles.manageTouch} accessibilityRole="button">
            <Text style={[styles.manageText, { color: theme.text.secondary }]}>{t('plusSuccess.manage')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing['3xl'], gap: spacing.base },
  icon: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, textAlign: 'center' },
  body: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    textAlign: 'center',
  },
  card: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.base,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 56,
    paddingVertical: spacing.md,
  },
  rowLabel: { fontSize: typography.fontSize.base },
  rowValue: { flexShrink: 1, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semiBold, textAlign: 'right' },
  note: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    textAlign: 'center',
  },
  footer: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  manageTouch: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  manageText: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium },
});
