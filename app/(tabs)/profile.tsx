import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@src/store/authStore';
import React from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, logout } = useAuthStore();

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

  // Mock statistics
  const stats = {
    totalPhotos: 638,
    totalAlbums: 12,
    totalSearches: 156,
    storageUsed: '2.4 GB',
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
        <View style={styles.statsGrid}>
          <StatItem
            icon="images-outline"
            label="사진"
            value={stats.totalPhotos.toString()}
            isDark={isDark}
          />
          <StatItem
            icon="albums-outline"
            label="앨범"
            value={stats.totalAlbums.toString()}
            isDark={isDark}
          />
          <StatItem
            icon="search-outline"
            label="검색"
            value={stats.totalSearches.toString()}
            isDark={isDark}
          />
          <StatItem
            icon="cloud-outline"
            label="저장 공간"
            value={stats.storageUsed}
            isDark={isDark}
          />
        </View>
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
          onPress={() => { }}
        />
        <SettingsItem
          icon="cloud-upload-outline"
          label="자동 업로드"
          isDark={isDark}
          onPress={() => { }}
          rightElement={
            <View style={styles.toggleOn}>
              <Text style={styles.toggleText}>켜짐</Text>
            </View>
          }
        />
        <SettingsItem
          icon="sparkles-outline"
          label="AI 분석 모드"
          isDark={isDark}
          onPress={() => { }}
          rightElement={
            <Text style={styles.settingValue}>정밀</Text>
          }
        />
        <SettingsItem
          icon="moon-outline"
          label="다크 모드"
          isDark={isDark}
          onPress={() => { }}
          rightElement={
            <Text style={styles.settingValue}>시스템</Text>
          }
        />
        <SettingsItem
          icon="language-outline"
          label="언어"
          isDark={isDark}
          onPress={() => { }}
          rightElement={
            <Text style={styles.settingValue}>한국어</Text>
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
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
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
