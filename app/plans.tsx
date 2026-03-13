import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { storageApi } from '@src/api/storage';
import type { StorageInfo, PlanInfo } from '@src/api/storage';
import { captureError } from '@/src/utils/sentry';

const PLAN_ORDER = ['free', 'basic', 'pro', 'unlimited'];

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['featureStorage', 'featureAI', 'featureSearch'],
  basic: ['featureStorage', 'featureAI', 'featureSearch', 'featureOCR'],
  pro: ['featureStorage', 'featureAI', 'featureSearch', 'featureOCR', 'featurePriority'],
  unlimited: ['featureStorage', 'featureAI', 'featureSearch', 'featureOCR', 'featurePriority', 'featureSupport'],
};

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [storage, planList] = await Promise.all([
        storageApi.getStorageInfo(),
        storageApi.getPlans(),
      ]);
      setStorageInfo(storage);
      setPlans(planList.sort((a, b) => PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan)));
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'Plans.loadData' });
    } finally {
      setLoading(false);
    }
  };

  const barColor = (storageInfo?.usage_percent ?? 0) >= 95
    ? '#EF4444'
    : (storageInfo?.usage_percent ?? 0) >= 80
      ? '#F59E0B'
      : '#8B5CF6';

  if (loading) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
        <Header isDark={isDark} onBack={() => router.back()} title={t('plans.title')} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      <Header isDark={isDark} onBack={() => router.back()} title={t('plans.title')} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Usage Summary */}
        {storageInfo && (
          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.cardTitle, isDark && styles.textLight]}>
              {t('plans.usageSummary')}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={[styles.usageText, isDark && { color: '#D1D5DB' }]}>
                {storageInfo.used_formatted} / {storageInfo.limit_formatted}
              </Text>
              <Text style={{ fontSize: 13, color: barColor, fontWeight: '600' }}>
                {t('storage.usagePercent', { percent: storageInfo.usage_percent })}
              </Text>
            </View>
            <View style={[styles.barBg, isDark && { backgroundColor: '#2D3748' }]}>
              <View style={[styles.barFill, { backgroundColor: barColor, width: `${Math.min(storageInfo.usage_percent, 100)}%` }]} />
            </View>
          </View>
        )}

        {/* Plan Cards */}
        {plans.map((plan) => {
          const isCurrent = storageInfo?.plan === plan.plan;
          const currentIdx = PLAN_ORDER.indexOf(storageInfo?.plan || 'free');
          const planIdx = PLAN_ORDER.indexOf(plan.plan);
          const canUpgrade = planIdx > currentIdx;
          const features = PLAN_FEATURES[plan.plan] || [];

          return (
            <View
              key={plan.plan}
              style={[
                styles.planCard,
                isDark && styles.cardDark,
                isCurrent && styles.planCardCurrent,
                isCurrent && isDark && { borderColor: '#8B5CF6' },
              ]}
            >
              <View style={styles.planHeader}>
                <View>
                  <Text style={[styles.planName, isDark && styles.textLight]}>
                    {plan.name}
                  </Text>
                  <Text style={[styles.planCapacity, isDark && { color: '#9CA3AF' }]}>
                    {plan.limit_formatted}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {plan.price_krw > 0 ? (
                    <>
                      <Text style={[styles.planPrice, isDark && styles.textLight]}>
                        ₩{plan.price_krw.toLocaleString()}
                      </Text>
                      <Text style={[styles.planPeriod, isDark && { color: '#9CA3AF' }]}>
                        /{t('plans.monthly')}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.planPrice, isDark && styles.textLight]}>
                      {t('storage.planFree')}
                    </Text>
                  )}
                </View>
              </View>

              {/* Features */}
              <View style={styles.featureList}>
                {features.map((featureKey) => (
                  <View key={featureKey} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#8B5CF6" />
                    <Text style={[styles.featureText, isDark && { color: '#D1D5DB' }]}>
                      {featureKey === 'featureStorage'
                        ? t(`plans.${featureKey}`, { gb: plan.limit_formatted })
                        : t(`plans.${featureKey}`)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Button */}
              {isCurrent ? (
                <View style={[styles.currentBadge, isDark && { backgroundColor: '#374151' }]}>
                  <Ionicons name="checkmark" size={16} color="#8B5CF6" />
                  <Text style={{ color: '#8B5CF6', fontWeight: '600', fontSize: 14 }}>
                    {t('plans.currentPlanBadge')}
                  </Text>
                </View>
              ) : canUpgrade ? (
                <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.8}>
                  <Text style={styles.upgradeBtnText}>{t('plans.upgrade')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}

        {/* Coming Soon Notice */}
        <View style={[styles.notice, isDark && { backgroundColor: '#1A2332' }]}>
          <Ionicons name="information-circle-outline" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text style={[styles.noticeText, isDark && { color: '#9CA3AF' }]}>
            {t('plans.comingSoon')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Header({ isDark, onBack, title }: { isDark: boolean; onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, isDark && { color: '#F9FAFB' }]}>{title}</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: '#1F2937',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardDark: {
    backgroundColor: '#1F2937',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  textLight: {
    color: '#F9FAFB',
  },
  usageText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  barBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
  // Plan cards
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  planCardCurrent: {
    borderColor: '#8B5CF6',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  planCapacity: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  planPeriod: {
    fontSize: 12,
    color: '#6B7280',
  },
  featureList: {
    gap: 8,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    height: 44,
  },
  upgradeBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  noticeText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
});
