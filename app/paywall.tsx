import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import { useAuthStore } from '@src/store/authStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { useDialog } from '@/src/components/ui/Dialog';
import { captureError } from '@/src/utils/sentry';
import {
  loadPaywallOffer,
  purchasePaywallPlan,
  restorePaywallPurchases,
  type PaywallOffer,
} from '@src/services/purchases';
import type { PaywallPlanKind } from '@src/services/paywallPackages';

/**
 * Plus 페이월 골격 — ★진입점 미연결(Build 34 트랙에서만 연결).
 *
 * ADR-2026-09-18-01 ②: Plus 표시 판정은 서버 user.plan 만 본다.
 * 구매/복원 성공은 /auth/me 재조회 트리거일 뿐 — SDK 결과로 Plus 를 단정하지 않는다.
 * (webhook Steps 3~5 이전에는 구매 후에도 서버 plan 이 free 로 남는 것이 정상)
 */
const PLAN_ORDER: PaywallPlanKind[] = ['monthly', 'annual'];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const { alert } = useDialog();
  const user = useAuthStore((s) => s.user);

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const isPlus = user?.plan === 'plus';

  const [offer, setOffer] = useState<PaywallOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadOffer = useCallback(async () => {
    setLoading(true);
    setOffer(await loadPaywallOffer());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isPlus) loadOffer();
  }, [isPlus, loadOffer]);

  /** 서버 재조회 후 여전히 Plus 가 아니면 안내만 한다(판정은 서버 몫). */
  const refreshFromServer = async (pendingMessage: string) => {
    try {
      const refreshed = await useAuthStore.getState().refreshUser();
      if (refreshed.plan !== 'plus') await alert(t('paywall.title'), pendingMessage);
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { context: 'Paywall.refreshUser' });
      await alert(t('paywall.title'), pendingMessage);
    }
  };

  const handlePurchase = async (kind: PaywallPlanKind) => {
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await purchasePaywallPlan(kind);
      if (outcome === 'completed') await refreshFromServer(t('paywall.processing'));
      else if (outcome === 'failed') await alert(t('paywall.title'), t('paywall.failed'));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (await restorePaywallPurchases()) await refreshFromServer(t('paywall.restoreChecked'));
      else await alert(t('paywall.title'), t('paywall.failed'));
    } finally {
      setBusy(false);
    }
  };

  const textColor = isDark ? '#F9FAFB' : '#1F2937';
  const subColor = isDark ? '#9CA3AF' : '#6B7280';

  const renderBody = () => {
    if (isPlus) {
      const until = user?.plan_expires_at ? new Date(user.plan_expires_at).toLocaleDateString() : null;
      return (
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>{t('paywall.active')}</Text>
          {until && <Text style={[styles.cardSub, { color: subColor }]}>{t('paywall.activeUntil', { date: until })}</Text>}
        </View>
      );
    }

    if (loading) {
      return <ActivityIndicator size="large" color="#8B5CF6" style={styles.loading} />;
    }

    if (!offer) {
      return (
        <View style={styles.center}>
          <Text style={[styles.cardSub, { color: subColor }]}>{t('paywall.unavailable')}</Text>
          <TouchableOpacity onPress={loadOffer} style={styles.linkButton}>
            <Text style={styles.linkText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {PLAN_ORDER.filter((kind) => offer[kind]).map((kind) => (
          <TouchableOpacity
            key={kind}
            style={[styles.card, styles.planRow, isDark && styles.cardDark, busy && styles.disabled]}
            onPress={() => handlePurchase(kind)}
            disabled={busy}
          >
            <Text style={[styles.cardTitle, { color: textColor }]}>{t(`paywall.${kind}`)}</Text>
            <Text style={[styles.price, { color: textColor }]}>{offer[kind]!.priceString}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={handleRestore} disabled={busy} style={styles.linkButton}>
          <Text style={[styles.linkText, busy && styles.disabled]}>{t('paywall.restore')}</Text>
        </TouchableOpacity>
        {busy && <ActivityIndicator color="#8B5CF6" />}
      </>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>{t('paywall.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.body}>{renderBody()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  containerDark: { backgroundColor: '#111827' },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '300' },
  body: { flex: 1, padding: 16, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
  cardDark: { backgroundColor: '#1F2937' },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '500' },
  cardSub: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  price: { fontSize: 16, fontWeight: '600' },
  loading: { marginTop: 40 },
  center: { alignItems: 'center', marginTop: 40 },
  linkButton: { alignSelf: 'center', paddingVertical: 12 },
  linkText: { color: '#8B5CF6', fontSize: 14 },
  disabled: { opacity: 0.5 },
});
