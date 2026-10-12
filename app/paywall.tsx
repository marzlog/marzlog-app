import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import { useAuthStore } from '@src/store/authStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { useDialog } from '@/src/components/ui/Dialog';
import { Logo } from '@/src/components/common/Logo';
import { addBreadcrumb, captureError, captureMessage } from '@/src/utils/sentry';
import {
  loadPaywallOffer,
  purchasePaywallPlan,
  restorePaywallPurchases,
  type PaywallOfferResult,
  type PaywallPlanKind,
} from '@src/services/purchases';
import {
  PAYWALL_COMPARE_STORAGE,
  PAYWALL_DEFAULT_PLAN,
  PAYWALL_SUBHEAD,
  buildPaywallVM,
  footerFitsWithDisclosure,
  normalizePaywallSource,
  shouldLoadOffer,
  type PaywallPlanVM,
  type TextRef,
} from '@src/utils/paywallViewModel';
import { waitForPlusReflected } from '@src/utils/plusReflect';
import { PLUS_REFLECT_RETRY_COUNT, PLUS_REFLECT_RETRY_INTERVAL_MS } from '@src/constants/plus';
import { PRIVACY_URL, TERMS_URL } from '@src/constants/legal';
import { borderRadius, darkTheme, lightTheme, palette, spacing, typography, type Theme } from '@src/theme';

/**
 * Marzlog Plus 결제 화면 (PAYWALL 명세 §3.1, 시안 01-paywall.png).
 *
 * ADR-2026-09-18-01 ②: Plus 표시 판정은 서버 user.plan 만 본다.
 * 구매/복원 성공은 /auth/me 재조회 트리거일 뿐 — SDK 결과로 Plus 를 단정하지 않는다.
 * 상태별 표시는 buildPaywallVM(순수 함수)이 정하고, 여기서는 렌더·이동·기록만 한다.
 *
 * D4 임시 처리(D5·D6 전): 구매 반영·복원 성공·이미 Plus 는 이 화면의 "이용 중" 카드로,
 * 결제 후 미반영은 기존 paywall.processing 안내로 대신한다(/plus-success·/subscription 은 D5·D6).
 */
