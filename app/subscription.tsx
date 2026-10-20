import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import { useAuthStore } from '@src/store/authStore';
import { useStorageStore } from '@src/store/storageStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { usePlusRestore } from '@src/hooks/usePlusRestore';
import { useReturnHome } from '@src/hooks/useReturnHome';
import { useDialog } from '@/src/components/ui/Dialog';
import { PlusCta } from '@/src/components/plus/PlusCta';
import { plusColors } from '@/src/components/plus/plusColors';
import { addBreadcrumb, captureError } from '@/src/utils/sentry';
import { loadPaywallOffer, openSubscriptionManagement, type PaywallOfferResult } from '@src/services/purchases';
import { formatLongDate } from '@src/utils/dateLocale';
import { waitForPlusReflected } from '@src/utils/plusReflect';
import { parseRestoredParam, type TextRef } from '@src/utils/paywallViewModel';
import { buildSubscriptionVM, deviceStoreOf } from '@src/utils/subscriptionViewModel';
import {
  PLUS_REFLECT_ATTEMPT_TIMEOUT_MS,
  PLUS_REFLECT_INTERVAL_MS,
  PLUS_REFLECT_MAX_WAIT_MS,
} from '@src/constants/plus';
import { PRIVACY_URL, TERMS_URL } from '@src/constants/legal';
import { borderRadius, darkTheme, lightTheme, spacing, typography, type Theme } from '@src/theme';

/**
 * 설정 구독 화면 (PAYWALL 명세 §3.3, 시안 04-subscription-settings.png, D6-1).
 *
 * PW-1: 표시는 서버 /auth/me(plan·plan_status·plan_store·plan_expires_at)와 /users/storage 만 본다.
 * 상태별 표시는 buildSubscriptionVM(순수 함수)이 정하고, 여기서는 렌더·이동·기록만 한다.
 * 진입할 때마다 /auth/me·저장 공간을 다시 읽고, 무료일 때만 상품을 조회한다(Plus 카드 가격 줄).
 * 구매 복원은 결제 화면과 같은 흐름(usePlusRestore — 신원 대조 → PW-14 → 반영 확인).
 * 결제 화면 복원이 반영되면 ?restored=1 로 온다 → 상단에 subscription.restored 1회(D6-2). 이 화면의 복원도 같다.
 */
