import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@src/store/authStore';
import { useSettingsStore, type ThemeMode, type AIMode } from '@src/store/settingsStore';
import { authApi } from '@src/api/auth';
import type { UserStats } from '@src/types/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function ProfileScreen() {
  const systemColorScheme = useColorScheme();
  const { user, logout } = useAuthStore();
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

  useEffect(() => {
    loadStats();
    loadSettings();
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

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('정말 로그아웃하시겠습니까?')) {
        logout();
        // _layout.tsx에서 isAuthenticated 변경 감지하여 자동 리디렉션
      }
    } else {
      Alert.alert(
        '로그아웃',
        '정말 로그아웃하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '로그아웃',
            style: 'destructive',
            onPress: () => {
              logout();
              // _layout.tsx에서 isAuthenticated 변경 감지하여 자동 리디렉션
            },
          },
        ]
      );
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
            {user?.oauth_provider === 'apple' ? 'Apple' : 'Google'} 계정
          </Text>
        </View>
      </View>

      {/* Statistics */}
      <View style={[styles.statsContainer, isDark && styles.cardDark]}>
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          통계
        </Text>
        {statsLoading ? (
          <View style={styles.statsLoading}>
            <ActivityIndicator size="small" color="#6366F1" />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatItem
              icon="images-outline"
              label="사진"
              value={stats?.total_photos?.toString() || '0'}
              isDark={isDark}
            />
            <StatItem
              icon="albums-outline"
              label="앨범"
              value={stats?.total_albums?.toString() || '0'}
              isDark={isDark}
            />
            <StatItem
              icon="layers-outline"
              label="그룹"
              value={stats?.total_groups?.toString() || '0'}
              isDark={isDark}
            />
            <StatItem
              icon="cloud-outline"
              label="저장 공간"
              value={stats?.storage_used_formatted || '0 B'}
              isDark={isDark}
            />
          </View>
        )}
      </View>

      {/* Settings */}
      <View style={[styles.settingsContainer, isDark && styles.cardDark]}>
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          설정
        </Text>

        <SettingsItem
          icon="notifications-outline"
          label="알림 설정"
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
          label="자동 업로드"
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
          label="AI 분석 모드"
          isDark={isDark}
          onPress={() => {
            const modes: AIMode[] = ['fast', 'precise'];
            const currentIndex = modes.indexOf(aiMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            setAIMode(nextMode);
          }}
          rightElement={
            <Text style={styles.settingValue}>
              {aiMode === 'fast' ? '빠름' : '정밀'}
            </Text>
          }
        />
        <SettingsItem
          icon="moon-outline"
          label="다크 모드"
          isDark={isDark}
          onPress={() => {
            const modes: ThemeMode[] = ['system', 'light', 'dark'];
            const currentIndex = modes.indexOf(themeMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            setThemeMode(nextMode);
          }}
          rightElement={
            <Text style={styles.settingValue}>
              {themeMode === 'system' ? '시스템' : themeMode === 'dark' ? '다크' : '라이트'}
            </Text>
          }
        />
        <SettingsItem
          icon="language-outline"
          label="언어"
          isDark={isDark}
          onPress={() => {
            // TODO: i18n 라이브러리 연동 필요
            if (Platform.OS === 'web') {
              window.alert('다국어 지원은 준비 중입니다.');
            } else {
              Alert.alert('준비 중', '다국어 지원은 준비 중입니다.');
            }
          }}
          rightElement={
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>준비 중</Text>
            </View>
          }
        />
      </View>

      {/* Support */}
      <View style={[styles.settingsContainer, isDark && styles.cardDark]}>
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          지원
        </Text>

        <SettingsItem
          icon="help-circle-outline"
          label="도움말"
          isDark={isDark}
          onPress={() => { }}
        />
        <SettingsItem
          icon="chatbubble-outline"
          label="문의하기"
          isDark={isDark}
          onPress={() => { }}
        />
        <SettingsItem
          icon="document-text-outline"
          label="이용약관"
          isDark={isDark}
          onPress={() => { }}
        />
        <SettingsItem
          icon="shield-outline"
          label="개인정보처리방침"
          isDark={isDark}
          onPress={() => { }}
        />
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.versionText}>버전 1.0.0</Text>
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
  toggleOn: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toggleText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '500',
  },
  comingSoonBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
  },
});