const MIN_TOUCH = 44;

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const { alert } = useDialog();
  const params = useLocalSearchParams<{ source?: string | string[] }>();
  const source = normalizePaywallSource(params.source);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const theme: Theme = isDark ? darkTheme : lightTheme;
  const isPlus = user?.plan === 'plus';

  const [offerResult, setOfferResult] = useState<PaywallOfferResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PaywallPlanKind>(PAYWALL_DEFAULT_PLAN);
  const [busy, setBusy] = useState(false);
  // 조건 7: VM 의 locked(렌더 기준)와 별개로 핸들러에서도 중복 탭을 막는다(상태 반영 전 연타 대비)
  const busyRef = useRef(false);
  // 조건 1: 고지문까지 하단에 두되, 하단 영역이 화면 절반을 넘으면 고지문은 스크롤 끝으로 내린다
  const [disclosureInFooter, setDisclosureInFooter] = useState(true);

  const vm = buildPaywallVM({ isAuthenticated, isPlus, loading, offerResult, selected, busy });
  const tx = (ref: TextRef) => t(ref.key, ref.params);

  useEffect(() => {
    addBreadcrumb('paywall', 'view', { source });
  }, [source]);

  const loadOffer = useCallback(async () => {
    setLoading(true);
    const result = await loadPaywallOffer();
    addBreadcrumb('paywall', 'offer', { status: result.status });
    setOfferResult(result);
    setLoading(false);
  }, []);

  // 조건 3: 미인증(딥링크 진입 — 루트가 로그인으로 보낸다)·이미 Plus 면 조회하지 않는다
  const loadEnabled = shouldLoadOffer({ isAuthenticated, isPlus });
  useEffect(() => {
    if (loadEnabled) loadOffer();
  }, [loadEnabled, loadOffer]);

  // 글자 크기·화면 회전으로 높이가 바뀌면 다시 잰다
  useEffect(() => {
    setDisclosureInFooter(true);
  }, [windowHeight]);

  // 구매 중에는 화면이 닫히지 않게(Android 하드웨어 뒤로가기 포함) — 닫기 버튼도 비활성
  usePreventRemove(busy, () => {});

  const runLocked = async (task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await task();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handlePurchase = () =>
    runLocked(async () => {
      const kind = selected;
      addBreadcrumb('paywall', 'purchase', { kind, phase: 'start', source });
      const outcome = await purchasePaywallPlan(kind, source);
      addBreadcrumb('paywall', 'purchase', { kind, outcome, source });
      if (outcome === 'cancelled') return;
      if (outcome === 'failed') {
        // captureError(tags area·kind·source)는 purchasePaywallPlan 이 한 번 남겼다
        await alert(t('paywall.title'), t('paywall.failed'));
        return;
      }
      const { reflected } = await waitForPlusReflected(
        async () => (await useAuthStore.getState().refreshUser(PLUS_REFLECT_RETRY_INTERVAL_MS)).plan === 'plus',
        { count: PLUS_REFLECT_RETRY_COUNT, intervalMs: PLUS_REFLECT_RETRY_INTERVAL_MS },
      );
      if (!reflected) {
        captureMessage('paywall plus not reflected after purchase', { kind, source }, {
          level: 'warning',
          fingerprint: ['paywall-reflect-timeout'],
          tags: { area: 'paywall', kind, source },
        });
        // D4 임시: "반영 중" 변형 완료 화면(/plus-success)은 D5 — 그 전까지 기존 안내 유지
        await alert(t('paywall.title'), t('paywall.processing'));
      }
      // 반영되면 user.plan === 'plus' → "이용 중" 카드(D5 에서 /plus-success 로 replace)
    });

  const handleRestore = () =>
    runLocked(async () => {
      if (!(await restorePaywallPurchases())) {
        await alert(t('paywall.title'), t('paywall.failed'));
        return;
      }
      try {
        const refreshed = await useAuthStore.getState().refreshUser();
        // plus 면 "이용 중" 카드(D6 에서 /subscription 으로 replace)
        if (refreshed.plan === 'plus') return;
        await alert(t('paywall.title'), t('paywall.restoreNone'));
      } catch (e) {
        captureError(e instanceof Error ? e : new Error(String(e)), { context: 'Paywall.restore.refreshUser' });
        await alert(t('paywall.title'), t('paywall.restoreChecked'));
      }
    });

  const handleClose = () => {
    if (!vm.header.closeEnabled) return;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const onFooterLayout = (e: LayoutChangeEvent) => {
    if (disclosureInFooter && !footerFitsWithDisclosure(e.nativeEvent.layout.height, windowHeight)) {
      setDisclosureInFooter(false);
    }
  };

  const body = vm.body;
  const ready = body.kind === 'ready' ? body : null;

  const renderDisclosure = () =>
    ready ? (
      <View style={styles.disclosureBlock}>
        {ready.noChargeToday && (
          <Text style={[styles.noCharge, { color: theme.text.primary }]}>{t('paywall.noChargeToday')}</Text>
        )}
        <Text style={[styles.disclosure, { color: theme.text.secondary }]}>{tx(ready.disclosure)}</Text>
        <View style={styles.links}>
          <TouchableOpacity
            style={styles.linkTouch}
            onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}
            accessibilityRole="link"
          >
            <Text style={[styles.linkText, { color: theme.text.secondary }]}>{t('paywall.terms')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkTouch}
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
            accessibilityRole="link"
          >
            <Text style={[styles.linkText, { color: theme.text.secondary }]}>{t('paywall.privacy')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null;

  const renderPlan = (plan: PaywallPlanVM, locked: boolean) => (
    <TouchableOpacity
      key={plan.kind}
      onPress={() => setSelected(plan.kind)}
      disabled={locked}
      accessibilityRole="radio"
      accessibilityState={{ selected: plan.selected, disabled: locked }}
      style={[
        styles.planCard,
        {
          backgroundColor: plan.selected ? theme.primary.background : theme.surface.primary,
          borderColor: plan.selected ? theme.primary.default : theme.border.default,
        },
        locked && styles.dimmed,
      ]}
    >
      <View
        style={[
          styles.radio,
          plan.selected
            ? { backgroundColor: theme.primary.default, borderColor: theme.primary.default }
            : { borderColor: theme.border.strong },
        ]}
      >
        {plan.selected && <Ionicons name="checkmark" size={16} color={palette.neutral[0]} />}
      </View>
      <View style={styles.planMain}>
        <View style={styles.planTitleRow}>
          <Text style={[styles.planTitle, { color: theme.text.primary }]}>{tx(plan.title)}</Text>
          {plan.discount && (
            <View style={[styles.badge, { backgroundColor: theme.text.primary }]}>
              <Text style={[styles.badgeText, { color: theme.text.inverse }]}>{tx(plan.discount)}</Text>
            </View>
          )}
        </View>
        {plan.perMonth && <Text style={[styles.planSub, { color: theme.text.secondary }]}>{tx(plan.perMonth)}</Text>}
      </View>
      <Text style={[styles.planPrice, { color: theme.text.primary }]}>
        {plan.price}
        <Text style={[styles.planPeriod, { color: theme.text.secondary }]}> {tx(plan.period)}</Text>
      </Text>
    </TouchableOpacity>
  );

  const renderStateBody = () => {
    switch (body.kind) {
      case 'unauthenticated':
        return null;
      case 'already-plus': {
        const until = user?.plan_expires_at ? new Date(user.plan_expires_at).toLocaleDateString() : null;
        return (
          <View style={[styles.card, { backgroundColor: theme.surface.primary, borderColor: theme.border.light }]}>
            <Text style={[styles.planTitle, { color: theme.text.primary }]}>{t('paywall.active')}</Text>
            {until && (
              <Text style={[styles.planSub, { color: theme.text.secondary }]}>{t('paywall.activeUntil', { date: until })}</Text>
            )}
          </View>
        );
      }
      case 'loading':
        return <ActivityIndicator size="large" color={theme.primary.default} style={styles.stateBox} />;
      case 'unavailable':
      case 'load-failed':
        return (
          <View style={styles.stateBox}>
            <Text style={[styles.stateText, { color: theme.text.secondary }]}>{tx(body.message)}</Text>
            <TouchableOpacity onPress={loadOffer} style={styles.linkTouch} accessibilityRole="button">
              <Text style={[styles.retryText, { color: theme.primary.default }]}>{t('paywall.retry')}</Text>
            </TouchableOpacity>
          </View>
        );
      case 'ready':
        return <View style={styles.plans}>{body.plans.map((plan) => renderPlan(plan, body.locked))}</View>;
    }
  };

  const check = <Ionicons name="checkmark" size={20} color={theme.icon.primary} />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary, paddingTop: insets.top }]}>
      <Stack.Screen options={{ gestureEnabled: !busy }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleClose}
          disabled={!vm.header.closeEnabled}
          style={[styles.headerTouch, !vm.header.closeEnabled && styles.dimmed]}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.close')}
        >
          <Ionicons name="close" size={28} color={theme.icon.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleRestore}
          disabled={!vm.header.restoreEnabled}
          style={[styles.headerTouch, styles.headerRight, !vm.header.restoreEnabled && styles.dimmed]}
          accessibilityRole="button"
        >
          <Text style={[styles.restoreText, { color: theme.text.secondary }]}>{t('paywall.restore')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brandRow}>
          <Logo iconOnly size={32} color={theme.text.primary} />
          <Text style={[styles.brand, { color: theme.text.primary }]}>{t('paywall.brand')}</Text>
        </View>
        <Text style={[styles.headline, { color: theme.text.primary }]}>{t('paywall.headline')}</Text>
        <Text style={[styles.subhead, { color: theme.text.secondary }]}>{tx(PAYWALL_SUBHEAD)}</Text>

        <View style={[styles.card, { backgroundColor: theme.surface.primary, borderColor: theme.border.light }]}>
          <View style={[styles.compareRow, { borderBottomColor: theme.border.light }]}>
            <View style={styles.compareLabel} />
            <Text style={[styles.compareHead, styles.colFree, { color: theme.text.secondary }]}>{t('paywall.compare.free')}</Text>
            <Text style={[styles.compareHead, styles.colPlus, styles.strong, { color: theme.text.primary }]}>{t('paywall.compare.plus')}</Text>
          </View>
          <View style={[styles.compareRow, { borderBottomColor: theme.border.light }]}>
            <Text style={[styles.compareLabel, { color: theme.text.primary }]}>{t('paywall.compare.diaryWrite')}</Text>
            <View style={[styles.compareCell, styles.colFree]}>{check}</View>
            <View style={[styles.compareCell, styles.colPlus]}>{check}</View>
          </View>
          <View style={[styles.compareRow, { borderBottomColor: theme.border.light }]}>
            <Text style={[styles.compareLabel, { color: theme.text.primary }]}>{t('paywall.compare.diaryRegen')}</Text>
            <Text style={[styles.compareCellText, styles.colFree, { color: theme.text.secondary }]}>–</Text>
            <Text style={[styles.compareCellText, styles.colPlus, styles.strong, { color: theme.text.primary }]}>
              {t('paywall.compare.unlimited')}
            </Text>
          </View>
          <View style={[styles.compareRow, styles.compareRowLast]}>
            <Text style={[styles.compareLabel, { color: theme.text.primary }]}>{t('paywall.compare.storage')}</Text>
            <Text style={[styles.compareCellText, styles.colFree, { color: theme.text.secondary }]}>{tx(PAYWALL_COMPARE_STORAGE.free)}</Text>
            <Text style={[styles.compareCellText, styles.colPlus, styles.strong, { color: theme.text.primary }]}>
              {tx(PAYWALL_COMPARE_STORAGE.plus)}
            </Text>
          </View>
        </View>

        {renderStateBody()}

        {ready && !disclosureInFooter && renderDisclosure()}
      </ScrollView>

      {ready && (
        <View
          onLayout={onFooterLayout}
          style={[styles.footer, { paddingBottom: insets.bottom + spacing.base, backgroundColor: theme.background.primary }]}
        >
          <TouchableOpacity
            onPress={handlePurchase}
            disabled={ready.locked}
            accessibilityRole="button"
            accessibilityState={{ disabled: ready.locked, busy: ready.locked }}
            style={[styles.cta, { backgroundColor: ready.locked ? theme.primary.disabled : theme.primary.default }]}
          >
            {ready.locked ? (
              <ActivityIndicator color={palette.neutral[0]} />
            ) : (
              <Text style={[styles.ctaText, { color: palette.neutral[0] }]}>{tx(ready.cta)}</Text>
            )}
          </TouchableOpacity>
          {disclosureInFooter && renderDisclosure()}
        </View>
      )}
    </View>
  );
}

