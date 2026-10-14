import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { addBreadcrumb, captureError, captureMessage } from '@/src/utils/sentry';
import { restorePaywallPurchases } from '@src/services/purchases';
import { formatLongDate } from '@src/utils/dateLocale';
import type { TextRef } from '@src/utils/paywallViewModel';
import {
  buildPlusSuccessVM,
  initialPendingPhase,
  parsePlusSuccessEntry,
  remainingRecheckMs,
  resolvePlusSuccessGuard,
  shouldPendingRecheck,
  type PlusPendingPhase,
} from '@src/utils/plusSuccessViewModel';
import { waitForPlusReflected } from '@src/utils/plusReflect';
import {
  PLUS_PENDING_RECHECK_INTERVAL_MS,
  PLUS_PENDING_RECHECK_MAX_MS,
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
 * plus 가 확인되면 반영 변형으로 바뀐다. 그 사이 5초마다 주기 재확인(앱이 앞에 있는 시간 기준 최대 2분, D5-b-4). 구매 복원은 결제 화면과 같은 규칙(PW-14) — 활성 구독 없으면 바로 안내,
 * 있으면 반영 확인(최대 30초). 미반영 warning(paywall-reflect-timeout)은 결제 화면이 이미 남겼다.
 * "구독 관리 보기"는 구독 화면으로 replace(D6-2) — 뒤로가기가 완료 화면·결제 화면으로 돌아가지 않는다.
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
  const [pendingPhase, setPendingPhaseState] = useState<PlusPendingPhase>(() => initialPendingPhase(fromRestore));
  // 주기 재확인 루프가 렌더를 기다리지 않고 단계를 읽도록 ref 에도 즉시 기록
  const phaseRef = useRef(pendingPhase);
  const setPendingPhase = useCallback((next: PlusPendingPhase) => {
    phaseRef.current = next;
    setPendingPhaseState(next);
  }, []);
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


  useEffect(() => {
    if (guard === 'go-home') router.replace('/(tabs)');
  }, [guard, router]);

  useEffect(() => {
    if (guard === 'render') addBreadcrumb('paywall', 'success', { variant: vm.variant });
  }, [guard, vm.variant]);

  // 반영 중: 주기 재확인(D5-b-4) + 앱 복귀 때마다 1회 재조회. 실패는 조용히(미반영 warning 은 결제 화면이 이미 남겼다)
  const pending = guard === 'render' && vm.variant === 'pending';
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const mountedRef = useRef(true);
  const appActiveRef = useRef(AppState.currentState === 'active');
  const recheckUsedMsRef = useRef(0);
  const recheckRunningRef = useRef(false);

  const refreshOnce = useCallback(async () => {
    try {
      await useAuthStore.getState().refreshUser();
    } catch {
      // 반영 대기 — 미반영 warning 은 결제 화면이 이미 남겼다
    }
  }, []);

  const recheckState = useCallback(
    () => ({
      mounted: mountedRef.current,
      pending: pendingRef.current,
      phase: phaseRef.current,
      appActive: appActiveRef.current,
      remainingMs: remainingRecheckMs(PLUS_PENDING_RECHECK_MAX_MS, recheckUsedMsRef.current),
    }),
    [],
  );

  /** 주기 재확인 — 이미 돌고 있거나 계속 조건이 아니면 false(시작 안 함). 첫 시도는 즉시 */
  const startRecheck = useCallback((): boolean => {
    if (recheckRunningRef.current || !shouldPendingRecheck(recheckState())) return false;
    recheckRunningRef.current = true;
    const startedAt = Date.now();
    waitForPlusReflected(
      async (timeoutMs) => (await useAuthStore.getState().refreshUser(timeoutMs)).plan === 'plus',
      {
        intervalMs: PLUS_PENDING_RECHECK_INTERVAL_MS,
        maxWaitMs: recheckState().remainingMs,
        attemptTimeoutMs: PLUS_REFLECT_ATTEMPT_TIMEOUT_MS,
        shouldContinue: () => shouldPendingRecheck(recheckState()),
      },
    ).finally(() => {
      recheckUsedMsRef.current += Date.now() - startedAt;
      recheckRunningRef.current = false;
    });
    return true;
  }, [recheckState]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 진입 시·복원이 끝난 뒤(restoring 이탈) 주기 재확인 시작. restoring 중에는 복원의 반영 확인 루프만 돈다
  useEffect(() => {
    if (pending && pendingPhase !== 'restoring') startRecheck();
  }, [pending, pendingPhase, startRecheck]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      appActiveRef.current = state === 'active';
      if (state !== 'active' || !pendingRef.current) return;
      // 남은 시간이 있으면 주기 재확인을 이어 간다(첫 시도가 곧 복귀 1회 재조회). 아니면 1회만
      if (!startRecheck()) refreshOnce();
    });
    return () => sub.remove();
  }, [refreshOnce, startRecheck]);

  const goHome = () => router.replace('/(tabs)');

  const closePending = () => {
    if (vm.pending?.closeEnabled) goHome();
  };

  // 반영 중 화면의 구매 복원 — 진행 중에는 버튼 스피너·닫기 잠금(주기 재확인은 restoring 동안 멈춘다).
  // 예상 밖 throw 에도 restoring 에 남지 않게 finally 에서 단계를 정한다(기본 restore-failed)
  const restoreFromPending = async () => {
    if (!vm.pending?.restore.enabled) return;
    setPendingPhase('restoring');
    let next: PlusPendingPhase = 'restore-failed';
    try {
      const restored = await restorePaywallPurchases(useAuthStore.getState().user?.id);
      addBreadcrumb('paywall', 'restore', { outcome: restored, source: 'plus-success' });
      if (restored === 'identity_mismatch') next = 'identity-mismatch';
      else if (restored === 'failed') next = 'restore-failed';
      else if (restored === 'restored-none') next = 'restore-none';
      else {
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
        next = reflected ? 'idle' : 'restore-checked';
      }
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { scope: 'plusSuccess.restore' });
      next = 'restore-failed';
    } finally {
      setPendingPhase(next);
    }
  };

  const openManage = () => router.replace('/subscription');

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
          <TouchableOpacity onPress={openManage} style={styles.manageTouch} accessibilityRole="button">
            <Text style={[styles.manageText, { color: theme.text.secondary }]}>{t('plusSuccess.manage')}</Text>
          </TouchableOpacity>
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
