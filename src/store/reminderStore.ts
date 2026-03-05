import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
  setupNotificationChannels,
} from '../services/notificationService';

const STORAGE_KEY = 'marzlog_reminder_settings';

interface ReminderSettings {
  isEnabled: boolean;
  hour: number;
  minute: number;
}

interface ReminderState {
  isEnabled: boolean;
  hour: number;
  minute: number;
  isLoading: boolean;

  initialize: () => Promise<void>;
  enableReminder: () => Promise<boolean>;
  disableReminder: () => Promise<void>;
  setTime: (hour: number, minute: number) => Promise<void>;
}

const DEFAULT_HOUR = 21;
const DEFAULT_MINUTE = 0;

export const useReminderStore = create<ReminderState>((set, get) => ({
  isEnabled: false,
  hour: DEFAULT_HOUR,
  minute: DEFAULT_MINUTE,
  isLoading: false,

  initialize: async () => {
    try {
      await setupNotificationChannels();
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings: ReminderSettings = JSON.parse(stored);
        set({
          isEnabled: settings.isEnabled,
          hour: settings.hour,
          minute: settings.minute,
        });
      }
    } catch (error) {
      console.error('[Reminder] initialize failed:', error);
    }
  },

  enableReminder: async () => {
    set({ isLoading: true });
    try {
      const granted = await requestNotificationPermission();
      if (!granted) {
        set({ isLoading: false });
        return false;
      }

      const { hour, minute } = get();
      await scheduleDailyReminder(hour, minute);

      const settings: ReminderSettings = { isEnabled: true, hour, minute };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      set({ isEnabled: true, isLoading: false });
      return true;
    } catch (error) {
      console.error('[Reminder] enableReminder failed:', error);
      set({ isLoading: false });
      return false;
    }
  },

  disableReminder: async () => {
    set({ isLoading: true });
    try {
      await cancelDailyReminder();

      const { hour, minute } = get();
      const settings: ReminderSettings = { isEnabled: false, hour, minute };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      set({ isEnabled: false, isLoading: false });
    } catch (error) {
      console.error('[Reminder] disableReminder failed:', error);
      set({ isLoading: false });
    }
  },

  setTime: async (hour: number, minute: number) => {
    set({ hour, minute });

    const { isEnabled } = get();
    const settings: ReminderSettings = { isEnabled, hour, minute };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    if (isEnabled) {
      await scheduleDailyReminder(hour, minute);
    }
  },
}));

export default useReminderStore;
