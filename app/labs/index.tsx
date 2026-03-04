import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';

export default function LabsScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>{t('labs.title')}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        {/* Description */}
        <Text style={[styles.desc, isDark && { color: '#9CA3AF' }]}>{t('labs.desc')}</Text>

        {/* Menu */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => router.push('/labs/ai-classify')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="sparkles-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <View>
                <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('labs.aiClassify')}</Text>
                <Text style={styles.menuDesc}>{t('labs.aiClassifyDesc')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
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
    flex: 1,
    padding: 16,
  },
  desc: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  cardDark: {
    backgroundColor: '#1F2937',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    color: '#374151',
  },
  menuDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
