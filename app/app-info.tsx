import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';
import { AiNotice } from '@/src/components/common/AiNotice';

// Native-only: expo-alternate-app-icons crashes on web
let nativeGetAppIconName: (() => string | null) | undefined;
let nativeSetAlternateAppIcon: ((name: string | null) => Promise<string | null>) | undefined;
let nativeSupportsAlternateIcons = false;

if (Platform.OS !== 'web') {
  const mod = require('expo-alternate-app-icons');
  nativeGetAppIconName = mod.getAppIconName;
  nativeSetAlternateAppIcon = mod.setAlternateAppIcon;
  nativeSupportsAlternateIcons = mod.supportsAlternateIcons;
}

const APP_ICONS = [
  {
    key: null as string | null,
    labelKey: 'appInfo.iconDefault',
    image: require('@/assets/images/app-icons/default.png'),
  },
  {
    key: 'coral',
    labelKey: 'appInfo.iconCoral',
    image: require('@/assets/images/app-icons/coral.png'),
  },
  {
    key: 'red',
    labelKey: 'appInfo.iconRed',
    image: require('@/assets/images/app-icons/red.png'),
  },
];

export default function AppInfoScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const [currentIcon, setCurrentIcon] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        const mod = require('expo-alternate-app-icons');
        console.log('=== APP ICON DEBUG ===');
        console.log('Platform.OS:', Platform.OS);
        console.log('supportsAlternateIcons:', mod.supportsAlternateIcons);
        console.log('getAppIconName:', mod.getAppIconName?.());
        console.log('typeof setAlternateAppIcon:', typeof mod.setAlternateAppIcon);
        console.log('module keys:', Object.keys(mod));

        if (nativeGetAppIconName) {
          setCurrentIcon(nativeGetAppIconName());
        }
        setIsSupported(nativeSupportsAlternateIcons);
      } catch (e) {
        console.log('expo-alternate-app-icons error:', e);
      }
    }
  }, []);

  const handleChangeIcon = async (iconKey: string | null) => {
    console.log('=== CHANGE ICON ===');
    console.log('iconKey:', iconKey, 'Platform.OS:', Platform.OS, 'isSupported:', isSupported);

    if (Platform.OS === 'web') {
      window.alert(`${t('appInfo.iconNotSupported')}\n${t('appInfo.iconNotSupportedDesc')}`);
      return;
    }

    // Always update UI selection
    setCurrentIcon(iconKey);

    if (!nativeSetAlternateAppIcon) {
      Alert.alert(t('appInfo.iconNotSupported'), t('appInfo.iconNotSupportedDesc'));
      return;
    }

    try {
      console.log('Calling setAlternateAppIcon...');
      await nativeSetAlternateAppIcon(iconKey);
      console.log('Icon changed successfully!');
    } catch (e: any) {
      console.log('setAlternateAppIcon error:', e);
      if (!isSupported) {
        Alert.alert(t('appInfo.iconNotSupported'), t('appInfo.iconNotSupportedDesc'));
      }
    }
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
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>{t('appInfo.title')}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Terms & Policies Section */}
        <Text style={[styles.sectionTitle, isDark && { color: '#9CA3AF' }]}>{t('appInfo.termsSection')}</Text>
        <View style={[styles.card, isDark && styles.cardDark]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => WebBrowser.openBrowserAsync('https://marzlog.com/terms')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('appInfo.terms')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => WebBrowser.openBrowserAsync('https://marzlog.com/privacy')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-outline" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('appInfo.privacy')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* App Icon Section — iOS only */}
        {Platform.OS === 'ios' && (
          <>
            <Text style={[styles.sectionTitle, isDark && { color: '#9CA3AF' }]}>{t('appInfo.appIcon')}</Text>
            <View style={[styles.card, isDark && styles.cardDark, styles.iconSection]}>
              <View style={styles.iconRow}>
                {APP_ICONS.map((icon) => {
                  const isSelected = currentIcon === icon.key;
                  return (
                    <TouchableOpacity
                      key={icon.key ?? 'default'}
                      onPress={() => handleChangeIcon(icon.key)}
                      style={styles.iconOptionWrapper}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.iconOption,
                        isSelected && styles.iconOptionSelected,
                      ]}>
                        <Image
                          source={icon.image}
                          style={styles.iconImage}
                          contentFit="cover"
                        />
                      </View>
                      {isSelected && <View style={styles.selectedDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* AI Disclaimer */}
        <Text style={[styles.sectionTitle, isDark && { color: '#9CA3AF' }]}>AI</Text>
        <View style={[styles.card, isDark && styles.cardDark, { padding: 16 }]}>
          <AiNotice text={t('ai.disclaimer')} fontSize={12} isDark={isDark} />
        </View>

        {/* Version */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={[styles.menuItem, styles.menuItemLast]}>
            <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('appInfo.version')}</Text>
            <Text style={styles.versionValue}>App Version 1.0</Text>
          </View>
        </View>

        {/* Delete Account */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => router.push('/withdraw')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="trash-outline" size={22} color="#FF4444" />
              <Text style={styles.dangerText}>{t('appInfo.deleteAccount')}</Text>
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
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
  iconSection: {
    padding: 16,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  iconOptionWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  iconOption: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  iconOptionSelected: {
    borderWidth: 3,
    borderColor: '#FA5252',
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FA5252',
  },
  dangerText: {
    fontSize: 16,
    color: '#FF4444',
    fontWeight: '500',
  },
});
