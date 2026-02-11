import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@src/store/authStore';
import { useSettingsStore, type ThemeMode, type AIMode } from '@src/store/settingsStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { authApi } from '@src/api/auth';
import type { UserStats } from '@src/types/auth';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from 'react-native';
import { useDialog } from '@/src/components/ui/Dialog';

export default function ProfileScreen() {
  const systemColorScheme = useColorScheme();
  const { user, deleteAccount } = useAuthStore();
  const { t, language, changeLanguage } = useTranslation();
  const { confirm } = useDialog();
  const {
    themeMode,
    autoUploadEnabled,
    aiMode,
    notificationsEnabled,
    setThemeMode,
    setAutoUploadEnabled,
    setAIMode,
    setNotificationsEnabled,
    loadSettings,
  } = useSettingsStore();

  // 다크모드 결정: themeMode가 'system'이면 시스템 설정, 아니면 직접 설정값 사용
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [cacheSize, setCacheSize] = useState<string>('0 B');
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    loadStats();
    loadSettings();
    loadCacheSize();
  }, []);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const userStats = await authApi.getUserStats();
      setStats(userStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadCacheSize = async () => {
    // Cache size calculation - placeholder for now
    // In a real implementation, calculate actual cache size
    setCacheSize('-- MB');
  };

  const handleClearCache = async () => {
    const confirmed = await confirm({
      title: t('storage.clearCache'),
      description: t('storage.clearCacheConfirm'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      variant: 'confirm',
    });

    if (confirmed) {
      setClearingCache(true);
      try {
        // Clear image cache, AsyncStorage cache, etc.
        // This is a placeholder - implement actual cache clearing logic
        await new Promise(resolve => setTimeout(resolve, 500));
        setCacheSize('0 B');
        Alert.alert(t('common.success'), t('storage.cacheCleared'));
      } catch (error) {
        console.error('Failed to clear cache:', error);
      } finally {
        setClearingCache(false);
      }
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      title: t('account.deleteAccount'),
      description: t('account.deleteAccountConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await deleteAccount();
      } catch {
        Alert.alert(t('common.error'), t('account.deleteAccountWarning'));
      }
    }
  };

  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, isDark && styles.cardDark]}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, isDark && styles.avatarDark]}>
            <Text style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        </View>
        <Text style={[styles.userName, isDark && styles.textLight]}>
          {user?.email?.split('@')[0] || 'User'}
        </Text>
        <Text style={styles.userEmail}>
          {user?.email || 'test@marzlog.com'}
        </Text>
        <View style={styles.providerBadge}>
          <Ionicons
            name={user?.oauth_provider === 'apple' ? 'logo-apple' : 'logo-google'}
            size={14}
            color="#6B7280"
          />
          <Text style={styles.providerText}>
            {user?.oauth_provider === 'apple' ? t('profile.appleAccount') : t('profile.googleAccount')}
          </Text>
        </View>
      </View>

      {/* Statistics */}
      <View style={[styles.statsContainer, isDark && styles.cardDark]}>
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          {t('stats.title')}
        </Text>
        {statsLoading ? (
          <View style={styles.statsLoading}>
            <ActivityIndicator size="small" color="#6366F1" />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatItem
              icon="images-outline"
              label={t('stats.photos')}
              value={stats?.total_photos?.toString() || '0'}
              isDark={isDark}
            />
            <StatItem
              icon="albums-outline"
              label={t('stats.albums')}
              value={stats?.total_albums?.toString() || '0'}
              isDark={isDark}
            />
            <StatItem
              icon="layers-outline"
              label={t('stats.groups')}
              value={stats?.total_groups?.toString() || '0'}
              isDark={isDark}
            />
            <StatItem
              icon="cloud-outline"
              label={t('stats.storage')}
              value={stats?.storage_used_formatted || '0 B'}
              isDark={isDark}
            />
          </View>
        )}
      </View>

      {/* Settings */}
      <View style={[styles.settingsContainer, isDark && styles.cardDark]}>
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          {t('settings.title')}
        </Text>

        <SettingsItem
          icon="notifications-outline"
          label={t('settings.notifications')}
          isDark={isDark}
          onPress={() => setNotificationsEnabled(!notificationsEnabled)}
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#D1D5DB', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <SettingsItem
          icon="cloud-upload-outline"
          label={t('settings.autoUpload')}
          isDark={isDark}
          onPress={() => setAutoUploadEnabled(!autoUploadEnabled)}
          rightElement={
            <Switch
              value={autoUploadEnabled}
              onValueChange={setAutoUploadEnabled}
              trackColor={{ false: '#D1D5DB', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <SettingsItem
          icon="sparkles-outline"
          label={t('settings.aiMode')}
          isDark={isDark}
          onPress={() => {
            const modes: AIMode[] = ['fast', 'precise'];
            const currentIndex = modes.indexOf(aiMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            setAIMode(nextMode);
          }}
          rightElement={
            <Text style={styles.settingValue}>
              {aiMode === 'fast' ? t('settings.aiModeFast') : t('settings.aiModePrecise')}
            </Text>
          }
        />
        <SettingsItem
          icon="moon-outline"
          label={t('settings.darkMode')}
          isDark={isDark}
          onPress={() => {
            const modes: ThemeMode[] = ['system', 'light', 'dark'];
            const currentIndex = modes.indexOf(themeMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            setThemeMode(nextMode);
          }}
          rightElement={
            <Text style={styles.settingValue}>
              {themeMode === 'system' ? t('settings.darkModeSystem') : themeMode === 'dark' ? t('settings.darkModeDark') : t('settings.darkModeLight')}
            </Text>
          }
        />
        <SettingsItem
          icon="language-outline"
          label={t('settings.language')}
          isDark={isDark}
          onPress={() => {
            changeLanguage(language === 'ko' ? 'en' : 'ko');
          }}
          rightElement={
            <Text style={styles.settingValue}>
              {language === 'ko' ? t('settings.languageKo') : t('settings.languageEn')}
            </Text>
          }
        />
      </View>

      {/* Storage */}
      <View style={[styles.settingsContainer, isDark && styles.cardDark]}>
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          {t('storage.title')}
        </Text>

        <SettingsItem
          icon="folder-outline"
          label={t('storage.cacheSize')}
          isDark={isDark}
          onPress={() => {}}
          rightElement={
            <Text style={styles.settingValue}>{cacheSize}</Text>
          }
        />
        <SettingsItem
          icon="trash-outline"
          label={t('storage.clearCache')}
          isDark={isDark}
          onPress={handleClearCache}
          rightElement={
            clearingCache ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )
          }
        />
      </View>

      {/* Account */}
      <View style={[styles.settingsContainer, isDark && styles.cardDark]}>
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          {t('account.title')}
        </Text>

        <TouchableOpacity
          style={[styles.settingsItem, styles.settingsItemLast]}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <View style={styles.settingsItemLeft}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
            <Text style={styles.dangerText}>{t('account.deleteAccount')}</Text>
          </View>
          <View style={styles.settingsItemRight}>
            <Ionicons name="chevron-forward" size={20} color="#EF4444" />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatItem({
  icon,
  label,
  value,
  isDark
}: {
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

function SettingsItem({
  icon,
  label,
  isDark,
  onPress,
  rightElement,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isDark: boolean;
  onPress: () => void;
  rightElement?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      activeOpacity={0.7}
      delayPressIn={100}
    >
      <View style={styles.settingsItemLeft}>
        <Ionicons name={icon} size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
        <Text style={[styles.settingsLabel, isDark && styles.textLight]}>{label}</Text>
      </View>
      <View style={styles.settingsItemRight}>
        {rightElement || <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
      </View>
    </TouchableOpacity>
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  cardDark: {
    backgroundColor: '#1F2937',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDark: {
    backgroundColor: '#4F46E5',
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
  textLight: {
    color: '#F9FAFB',
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
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsLoading: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  settingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsItemLast: {
    borderBottomWidth: 0,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsLabel: {
    fontSize: 16,
    color: '#374151',
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: '#9CA3AF',
    marginRight: 4,
  },
  dangerText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
  },
});
