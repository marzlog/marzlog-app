import { create } from 'zustand';
import { authApi } from '../api/auth';
import { secureStorage as storage } from '../utils/secureStorage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'ko' | 'en';
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

const defaultSettings: SettingsState = {
  themeMode: 'system',
  notificationsEnabled: true,
  autoUploadEnabled: true,
  autoUploadWifiOnly: true,
  aiMode: 'precise',
  language: 'ko',
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
      const stored = await storage.getItem(STORAGE_KEY);
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
    await storage.removeItem(STORAGE_KEY);
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
    await storage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    // silently fail
  }
}

export default useSettingsStore;
