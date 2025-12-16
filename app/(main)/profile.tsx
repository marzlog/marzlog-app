/**
 * Profile Screen
 *
 * User profile and settings
 */

import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAuthStore } from '@/store/authStore';
import { colors, spacing, textStyles, borderRadius } from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // Web doesn't have Alert.alert
      if (confirm('로그아웃 하시겠습니까?')) {
        logout();
        router.replace('/(auth)/onboarding');
      }
    } else {
      Alert.alert(
        '로그아웃',
        '로그아웃 하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '로그아웃',
            style: 'destructive',
            onPress: () => {
              logout();
              router.replace('/(auth)/onboarding');
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>프로필</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.email || 'Unknown'}</Text>
          <Text style={styles.userRole}>
            {user?.oauthProvider === 'google' ? 'Google 계정' : 'Apple 계정'}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <StatItem value="0" label="사진" />
          <View style={styles.statDivider} />
          <StatItem value="0" label="앨범" />
          <View style={styles.statDivider} />
          <StatItem value="0" label="검색" />
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem icon="⚙️" title="설정" />
          <MenuItem icon="📊" title="저장공간" subtitle="0 MB 사용 중" />
          <MenuItem icon="🔔" title="알림 설정" />
          <MenuItem icon="❓" title="도움말" />
          <MenuItem icon="📄" title="이용약관" />
          <MenuItem icon="🔒" title="개인정보처리방침" />
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>

        {/* App Version */}
        <Text style={styles.versionText}>MarZlog v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <Pressable style={styles.menuItem}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...textStyles.h2,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary[500],
  },
  userName: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  userRole: {
    ...textStyles.bodySmall,
    color: colors.text.tertiary,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  statValue: {
    ...textStyles.h3,
    color: colors.text.primary,
  },
  statLabel: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
  },
  menuSection: {
    marginHorizontal: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    ...textStyles.bodyMedium,
    color: colors.text.primary,
  },
  menuSubtitle: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  menuArrow: {
    fontSize: 20,
    color: colors.text.tertiary,
  },
  logoutButton: {
    marginHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.semantic.error,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoutText: {
    ...textStyles.buttonMedium,
    color: colors.semantic.error,
  },
  versionText: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
});
