import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useStorageStore } from '@/src/store/storageStore';
import { AppTouchable } from './AppTouchable';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getBarColor(percent: number): string {
  if (percent >= 90) return '#FF3B30';
  if (percent >= 70) return '#FF9500';
  return '#6366F1';
}

const PLAN_KEYS: Record<string, string> = {
  free: 'storage.planFree',
  basic: 'storage.planBasic',
  pro: 'storage.planPro',
  unlimited: 'storage.planUnlimited',
};

interface StorageUsageBarProps {
  isDark: boolean;
  onUpgrade?: () => void;
}

export function StorageUsageBar({ isDark, onUpgrade }: StorageUsageBarProps) {
  const { t } = useTranslation();
  const { storageUsage, isLoading } = useStorageStore();

  if (isLoading || !storageUsage) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.inner}>
          {/* Skeleton */}
          <View style={[styles.skeletonLine, isDark && styles.skeletonDark, { width: '40%' }]} />
          <View style={[styles.skeletonBar, isDark && styles.skeletonDark]} />
          <View style={[styles.skeletonLine, isDark && styles.skeletonDark, { width: '60%' }]} />
        </View>
      </View>
    );
  }

  const { used_bytes, limit_bytes, used_percentage, plan } = storageUsage;
  const barColor = getBarColor(used_percentage);
  const planKey = PLAN_KEYS[plan] || PLAN_KEYS.free;

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.inner}>
        {/* Header: title + plan badge */}
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Ionicons name="cloud-outline" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text style={[styles.title, isDark && styles.textMuted]}>
              {t('storage.title')}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: barColor + '1A' }]}>
            <Text style={[styles.badgeText, { color: barColor }]}>
              {t(planKey as any)}
            </Text>
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

        {/* Footer: usage text + upgrade */}
        <View style={styles.footerRow}>
          <Text style={[styles.usageText, isDark && styles.textMuted]}>
            {t('storage.usagePercent', { percent: used_percentage })} — {formatBytes(used_bytes)} / {formatBytes(limit_bytes)}
          </Text>
          {onUpgrade && (
            <AppTouchable
              style={styles.upgradeBtn}
              onPress={onUpgrade}
            >
              <Text style={styles.upgradeText}>{t('storage.upgrade')}</Text>
              <Ionicons name="chevron-forward" size={14} color="#6366F1" />
            </AppTouchable>
          )}
        </View>
      </View>
    </View>
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
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  upgradeText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  // Skeleton
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