// 조건 2: 글자 확대(fontScale 1.3 등)에서 잘리지 않게 고정 height 대신 minHeight·줄바꿈 허용
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  headerTouch: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.sm },
  headerRight: { alignItems: 'flex-end' },
  restoreText: { fontSize: typography.fontSize.base },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.base },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  brand: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semiBold },
  headline: { fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold },
  subhead: { fontSize: typography.fontSize.base },
  card: { borderWidth: 1, borderRadius: borderRadius.xl, paddingHorizontal: spacing.base, paddingVertical: spacing.xs },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compareRowLast: { borderBottomWidth: 0 },
  compareLabel: { flex: 1, fontSize: typography.fontSize.base },
  compareHead: { textAlign: 'center', fontSize: typography.fontSize.sm },
  compareCell: { alignItems: 'center' },
  compareCellText: { textAlign: 'center', fontSize: typography.fontSize.base },
  // 열 너비는 최소값만 — 긴 문구(en "Unlimited", vi "Không giới hạn")는 열이 넓어지고 단어 중간에서 끊기지 않는다
  // (RN 기본 flexShrink 0 + 단어 단위 줄바꿈. 남는 폭은 항목 열(flex 1)이 줄어 맞춘다)
  colFree: { minWidth: 64 },
  colPlus: { minWidth: 104 },
  strong: { fontWeight: typography.fontWeight.bold },
  plans: { gap: spacing.md },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    minHeight: 64,
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planMain: { flex: 1, minWidth: 120, gap: spacing.xs },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  planTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  planSub: { fontSize: typography.fontSize.sm },
  badge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semiBold },
  planPrice: { flexShrink: 1, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  planPeriod: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.regular },
  stateBox: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  stateText: { fontSize: typography.fontSize.base, textAlign: 'center' },
  retryText: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semiBold },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  cta: {
    minHeight: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  ctaText: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, textAlign: 'center' },
  disclosureBlock: { gap: spacing.sm },
  noCharge: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semiBold, textAlign: 'center' },
  disclosure: { fontSize: typography.fontSize.xs, lineHeight: typography.fontSize.xs * typography.lineHeight.normal },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.lg },
  linkTouch: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.xs },
  linkText: { fontSize: typography.fontSize.sm, textDecorationLine: 'underline' },
  dimmed: { opacity: 0.5 },
});
