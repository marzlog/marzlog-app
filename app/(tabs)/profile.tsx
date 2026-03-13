import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@src/store/authStore';
import { useSettingsStore } from '@src/store/settingsStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { authApi } from '@src/api/auth';
import type { UserStats } from '@src/types/auth';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useDialog } from '@/src/components/ui/Dialog';
import { Logo } from '@/src/components/common/Logo';
import { getErrorMessage } from '@/src/utils/errorMessages';
import { captureError } from '@/src/utils/sentry';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();
  const { t } = useTranslation();
  const { confirm } = useDialog();
  const { themeMode } = useSettingsStore();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  // 화면 복귀 시 최신 유저 정보 + 통계 새로고침
  useFocusEffect(
    useCallback(() => {
      const refreshUser = async () => {
        try {
          const freshUser = await authApi.getCurrentUser();
          setUser(freshUser);
        } catch (err) {
          // silently fail on refresh
        }
      };
      refreshUser();
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      const userStats = await authApi.getUserStats();
      setStats(userStats);
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'Profile.loadStats' });
      setStatsError(getErrorMessage(error));
    } finally {
      setStatsLoading(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: t('auth.logout'),
      description: t('auth.logoutConfirm'),
      confirmText: t('auth.logout'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });
    if (confirmed) {
      logout();
    }
  };

  const handleEditProfile = () => {
    router.push('/profile-edit');
  };

  const handleNotifications = () => {
    router.push('/notifications');
  };

  return (
    <View style={[styles.outerContainer, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Logo size={32} showText={false} color={isDark ? '#F9FAFB' : '#1F2937'} />
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>{t('profile.title')}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, isDark && styles.cardDark]}>
          <View style={[styles.avatar, isDark && styles.avatarDark, user?.avatar_url && styles.avatarWithImage]}>
            {user?.avatar_url ? (
              <Image
                key={user.avatar_url}
                source={{ uri: user.avatar_url }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          <Text style={[styles.userName, isDark && styles.textLight]}>
            {user?.nickname || user?.email?.split('@')[0] || 'User'}
          </Text>
          <Text style={styles.userEmail}>
            {user?.email || ''}
          </Text>
          <View style={[styles.providerBadge, isDark && { backgroundColor: '#374151' }]}>
            <Ionicons
              name={user?.oauth_provider === 'apple' ? 'logo-apple' : 'logo-google'}
              size={14}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
            <Text style={[styles.providerText, isDark && { color: '#9CA3AF' }]}>
              {user?.oauth_provider === 'apple' ? t('profile.appleAccount') : t('profile.googleAccount')}
            </Text>
          </View>
        </View>

        {/* Statistics */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
            {t('stats.title')}
          </Text>
          {statsLoading ? (
            <View style={styles.statsLoading}>
              <ActivityIndicator size="small" color="#8B5CF6" />
            </View>
          ) : statsError ? (
            <TouchableOpacity style={styles.statsLoading} onPress={loadStats} activeOpacity={0.7}>
              <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 13, textAlign: 'center' }}>
                {statsError}
              </Text>
              <Text style={{ color: '#6366F1', fontSize: 13, fontWeight: '500', marginTop: 4 }}>
                {t('error.tapToRetry')}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.statsGrid}>
                <StatItem icon="images-outline" label={t('stats.photos')} value={stats?.total_photos?.toString() || '0'} isDark={isDark} />
                <StatItem icon="albums-outline" label={t('stats.albums')} value={stats?.total_albums?.toString() || '0'} isDark={isDark} />
                <StatItem icon="layers-outline" label={t('stats.groups')} value={stats?.total_groups?.toString() || '0'} isDark={isDark} />
              </View>
              <StorageGauge
                usedFormatted={stats?.storage_used_formatted || '0 B'}
                limitFormatted={stats?.storage_limit_formatted || '5.0 GB'}
                usagePercent={stats?.storage_usage_percent || 0}
                plan={stats?.storage_plan || 'free'}
                isDark={isDark}
                onUpgrade={() => router.push('/plans')}
              />
            </>
          )}
        </View>

        {/* Menu */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <MenuItem
            icon="person-outline"
            label={t('profile.editProfile')}
            isDark={isDark}
            onPress={handleEditProfile}
          />
          <MenuItem
            icon="notifications-outline"
            label={t('profile.notifications')}
            isDark={isDark}
            onPress={handleNotifications}
            isLast
          />
        </View>

        {/* Logout */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="log-out-outline" size={22} color="#FF4444" />
              <Text style={styles.dangerText}>{t('auth.logout')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF4444" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function StorageGauge({ usedFormatted, limitFormatted, usagePercent, plan, isDark, onUpgrade }: {
  usedFormatted: string;
  limitFormatted: string;
  usagePercent: number;
  plan: string;
  isDark: boolean;
  onUpgrade: () => void;
}) {
  const { t } = useTranslation();
  const barColor = usagePercent >= 95 ? '#EF4444' : usagePercent >= 80 ? '#F59E0B' : '#8B5CF6';
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280' }}>
          {t('storage.title')}
        </Text>
        <Text style={{ fontSize: 13, color: isDark ? '#D1D5DB' : '#374151', fontWeight: '500' }}>
          {usedFormatted} / {limitFormatted}
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? '#2D3748' : '#E5E7EB' }}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: barColor, width: `${Math.min(usagePercent, 100)}%` }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: barColor, fontWeight: '500' }}>
          {t('storage.usagePercent', { percent: usagePercent })}
        </Text>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          onPress={onUpgrade}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
            {t('storage.currentPlan')}: {planLabel}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#8B5CF6" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatItem({ icon, label, value, isDark }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isDark: boolean;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={24} color="#6366F1" />
      <Text style={[styles.statValue, isDark && styles.textLight]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, isDark, onPress, isLast }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isDark: boolean;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, isLast && styles.menuItemLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
        <Text style={[styles.menuLabel, isDark && styles.textLight]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: '#1F2937',
  },
  textLight: {
    color: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  // Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  cardDark: {
    backgroundColor: '#1F2937',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarDark: {
    backgroundColor: '#4F46E5',
  },
  avatarWithImage: {
    overflow: 'hidden' as const,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  providerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    padding: 20,
    paddingBottom: 8,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 8,
  },
  statsLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Menu
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: '#374151',
  },
  dangerText: {
    fontSize: 16,
    color: '#FF4444',
    fontWeight: '500',
  },
});
