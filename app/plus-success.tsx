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
import { addBreadcrumb, captureMessage } from '@/src/utils/sentry';
import { openSubscriptionManagement, restorePaywallPurchases } from '@src/services/purchases';
import { formatLongDate } from '@src/utils/dateLocale';
import type { TextRef } from '@src/utils/paywallViewModel';
import {
  buildPlusSuccessVM,
  initialPendingPhase,
  parsePlusSuccessEntry,
  resolvePlusSuccessGuard,
  type PlusPendingPhase,
} from '@src/utils/plusSuccessViewModel';
import { waitForPlusReflected } from '@src/utils/plusReflect';
import {
  PLUS_REFLECT_ATTEMPT_TIMEOUT_MS,
  PLUS_REFLECT_INTERVAL_MS,
  PLUS_REFLECT_MAX_WAIT_MS,
} from '@src/constants/plus';
import { borderRadius, darkTheme, lightTheme, palette, spacing, typography, type Theme } from '@src/theme';

/**
 * 구독 시작 완료 화면 (PAYWALL 명세 §3.2, 시안 03-success.png).
 *
 * 결제 화면이 구매 completed 후 replace 로 보낸다(params: kind·trial·price·reflected).
 * 결제 화면 복원 후 미반영이면 restore=1 로 보낸다(구매 파라미터 없음, 복원 확인 안내부터).
 * 반영 중(D5-b-2): 안내 + 구매 복원 + 닫기. 진입 시와 앱 복귀(AppState active) 때 /auth/me 를 다시 읽고,
 * plus 가 확인되면 반영 변형으로 바뀐다. 구매 복원은 결제 화면과 같은 규칙(PW-14) — 활성 구독 없으면 바로 안내,
 * 있으면 반영 확인(최대 30초). 미반영 warning(paywall-reflect-timeout)은 결제 화면이 이미 남겼다.
 * "구독 관리 보기"는 D6(/subscription) 전까지 스토어 관리 화면을 직접 연다(열 수 없으면 버튼 숨김).
 */
const MIN_TOUCH = 44;

export default function PlusSuccessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t, language } = useTranslation();
  const raw = useLocalSearchParams<{ kind?: string; trial?: string; price?: string; reflected?: string; restore?: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const theme: Theme = isDark ? darkTheme : lightTheme;
  const isPlus = user?.plan === 'plus';

  const { params, fromRestore } = useMemo(
    () =>
      parsePlusSuccessEntry({ kind: raw.kind, trial: raw.trial, price: raw.price, reflected: raw.reflected, restore: raw.restore }),
    [raw.kind, raw.trial, raw.price, raw.reflected, raw.restore],
  );
  const [pendingPhase, setPendingPhase] = useState<PlusPendingPhase>(() => initialPendingPhase(fromRestore));
  const guard = resolvePlusSuccessGuard({ isAuthenticated, hasParams: params !== null || fromRestore, isPlus });
  const vm = buildPlusSuccessVM({
    params,
    fromRestore,
    pendingPhase,
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

  const closePending = () => {
    if (vm.pending?.closeEnabled) goHome();
  };

  // 반영 중 화면의 구매 복원 — 진행 중에는 버튼 스피너·닫기 잠금
  const restoreFromPending = async () => {
    if (!vm.pending?.restore.enabled) return;
    setPendingPhase('restoring');
    const restored = await restorePaywallPurchases(useAuthStore.getState().user?.id);
    addBreadcrumb('paywall', 'restore', { outcome: restored, source: 'plus-success' });
    if (restored === 'identity_mismatch') return setPendingPhase('identity-mismatch');
    if (restored === 'failed') return setPendingPhase('restore-failed');
    if (restored === 'restored-none') return setPendingPhase('restore-none');
    const { reflected } = await waitForPlusReflected(
      async (timeoutMs) => (await useAuthStore.getState().refreshUser(timeoutMs)).plan === 'plus',
      { intervalMs: PLUS_REFLECT_INTERVAL_MS, maxWaitMs: PLUS_REFLECT_MAX_WAIT_MS, attemptTimeoutMs: PLUS_REFLECT_ATTEMPT_TIMEOUT_MS },
    );
    // 반영되면 isPlus 로 반영 변형이 된다. 단계는 안내용으로만 남긴다
    if (!reflected) {
      captureMessage('paywall plus not reflected after restore', { source: 'plus-success' }, {
        level: 'warning',
        fingerprint: ['paywall-restore-reflect-timeout'],
        tags: { area: 'paywall', source: 'plus-success' },
      });
    }
    setPendingPhase(reflected ? 'idle' : 'restore-checked');
  };

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
          <Ionicons name={vm.icon === 'time' ? 'time-outline' : 'checkmark'} size={48} color={palette.neutral[0]} />
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
        {vm.pending?.notice && (
          <Text style={[styles.note, { color: theme.text.primary }]} accessibilityLiveRegion="polite">
            {tx(vm.pending.notice)}
          </Text>
        )}
      </ScrollView>

      {vm.pending ? (
        <View style={styles.footer}>
          <PlusCta
            label={t('plusSuccess.restore')}
            onPress={restoreFromPending}
            loading={vm.pending.restore.loading}
            colors={plusColors(theme, isDark)}
          />
          <TouchableOpacity
            onPress={closePending}
            disabled={!vm.pending.closeEnabled}
            style={[styles.manageTouch, !vm.pending.closeEnabled && styles.dimmed]}
            accessibilityRole="button"
          >
            <Text style={[styles.manageText, { color: theme.text.secondary }]}>{t('plusSuccess.close')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.footer}>
          <PlusCta label={t('plusSuccess.cta')} onPress={goHome} colors={plusColors(theme, isDark)} />
          {!manageHidden && (
            <TouchableOpacity onPress={openManage} style={styles.manageTouch} accessibilityRole="button">
              <Text style={[styles.manageText, { color: theme.text.secondary }]}>{t('plusSuccess.manage')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  dimmed: { opacity: 0.5 },
});
