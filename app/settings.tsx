import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore, type ThemeMode, type AIMode } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';

export default function SettingsScreen() {
  const systemColorScheme = useColorScheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    themeMode,
    aiMode,
    notificationsEnabled,
    setThemeMode,
    setAIMode,
    setNotificationsEnabled,
  } = useSettingsStore();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Logo size={28} showText={false} color={isDark ? '#F9FAFB' : '#1F2937'} />
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>{t('settings.title')}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, isDark && styles.cardDark]}>
          {/* Push Notifications */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.pushNotification')}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#D1D5DB', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Dark Mode */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              const modes: ThemeMode[] = ['system', 'light', 'dark'];
              const currentIndex = modes.indexOf(themeMode);
              const nextMode = modes[(currentIndex + 1) % modes.length];
              setThemeMode(nextMode);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="moon-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.darkMode')}</Text>
            </View>
            <Text style={styles.settingValue}>
              {themeMode === 'system' ? t('settings.darkModeSystem') : themeMode === 'dark' ? t('settings.darkModeDark') : t('settings.darkModeLight')}
            </Text>
          </TouchableOpacity>

          {/* AI Analysis Mode */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              const modes: AIMode[] = ['fast', 'precise'];
              const currentIndex = modes.indexOf(aiMode);
              const nextMode = modes[(currentIndex + 1) % modes.length];
              setAIMode(nextMode);
            }}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="sparkles-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.aiMode')}</Text>
              </View>
              <Text style={styles.aiModeDesc}>
                {aiMode === 'fast' ? t('settings.aiModeFastDesc') : t('settings.aiModePreciseDesc')}
              </Text>
            </View>
            <Text style={styles.settingValue}>
              {aiMode === 'fast' ? t('settings.aiModeFast') : t('settings.aiModePrecise')}
            </Text>
          </TouchableOpacity>

          {/* Labs */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/labs')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="flask-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.labs')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* App Info */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/app-info')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.appInfo')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Language */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => router.push('/language-select')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="language-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.languageSelect')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  aiModeDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 34,
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
