import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useStorageStore } from '@/src/store/storageStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';
import { StorageUsageBar } from '@/src/components/common/StorageUsageBar';
import { AppTouchable } from '@/src/components/common/AppTouchable';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'home-outline', labelKey: 'more.home', route: '/(tabs)/' },
  { icon: 'images-outline', labelKey: 'more.album', route: '/(tabs)/timeline' },
  { icon: 'bookmark-outline', labelKey: 'more.bookmarks', route: '/bookmarks' },
  { icon: 'person-outline', labelKey: 'more.profile', route: '/(tabs)/profile' },
  { icon: 'settings-outline', labelKey: 'more.settings', route: '/settings' },
];

const appVersion = Constants.expoConfig?.version || '1.0.0';

export default function MoreScreen() {
  const systemColorScheme = useColorScheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeMode } = useSettingsStore();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const { fetchStorageUsage } = useStorageStore();

  useFocusEffect(
    useCallback(() => {
      fetchStorageUsage();
    }, [])
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Logo size={32} showText={false} color={isDark ? '#F9FAFB' : '#1F2937'} />
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>{t('more.title')}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <StorageUsageBar isDark={isDark} onUpgrade={() => router.push('/plans' as any)} />
        <View style={[styles.card, isDark && styles.cardDark]}>
          {MENU_ITEMS.map((item, index) => (
            <AppTouchable
              key={item.route}
              style={[
                styles.menuItem,
                { borderBottomColor: isDark ? '#2D3748' : '#E5E7EB' },
                index === MENU_ITEMS.length - 1 && styles.menuItemLast,
              ]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t(item.labelKey as any)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#4B5563' : '#9CA3AF'} />
            </AppTouchable>
          ))}
        </View>
      </View>

      {/* Version at bottom */}
      <View style={styles.versionArea}>
        <Text style={[styles.versionText, isDark && styles.versionTextDark]}>
          MarZlog v{appVersion}
        </Text>
      </View>
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
  content: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  cardDark: {
    backgroundColor: '#1A2332',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    fontSize: 15,
    color: '#374151',
  },
  versionArea: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  versionTextDark: {
    color: '#4B5563',
  },
});
