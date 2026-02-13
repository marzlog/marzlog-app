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

export default function MoreScreen() {
  const systemColorScheme = useColorScheme();
  const { t, language, changeLanguage } = useTranslation();
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

  const handleAppInfo = () => {
    router.push('/app-info');
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Logo size={32} showText={false} color={isDark ? '#F9FAFB' : '#1F2937'} />
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>{t('more.title')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Settings */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          {/* 푸시 알림 설정 */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.notifications')}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#D1D5DB', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* 언어 선택 */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => changeLanguage(language === 'ko' ? 'en' : 'ko')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="language-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.language')}</Text>
            </View>
            <Text style={styles.settingValue}>
              {language === 'ko' ? t('settings.languageKo') : t('settings.languageEn')}
            </Text>
          </TouchableOpacity>

          {/* 다크 모드 */}
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

          {/* AI 분석 모드 */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => {
              const modes: AIMode[] = ['fast', 'precise'];
              const currentIndex = modes.indexOf(aiMode);
              const nextMode = modes[(currentIndex + 1) % modes.length];
              setAIMode(nextMode);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="sparkles-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.aiMode')}</Text>
            </View>
            <Text style={styles.settingValue}>
              {aiMode === 'fast' ? t('settings.aiModeFast') : t('settings.aiModePrecise')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={handleAppInfo}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('more.appInfo')}</Text>
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
  settingValue: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