const MIN_TOUCH = 44;
const SOURCE = 'subscription';

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t, language } = useTranslation();
  const { alert } = useDialog();
  const user = useAuthStore((s) => s.user);
  const { storageUsage, isLoading: storageLoading, fetchStorageUsage } = useStorageStore();
  const runRestore = usePlusRestore(SOURCE);
  const returnHome = useReturnHome();

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const theme: Theme = isDark ? darkTheme : lightTheme;
  const accent = plusColors(theme, isDark);
  const isPlus = user?.plan === 'plus';

  const [offerResult, setOfferResult] = useState<PaywallOfferResult | null>(null);
  const [restoring, setRestoring] = useState(false);
  // "구매를 복원했어요" — 들어올 때 1회. 파라미터는 바로 지워 다시 들어와도 반복하지 않는다
  const restoredParam = useLocalSearchParams<{ restored?: string | string[] }>().restored;
  const [restoredNotice, setRestoredNotice] = useState(() => parseRestoredParam(restoredParam));
  useEffect(() => {
    if (parseRestoredParam(restoredParam)) router.setParams({ restored: undefined });
  }, [restoredParam, router]);

  const vm = buildSubscriptionVM({
    plan: user?.plan,
    planStatus: user?.plan_status,
    planStore: user?.plan_store,
    planExpiresAt: user?.plan_expires_at,
    deviceStore: deviceStoreOf(Platform.OS),
    offerResult,
    storage: storageLoading ? null : storageUsage,
    formatDate: (iso) => formatLongDate(iso, language),
  });
  const tx = (ref: TextRef) => t(ref.key, ref.params);

  useFocusEffect(
    useCallback(() => {
      addBreadcrumb('paywall', 'subscription', { plan: useAuthStore.getState().user?.plan === 'plus' ? 'plus' : 'free' });
      useAuthStore
        .getState()
        .refreshUser()
        .catch(() => {
          // 화면은 마지막으로 받은 /auth/me 로 그린다
        });
      fetchStorageUsage();
    }, [fetchStorageUsage]),
  );

  // 무료일 때만 상품 조회(Plus 카드 가격 줄). 실패는 가격 줄만 숨긴다
  useFocusEffect(
    useCallback(() => {
      if (isPlus) return;
      let alive = true;
      loadPaywallOffer().then((result) => {
        if (alive) setOfferResult(result);
      });
      return () => {
        alive = false;
      };
    }, [isPlus]),
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else returnHome();
  };

  const openPaywall = () => router.push({ pathname: '/paywall', params: { source: 'settings' } });

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    // B-PAYWALL-HANG: 안내 대화상자는 restoring(버튼 스피너)이 풀린 뒤에 — 대화상자가 안 떠도 화면이 잠기지 않게
    let notice: 'paywall.identityMismatch' | 'paywall.failed' | 'paywall.restoreNone' | 'paywall.restoreChecked' | null = null;
    try {
      const result = await runRestore({
        waitReflected: async () =>
          (
            await waitForPlusReflected(
              async (timeoutMs) => (await useAuthStore.getState().refreshUser(timeoutMs)).plan === 'plus',
              { intervalMs: PLUS_REFLECT_INTERVAL_MS, maxWaitMs: PLUS_REFLECT_MAX_WAIT_MS, attemptTimeoutMs: PLUS_REFLECT_ATTEMPT_TIMEOUT_MS },
            )
          ).reflected,
      });
      // reflected 는 /auth/me 가 plus 로 바뀌어 화면이 Plus 상태로 다시 그려진다 + 상단 안내
      if (result === 'reflected') setRestoredNotice(true);
      else if (result === 'identity_mismatch') notice = 'paywall.identityMismatch';
      else if (result === 'failed') notice = 'paywall.failed';
      else if (result === 'restored-none') notice = 'paywall.restoreNone';
      else if (result === 'not-reflected') notice = 'paywall.restoreChecked';
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { scope: 'subscription.restore' });
      notice = 'paywall.failed';
    } finally {
      setRestoring(false);
    }
    if (notice) await alert(t('subscription.title'), t(notice));
  };

  const handleManage = async () => {
    if ((await openSubscriptionManagement()) === 'unavailable') {
      await alert(t('subscription.title'), t('subscription.manageUnavailable'));
    }
  };

  const row = (label: string, onPress: () => void, opts: { last?: boolean; loading?: boolean; role?: 'button' | 'link' } = {}) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      disabled={opts.loading}
      accessibilityRole={opts.role ?? 'button'}
      accessibilityState={{ busy: !!opts.loading }}
      style={[styles.row, !opts.last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.light }]}
    >
      <Text style={[styles.rowLabel, { color: theme.text.primary }]}>{label}</Text>
      {opts.loading ? (
        <ActivityIndicator size="small" color={theme.text.secondary} />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.icon.secondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerTouch} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={28} color={theme.icon.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]} accessibilityRole="header">
          {t('subscription.title')}
        </Text>
        <View style={styles.headerTouch} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}>
        {restoredNotice && (
          <View
            style={[styles.notice, { backgroundColor: accent.selectedCardBackground }]}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            <Ionicons name="checkmark-circle" size={20} color={theme.text.primary} />
            <Text style={[styles.noticeText, { color: theme.text.primary }]}>{t('subscription.restored')}</Text>
          </View>
        )}
        {/* 현재 플랜 + 저장 공간 */}
        <View style={[styles.card, { backgroundColor: theme.surface.primary, borderColor: theme.border.light }]}>
          <View style={styles.planRow}>
            <Text style={[styles.cardLabel, { color: theme.text.secondary }]}>{t('subscription.currentPlan')}</Text>
            <Text style={[styles.planValue, { color: theme.text.primary }]}>{tx(vm.planLabel)}</Text>
          </View>
          {vm.statusLines.map((line) => (
            <Text key={line.key} style={[styles.statusLine, { color: theme.text.secondary }]}>
              {tx(line)}
            </Text>
          ))}
          {vm.storage && (
            <View style={styles.storageBlock}>
              <View style={styles.planRow}>
                <Text style={[styles.cardLabel, { color: theme.text.secondary }]}>{t('subscription.storage')}</Text>
                <Text style={[styles.storageValue, { color: theme.text.primary }]}>{tx(vm.storage.usage)}</Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: theme.border.light }]}>
                <View style={[styles.barFill, { backgroundColor: theme.text.primary, width: `${vm.storage.percent}%` }]} />
              </View>
            </View>
          )}
        </View>

        {/* 무료: Plus 카드 */}
        {vm.plusCard && (
          <View style={[styles.plusCard, { backgroundColor: accent.selectedCardBackground, borderColor: accent.selectedCardBorder }]}>
            <Text style={[styles.plusTitle, { color: theme.text.primary }]}>{tx(vm.plusCard.title)}</Text>
            <Text style={[styles.plusDesc, { color: theme.text.secondary }]}>{tx(vm.plusCard.description)}</Text>
            {vm.plusCard.priceLine && (
              <Text style={[styles.plusPrice, { color: theme.text.primary }]}>{tx(vm.plusCard.priceLine)}</Text>
            )}
            <PlusCta label={tx(vm.plusCard.cta)} onPress={openPaywall} colors={accent} />
          </View>
        )}

        {/* 행: 구매 복원 · 스토어에서 구독 관리 · 이용약관 · 개인정보처리방침 */}
        <View style={[styles.card, styles.rowsCard, { backgroundColor: theme.surface.primary, borderColor: theme.border.light }]}>
          {row(t('paywall.restore'), handleRestore, { loading: restoring })}
          {vm.manageVisible && row(t('subscription.manage'), handleManage)}
          {row(t('paywall.terms'), () => WebBrowser.openBrowserAsync(TERMS_URL), { role: 'link' })}
          {row(t('paywall.privacy'), () => WebBrowser.openBrowserAsync(PRIVACY_URL), { role: 'link', last: true })}
        </View>

        {vm.otherStore && (
          <Text style={[styles.note, { color: theme.text.secondary }]}>
            {t(vm.otherStore.key, { store: t(vm.otherStore.storeNameKey) })}
          </Text>
        )}
        <Text style={[styles.note, { color: theme.text.secondary }]}>{tx(vm.footnote)}</Text>
      </ScrollView>
    </View>
  );
}

