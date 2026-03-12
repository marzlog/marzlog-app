import React, { useState, useCallback } from 'react';
import {
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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore, type ThemeMode, type AIMode } from '@/src/store/settingsStore';
import { useAppLockStore } from '@/src/store/appLockStore';
import { useReminderStore } from '@/src/store/reminderStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';
import { PinSetup } from '@/src/components/auth/PinSetup';
import { PinInput } from '@/src/components/auth/PinInput';

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

  const [pinModal, setPinModal] = useState<'setup' | 'disable' | 'change-verify' | 'change-new' | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [disablePinError, setDisablePinError] = useState<string | null>(null);
  const [changePinCurrent, setChangePinCurrent] = useState('');
  const [changePinError, setChangePinError] = useState<string | null>(null);

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const dividerColor = isDark ? '#374151' : '#F3F4F6';

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

  const timeValue = new Date();
  timeValue.setHours(reminderHour, reminderMinute, 0, 0);

  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>{t('settings.title')}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Section: Notifications & Security ── */}
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          {t('settings.notifications')}
        </Text>
        <View style={[styles.card, isDark && styles.cardDark]}>
          {/* Push Notifications */}
          <View style={[styles.menuItem, { borderBottomColor: dividerColor }]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.pushNotification')}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Daily Reminder */}
          <View style={[styles.menuItem, { borderBottomColor: dividerColor }, !reminderEnabled && !appLockEnabled && styles.menuItemLast]}>
            <View style={{ flex: 1 }}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="alarm-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('reminder.title')}</Text>
              </View>
              <Text style={[styles.subDesc, isDark && styles.subDescDark]}>{t('reminder.description')}</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={handleReminderToggle}
              trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Reminder Time */}
          {reminderEnabled && (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: dividerColor }, !appLockEnabled && styles.menuItemLast]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="time-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('reminder.timeTitle')}</Text>
              </View>
              <Text style={[styles.settingValue, isDark && styles.settingValueDark]}>
                {formatTime(reminderHour, reminderMinute)}
              </Text>
            </TouchableOpacity>
          )}

          {/* App Lock */}
          <View style={[styles.menuItem, { borderBottomColor: dividerColor }, !appLockEnabled && styles.menuItemLast]}>
            <View style={{ flex: 1 }}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="lock-closed-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('appLock.title')}</Text>
              </View>
              <Text style={[styles.subDesc, isDark && styles.subDescDark]}>{t('appLock.description')}</Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={handleAppLockToggle}
              trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Change PIN */}
          {appLockEnabled && (
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast, { borderBottomColor: dividerColor }]}
              onPress={() => {
                setChangePinError(null);
                setChangePinCurrent('');
                setPinModal('change-verify');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="key-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('appLock.changePin')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#4B5563' : '#9CA3AF'} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Section: Display & AI ── */}
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          {t('settings.displaySection')}
        </Text>
        <View style={[styles.card, isDark && styles.cardDark]}>
          {/* Dark Mode */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: dividerColor }]}
            onPress={() => {
              const modes: ThemeMode[] = ['system', 'light', 'dark'];
              const currentIndex = modes.indexOf(themeMode);
              const nextMode = modes[(currentIndex + 1) % modes.length];
              setThemeMode(nextMode);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="moon-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.darkMode')}</Text>
            </View>
            <Text style={[styles.settingValue, isDark && styles.settingValueDark]}>
              {themeMode === 'system' ? t('settings.darkModeSystem') : themeMode === 'dark' ? t('settings.darkModeDark') : t('settings.darkModeLight')}
            </Text>
          </TouchableOpacity>

          {/* Language */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: dividerColor }]}
            onPress={() => router.push('/language-select')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="language-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.languageSelect')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#4B5563' : '#9CA3AF'} />
          </TouchableOpacity>

          {/* AI Analysis Mode */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast, { borderBottomColor: dividerColor }]}
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
                <Ionicons name="sparkles-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.aiMode')}</Text>
              </View>
              <Text style={[styles.subDesc, isDark && styles.subDescDark]}>
                {aiMode === 'fast' ? t('settings.aiModeFastDesc') : t('settings.aiModePreciseDesc')}
              </Text>
            </View>
            <Text style={[styles.settingValue, isDark && styles.settingValueDark]}>
              {aiMode === 'fast' ? t('settings.aiModeFast') : t('settings.aiModePrecise')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Section: Info ── */}
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          {t('settings.infoSection')}
        </Text>
        <View style={[styles.card, isDark && styles.cardDark]}>
          {/* Labs */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: dividerColor }]}
            onPress={() => router.push('/labs')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="flask-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.labs')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#4B5563' : '#9CA3AF'} />
          </TouchableOpacity>

          {/* App Info */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast, { borderBottomColor: dividerColor }]}
            onPress={() => router.push('/app-info')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.menuLabel, isDark && styles.textLight]}>{t('settings.appInfo')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#4B5563' : '#9CA3AF'} />
          </TouchableOpacity>
        </View>
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
        <View style={[styles.modalContainer, isDark && styles.containerDark, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPinModal(null)} style={styles.backButton}>
              <Ionicons name="close" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
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
        <View style={[styles.modalContainer, isDark && styles.containerDark, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPinModal(null)} style={styles.backButton}>
              <Ionicons name="close" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
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
              style={[styles.timePickerSheet, isDark && styles.sheetDark]}
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
                textColor={isDark ? '#F9FAFB' : '#1F2937'}
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
    backgroundColor: '#F9FAFB',
  },
  containerDark: {
    backgroundColor: '#111827',
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
    color: '#1F2937',
  },
  textLight: {
    color: '#F9FAFB',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 4,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleDark: {
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 20,
  },
  cardDark: {
    backgroundColor: '#1A2332',
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
    color: '#374151',
  },
  subDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 32,
    marginTop: 2,
  },
  subDescDark: {
    color: '#6B7280',
  },
  settingValue: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  settingValueDark: {
    color: '#6B7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  sheetDark: {
    backgroundColor: '#1A2332',
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
    color: '#FA5252',
  },
});
