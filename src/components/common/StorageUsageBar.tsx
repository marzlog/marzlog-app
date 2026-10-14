import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useStorageStore } from '@/src/store/storageStore';
import { useAuthStore } from '@/src/store/authStore';
import { PLAN_BADGE_KEYS, resolvePlanBadge } from '@/src/utils/planBadge';
import { formatBytes } from '@/src/utils/formatBytes';
import { AppTouchable } from './AppTouchable';

function getBarColor(percent: number): string {
  if (percent >= 90) return '#FF3B30';
  if (percent >= 70) return '#FF9500';
  return '#6366F1';
}

interface StorageUsageBarProps {
  isDark: boolean;
  /** 카드 전체 탭(D6-a 진입점 ①) — 주면 오른쪽 chevron 과 버튼 접근성이 붙는다 */
  onPress?: () => void;
}

export function StorageUsageBar({ isDark, onPress }: StorageUsageBarProps) {
  const { t } = useTranslation();
  const { storageUsage, isLoading } = useStorageStore();
  // 배지는 서버 /auth/me plan 기준(PW-1) — /users/storage 의 plan 은 쓰지 않는다
  const planKey = PLAN_BADGE_KEYS[resolvePlanBadge(useAuthStore((s) => s.user?.plan))];

  // 카드 전체를 누를 수 있게(로딩·조회 실패 중에도 진입 가능)
  const wrap = (children: React.ReactNode) =>
    onPress ? (
      <AppTouchable
        style={[styles.container, isDark && styles.containerDark]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${t('storage.title')}, ${t(planKey as any)}`}
      >
        {children}
      </AppTouchable>
    ) : (
      <View style={[styles.container, isDark && styles.containerDark]}>{children}</View>
    );

  const chevron = onPress ? (
    <Ionicons name="chevron-forward" size={18} color={isDark ? '#4B5563' : '#9CA3AF'} />
  ) : null;

  if (isLoading || !storageUsage) {
    return wrap(
      <View style={[styles.inner, styles.skeletonRow]}>
        {/* Skeleton */}
        <View style={styles.skeletonBody}>
          <View style={[styles.skeletonLine, isDark && styles.skeletonDark, { width: '40%' }]} />
          <View style={[styles.skeletonBar, isDark && styles.skeletonDark]} />
          <View style={[styles.skeletonLine, isDark && styles.skeletonDark, { width: '60%' }]} />
        </View>
        {chevron}
      </View>,
    );
  }

  const { used_bytes, limit_bytes, used_percentage } = storageUsage;
  const barColor = getBarColor(used_percentage);

  return wrap(
      <View style={styles.inner}>
        {/* Header: title + plan badge */}
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Ionicons name="cloud-outline" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text style={[styles.title, isDark && styles.textMuted]}>
              {t('storage.title')}
            </Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: barColor + '1A' }]}>
              <Text style={[styles.badgeText, { color: barColor }]}>
                {t(planKey as any)}
              </Text>
            </View>
            {chevron}
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.barTrack, isDark && styles.barTrackDark]}>
          <View
            style={[
              styles.barFill,
              { backgroundColor: barColor, width: `${Math.min(used_percentage, 100)}%` },
            ]}
          />
        </View>

        {/* Footer: usage text */}
        <View style={styles.footerRow}>
          <Text style={[styles.usageText, isDark && styles.textMuted]}>
            {t('storage.usagePercent', { percent: used_percentage })} — {formatBytes(used_bytes)} / {formatBytes(limit_bytes)}
          </Text>
        </View>
      </View>,
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 16,
  },
  containerDark: {
    backgroundColor: '#1A2332',
  },
  inner: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  textMuted: {
    color: '#9CA3AF',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  barTrackDark: {
    backgroundColor: '#2D3748',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    minWidth: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  usageText: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skeletonBody: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  skeletonBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
    width: '100%',
  },
  skeletonDark: {
    backgroundColor: '#2D3748',
  },
});

export default StorageUsageBar;
