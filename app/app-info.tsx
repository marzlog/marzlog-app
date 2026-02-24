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
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';

export default function AppInfoScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const handleWithdraw = () => {
    router.push('/withdraw');
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Logo size={28} showText={false} color={isDark ? '#F9FAFB' : '#1F2937'} />
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>{t('more.appInfo')}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Menu */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications')} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="megaphone-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('more.notices')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => WebBrowser.openBrowserAsync('https://marzlog.com/terms')} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('support.terms')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => WebBrowser.openBrowserAsync('https://marzlog.com/privacy')} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('support.privacy')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Version */}
          <View style={[styles.menuItem, styles.menuItemLast]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('version')}</Text>
            </View>
            <Text style={styles.versionValue}>1.0.0</Text>
          </View>
        </View>

        {/* Withdraw */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={handleWithdraw}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-remove-outline" size={22} color="#FF4444" />
              <Text style={styles.dangerText}>{t('account.withdraw')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF4444" />
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
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
    paddingBottom: 40,
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
  versionValue: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  dangerText: {
    fontSize: 16,
    color: '#FF4444',
    fontWeight: '500',
  },
});
