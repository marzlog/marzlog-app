import React, { useState, useCallback } from 'react';
import {
  Alert,
  Modal,
  Platform,
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
import Constants from 'expo-constants';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore, type ThemeMode, type AIMode } from '@/src/store/settingsStore';
import { useAppLockStore } from '@/src/store/appLockStore';
import { useReminderStore } from '@/src/store/reminderStore';
import { useAuthStore } from '@/src/store/authStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';
import { PinSetup } from '@/src/components/auth/PinSetup';
import { PinInput } from '@/src/components/auth/PinInput';

const ICON_COLOR = '#8B5CF6';
const appVersion = Constants.expoConfig?.version || '1.0.0';

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
  const { isEnabled: appLockEnabled, enableLock, disableLock, changePin } = useAppLockStore();
  const {
    isEnabled: reminderEnabled,
    hour: reminderHour,
    minute: reminderMinute,
    enableReminder,
    disableReminder,
    setTime: setReminderTime,
  } = useReminderStore();
  const { logout } = useAuthStore();

  const [pinModal, setPinModal] = useState<'setup' | 'disable' | 'change-verify' | 'change-new' | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [disablePinError, setDisablePinError] = useState<string | null>(null);
  const [changePinCurrent, setChangePinCurrent] = useState('');
  const [changePinError, setChangePinError] = useState<string | null>(null);

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const bg = isDark ? '#0F1923' : '#F9FAFB';
  const cardBg = isDark ? '#1A2332' : '#FFFFFF';
  const divider = isDark ? '#2D3748' : '#E5E7EB';
  const labelColor = isDark ? '#F9FAFB' : '#111827';
  const subColor = isDark ? '#9CA3AF' : '#6B7280';
  const sectionColor = isDark ? '#6B7280' : '#9CA3AF';
  const chevronColor = isDark ? '#4B5563' : '#9CA3AF';

  const handleAppLockToggle = useCallback(() => {
    if (appLockEnabled) {
      setPinModal('disable');
      setDisablePinError(null);
    } else {
      setPinModal('setup');
    }
  }, [appLockEnabled]);

  const handlePinSetupComplete = useCallback(async (pin: string) => {
    await enableLock(pin);
    setPinModal(null);
  }, [enableLock]);

  const handleDisablePin = useCallback(async (pin: string) => {
    const success = await disableLock(pin);
    if (success) {
      setPinModal(null);
    } else {
      setDisablePinError(t('appLock.wrongPin'));
    }
  }, [disableLock, t]);

  const handleChangePinVerify = useCallback(async (pin: string) => {
    setChangePinCurrent(pin);
    setChangePinError(null);
    setPinModal('change-new');
  }, []);

  const handleChangePinNew = useCallback(async (pin: string) => {
    const success = await changePin(changePinCurrent, pin);
    if (success) {
      setPinModal(null);
      setChangePinCurrent('');
    } else {
      setChangePinError(t('appLock.wrongPin'));
      setPinModal('change-verify');
      setChangePinCurrent('');
    }
  }, [changePin, changePinCurrent, t]);

  const handleReminderToggle = useCallback(async () => {
    if (reminderEnabled) {
      await disableReminder();
    } else {
      await enableReminder();
    }
  }, [reminderEnabled, enableReminder, disableReminder]);

  const handleTimeChange = useCallback((_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setReminderTime(selectedDate.getHours(), selectedDate.getMinutes());
    }
  }, [setReminderTime]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ],
    );
  }, [logout, router, t]);

  const timeValue = new Date();
  timeValue.setHours(reminderHour, reminderMinute, 0, 0);

  const formatTime = (h: number, m: number) =>
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={labelColor} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Logo size={28} showText={false} color={labelColor} />
          <Text style={[styles.headerTitle, { color: labelColor }]}>{t('settings.title')}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>

        {/* ── Section 1: App Settings ── */}
        <Text style={[styles.sectionTitle, { color: sectionColor }]}>
          {t('settings.appSettingsSection')}
        </Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {/* Push Notifications */}
          <View style={[styles.menuItem, { borderBottomColor: divider }]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={24} color={ICON_COLOR} />
              <Text style={[styles.menuLabel, { color: labelColor }]}>{t('settings.pushNotification')}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#8B5CF6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Daily Reminder */}
          <View style={[styles.menuItem, { borderBottomColor: divider }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="alarm-outline" size={24} color={ICON_COLOR} />
                <Text style={[styles.menuLabel, { color: labelColor }]}>{t('reminder.title')}</Text>
              </View>
              <Text style={[styles.subDesc, { color: subColor }]}>{t('reminder.description')}</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={handleReminderToggle}
              trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#8B5CF6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Reminder Time */}
          {reminderEnabled && (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: divider }]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="time-outline" size={24} color={ICON_COLOR} />
                <Text style={[styles.menuLabel, { color: labelColor }]}>{t('reminder.timeTitle')}</Text>
              </View>
              <Text style={[styles.settingValue, { color: subColor }]}>
                {formatTime(reminderHour, reminderMinute)}
              </Text>
            </TouchableOpacity>
          )}

          {/* Language */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: divider }]}
            onPress={() => router.push('/language-select')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="language-outline" size={24} color={ICON_COLOR} />
              <Text style={[styles.menuLabel, { color: labelColor }]}>{t('settings.languageSelect')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
          </TouchableOpacity>

          {/* Dark Mode */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: divider }]}
            onPress={() => {
              const modes: ThemeMode[] = ['system', 'light', 'dark'];
              const currentIndex = modes.indexOf(themeMode);
              setThemeMode(modes[(currentIndex + 1) % modes.length]);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="moon-outline" size={24} color={ICON_COLOR} />
              <Text style={[styles.menuLabel, { color: labelColor }]}>{t('settings.darkMode')}</Text>
            </View>
            <Text style={[styles.settingValue, { color: subColor }]}>
              {themeMode === 'system' ? t('settings.darkModeSystem') : themeMode === 'dark' ? t('settings.darkModeDark') : t('settings.darkModeLight')}
            </Text>
          </TouchableOpacity>

          {/* App Lock */}
          <View style={[styles.menuItem, { borderBottomColor: divider }, !appLockEnabled && styles.menuItemLast]}>
            <View style={{ flex: 1 }}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="lock-closed-outline" size={24} color={ICON_COLOR} />
                <Text style={[styles.menuLabel, { color: labelColor }]}>{t('appLock.title')}</Text>
              </View>
              <Text style={[styles.subDesc, { color: subColor }]}>{t('appLock.description')}</Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={handleAppLockToggle}
              trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#8B5CF6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Change PIN */}
          {appLockEnabled && (
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast, { borderBottomColor: divider }]}
              onPress={() => {
                setChangePinError(null);
                setChangePinCurrent('');
                setPinModal('change-verify');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="key-outline" size={24} color={ICON_COLOR} />
                <Text style={[styles.menuLabel, { color: labelColor }]}>{t('appLock.changePin')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={chevronColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Section 2: Privacy ── */}
        <Text style={[styles.sectionTitle, { color: sectionColor }]}>
          {t('settings.privacySection')}
        </Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {/* Privacy Policy */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: divider }]}
            onPress={() => WebBrowser.openBrowserAsync('https://marzlog.com/privacy')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color={ICON_COLOR} />
              <Text style={[styles.menuLabel, { color: labelColor }]}>{t('support.privacy')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
          </TouchableOpacity>

          {/* Terms of Service */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast, { borderBottomColor: divider }]}
            onPress={() => WebBrowser.openBrowserAsync('https://marzlog.com/terms')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={24} color={ICON_COLOR} />
              <Text style={[styles.menuLabel, { color: labelColor }]}>{t('support.terms')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
          </TouchableOpacity>
        </View>

        {/* ── Section 3: App Info ── */}
        <Text style={[styles.sectionTitle, { color: sectionColor }]}>
          {t('settings.appInfoSection')}
        </Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {/* AI Mode */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: divider }]}
            onPress={() => {
              const modes: AIMode[] = ['fast', 'precise'];
              const currentIndex = modes.indexOf(aiMode);
              setAIMode(modes[(currentIndex + 1) % modes.length]);
            }}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="sparkles-outline" size={24} color={ICON_COLOR} />
                <Text style={[styles.menuLabel, { color: labelColor }]}>{t('settings.aiMode')}</Text>
              </View>
              <Text style={[styles.subDesc, { color: subColor }]}>
                {aiMode === 'fast' ? t('settings.aiModeFastDesc') : t('settings.aiModePreciseDesc')}
              </Text>
            </View>
            <Text style={[styles.settingValue, { color: subColor }]}>
              {aiMode === 'fast' ? t('settings.aiModeFast') : t('settings.aiModePrecise')}
            </Text>
          </TouchableOpacity>

          {/* Labs */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: divider }]}
            onPress={() => router.push('/labs')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="flask-outline" size={24} color={ICON_COLOR} />
              <Text style={[styles.menuLabel, { color: labelColor }]}>{t('settings.labs')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
          </TouchableOpacity>

          {/* App Info */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: divider }]}
            onPress={() => router.push('/app-info')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={24} color={ICON_COLOR} />
              <Text style={[styles.menuLabel, { color: labelColor }]}>{t('settings.appInfo')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
          </TouchableOpacity>

          {/* Version */}
          <View style={[styles.menuItem, styles.menuItemLast]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="code-slash-outline" size={24} color={ICON_COLOR} />
              <Text style={[styles.menuLabel, { color: labelColor }]}>{t('settings.version')}</Text>
            </View>
            <Text style={[styles.settingValue, { color: subColor }]}>v{appVersion}</Text>
          </View>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: cardBg }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* PIN Modals */}
      <Modal visible={pinModal === 'setup'} animationType="slide" presentationStyle="fullScreen">
        <PinSetup
          onSetup={handlePinSetupComplete}
          onCancel={() => setPinModal(null)}
          isDark={isDark}
        />
      </Modal>

      <Modal visible={pinModal === 'disable'} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.modalContainer, { backgroundColor: bg }, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPinModal(null)} style={styles.backButton}>
              <Ionicons name="close" size={24} color={labelColor} />
            </TouchableOpacity>
          </View>
          <PinInput
            onComplete={handleDisablePin}
            title={t('appLock.currentPin')}
            error={disablePinError}
          />
        </View>
      </Modal>

      <Modal visible={pinModal === 'change-verify'} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.modalContainer, { backgroundColor: bg }, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPinModal(null)} style={styles.backButton}>
              <Ionicons name="close" size={24} color={labelColor} />
            </TouchableOpacity>
          </View>
          <PinInput
            onComplete={handleChangePinVerify}
            title={t('appLock.currentPin')}
            error={changePinError}
          />
        </View>
      </Modal>

      <Modal visible={pinModal === 'change-new'} animationType="slide" presentationStyle="fullScreen">
        <PinSetup
          onSetup={handleChangePinNew}
          onCancel={() => {
            setPinModal(null);
            setChangePinCurrent('');
          }}
          isDark={isDark}
        />
      </Modal>

      {/* TimePicker */}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={timeValue}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {showTimePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
          <TouchableOpacity
            style={styles.timePickerOverlay}
            activeOpacity={1}
            onPress={() => setShowTimePicker(false)}
          >
            <View
              style={[styles.timePickerSheet, { backgroundColor: cardBg }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.timePickerHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.timePickerDone}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={timeValue}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleTimeChange}
                textColor={labelColor}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 52,
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
  },
  content: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  },
  subDesc: {
    fontSize: 12,
    marginLeft: 36,
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    height: 52,
    marginBottom: 12,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  timePickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});
