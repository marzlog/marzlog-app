import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { authApi } from '../api/auth';
import { secureStorage } from '../utils/secureStorage';
import { isSupportedLocale, type SupportedLocale } from '../i18n';

export type ThemeMode = 'light' | 'dark' | 'system';
// 지원 언어 단일 진실은 src/i18n의 SUPPORTED_LOCALES — 여기서는 별칭만 유지
export type Language = SupportedLocale;
export type AIMode = 'fast' | 'precise';

// Frontend ↔ Backend mode mapping
export function aiModeToBackend(mode: AIMode): 'light' | 'precision' {
  return mode === 'fast' ? 'light' : 'precision';
}

export function backendToAiMode(mode: string): AIMode {
  return mode === 'light' ? 'fast' : 'precise';
}

interface SettingsState {
  // Theme
  themeMode: ThemeMode;

  // Notifications
  notificationsEnabled: boolean;

  // Auto Upload
  autoUploadEnabled: boolean;
  autoUploadWifiOnly: boolean;

  // AI Mode
  aiMode: AIMode;

  // Language
  language: Language;

  // Loading
  isLoaded: boolean;
}

interface SettingsActions {
  // Setters
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setAutoUploadEnabled: (enabled: boolean) => Promise<void>;
  setAutoUploadWifiOnly: (wifiOnly: boolean) => Promise<void>;
  setAIMode: (mode: AIMode) => Promise<void>;
  syncAIModeFromServer: (mode: AIMode) => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;

  // Load settings from storage
  loadSettings: () => Promise<void>;

  // Reset to defaults
  resetSettings: () => Promise<void>;
}

type SettingsStore = SettingsState & SettingsActions;

const STORAGE_KEY = 'marzlog_settings';

// F-DEFAULT-LANG: persist 부재 시 초기 언어 = 기기 로케일 (지원 목록 밖은 전부 en 폴백).
// persist 값이 있으면 loadSettings가 덮어쓰므로 유저 명시 선택이 항상 우선.
function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return isSupportedLocale(code) ? code : 'en';
}

const defaultSettings: SettingsState = {
  themeMode: 'system',
  notificationsEnabled: true,
  autoUploadEnabled: true,
  autoUploadWifiOnly: true,
  aiMode: 'precise',
  language: deviceLanguage(),
  isLoaded: false,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaultSettings,

  setThemeMode: async (mode) => {
    set({ themeMode: mode });
    await saveSettings(get());
  },

  setNotificationsEnabled: async (enabled) => {
    set({ notificationsEnabled: enabled });
    await saveSettings(get());
  },

  setAutoUploadEnabled: async (enabled) => {
    set({ autoUploadEnabled: enabled });
    await saveSettings(get());
  },

  setAutoUploadWifiOnly: async (wifiOnly) => {
    set({ autoUploadWifiOnly: wifiOnly });
    await saveSettings(get());
  },

  setAIMode: async (mode) => {
    set({ aiMode: mode });
    await saveSettings(get());
    // Sync to backend (fire-and-forget)
    authApi.updateSettings({ analysis_mode: aiModeToBackend(mode) }).catch(() => {});
  },

  // Sync from server without calling API back
  syncAIModeFromServer: async (mode) => {
    set({ aiMode: mode });
    await saveSettings(get());
  },

  setLanguage: async (language) => {
    set({ language: language });
    await saveSettings(get());
  },

  loadSettings: async () => {
    try {
      let stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // F-DEFAULT-LANG 1회 마이그레이션: 구 Keychain persist → AsyncStorage.
        // Keychain은 앱 삭제 후에도 잔존해 재설치 시 stale 언어가 살아나므로 이관 후 삭제.
        const legacy = await secureStorage.getItem(STORAGE_KEY);
        if (legacy) {
          await AsyncStorage.setItem(STORAGE_KEY, legacy);
          await secureStorage.removeItem(STORAGE_KEY);
          stored = legacy;
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SettingsState>;
        set({
          ...defaultSettings,
          ...parsed,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      // silently fail
      set({ isLoaded: true });
    }
  },

  resetSettings: async () => {
    set({ ...defaultSettings, isLoaded: true });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
}));

// Helper function to save settings
async function saveSettings(state: SettingsStore) {
  const toSave: Partial<SettingsState> = {
    themeMode: state.themeMode,
    notificationsEnabled: state.notificationsEnabled,
    autoUploadEnabled: state.autoUploadEnabled,
    autoUploadWifiOnly: state.autoUploadWifiOnly,
    aiMode: state.aiMode,
    language: state.language,
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    // silently fail
  }
}

export default useSettingsStore;
