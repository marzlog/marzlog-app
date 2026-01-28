import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@src/store/authStore';
import { useSettingsStore } from '@src/store/settingsStore';
import { DialogProvider } from '@/src/components/ui/Dialog';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

const INTRO_SEEN_KEY = 'marzlog_intro_seen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { loadSettings, isLoaded: settingsLoaded } = useSettingsStore();
  const [initialReady, setInitialReady] = useState(false);
  const [introSeen, setIntroSeen] = useState(true); // default true to avoid flash
  const hasNavigated = useRef(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Check auth status, load settings, and check intro on app start
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        checkAuth(),
        loadSettings(),
      ]);
      // Check if intro has been seen
      try {
        const value = await AsyncStorage.getItem(INTRO_SEEN_KEY);
        setIntroSeen(value === 'true');
      } catch {}
      setInitialReady(true);
    };
    init();
  }, []);

  // Handle initial navigation only (once, on app start)
  useEffect(() => {
    if (!initialReady || !loaded || hasNavigated.current) return;

    if (!isAuthenticated) {
      hasNavigated.current = true;
      if (!introSeen) {
        router.replace('/intro');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, initialReady, loaded, introSeen]);

  // Handle logout: redirect to login (not intro)
  useEffect(() => {
    if (!hasNavigated.current || !initialReady || isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  if (!loaded || !initialReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DialogProvider>
        <Stack>
          <Stack.Screen name="intro" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="upload" options={{ headerShown: false }} />
          <Stack.Screen name="media" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </DialogProvider>
    </ThemeProvider>
  );
}
