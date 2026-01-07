import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useSettingsStore } from '@src/store/settingsStore';

export function useColorScheme(): 'light' | 'dark' {
  const systemScheme = useSystemColorScheme();
  const themeMode = useSettingsStore((state) => state.themeMode);

  if (themeMode === 'system') {
    return systemScheme ?? 'light';
  }

  return themeMode;
}