// 글자 확대에서 잘리지 않게 고정 height 대신 minHeight·줄바꿈 허용
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  headerTouch: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.xs },
  headerTitle: { flexShrink: 1, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, textAlign: 'center' },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.base, gap: spacing.base },
  card: { borderWidth: 1, borderRadius: borderRadius.xl, padding: spacing.base, gap: spacing.sm },
  rowsCard: { paddingVertical: 0 },
  planRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardLabel: { fontSize: typography.fontSize.base },
  planValue: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  statusLine: { fontSize: typography.fontSize.sm, textAlign: 'right' },
  storageBlock: { gap: spacing.sm, marginTop: spacing.xs },
  storageValue: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium },
  barTrack: { height: 8, borderRadius: borderRadius.full, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: borderRadius.full, minWidth: 4 },
  plusCard: { borderWidth: 2, borderRadius: borderRadius.xl, padding: spacing.base, gap: spacing.sm },
  plusTitle: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold },
  plusDesc: { fontSize: typography.fontSize.base },
  plusPrice: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semiBold, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, gap: spacing.sm },
  rowLabel: { flexShrink: 1, fontSize: typography.fontSize.base },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: borderRadius.lg, padding: spacing.md },
  noticeText: { flexShrink: 1, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium },
  note: { fontSize: typography.fontSize.sm, lineHeight: typography.fontSize.sm * typography.lineHeight.normal },
});
