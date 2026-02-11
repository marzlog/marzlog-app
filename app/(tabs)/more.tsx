import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useAuthStore } from '@/src/store/authStore';
import { useDialog } from '@/src/components/ui/Dialog';

export default function MoreScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const { logout } = useAuthStore();
  const { confirm } = useDialog();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

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

  const menuItems: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress?: () => void;
  }[] = [
    { icon: 'megaphone-outline', label: t('more.notices') },
    { icon: 'document-text-outline', label: t('support.terms') },
    { icon: 'shield-outline', label: t('support.privacy') },
    { icon: 'chatbubble-outline', label: t('more.feedback') },
  ];

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.textLight]}>{t('more.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Menu Items */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.menuLabel, isDark && styles.textLight]}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Version */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={[styles.menuItem, styles.menuItemLast]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('version')}</Text>
            </View>
            <Text style={styles.versionValue}>1.0.0</Text>
          </View>
        </View>

        {/* Logout */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              <Text style={styles.dangerText}>{t('auth.logout')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  textLight: {
    color: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
  },
  cardDark: {
    backgroundColor: '#1F2937',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  versionValue: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  dangerText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
});
