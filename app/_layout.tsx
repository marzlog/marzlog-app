import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';

import { initializeKakaoSDK } from '@react-native-kakao/core';
import { useColorScheme } from '@/components/useColorScheme';
import { initSentry } from '../src/utils/sentry';
import { useAuthStore } from '@src/store/authStore';
import { useSettingsStore } from '@src/store/settingsStore';
import { useAppLockStore } from '@src/store/appLockStore';
import { useReminderStore } from '@src/store/reminderStore';
import { DialogProvider } from '@/src/components/ui/Dialog';
import { BiometricLock } from '@/src/components/auth/BiometricLock';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

initSentry();

const kakaoKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY;
if (kakaoKey && Platform.OS !== 'web') {
  try {
    initializeKakaoSDK(kakaoKey);
  } catch (e) {
    // Kakao SDK init failed — silently ignore
  }
}

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

const ONBOARDING_KEY = '@marzlog_onboarding_completed';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const { isAuthenticated, checkAuth } = useAuthStore();
  const { loadSettings } = useSettingsStore();
  const { isLocked, isEnabled: appLockEnabled, initialize: initAppLock, lock: lockApp } = useAppLockStore();
  const [initialReady, setInitialReady] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const backgroundTimestamp = useRef<number | null>(null);
  const LOCK_THRESHOLD_MS = 30_000;

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Check for OTA updates on app start
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // silently fail
      }
    })();
  }, []);

  // Check auth status, load settings, app lock, and onboarding state on app start
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        checkAuth(),
        loadSettings(),
        initAppLock(),
      ]);
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        setOnboardingCompleted(value === 'true');
      } catch {
        setOnboardingCompleted(false);
      }
      setInitialReady(true);
    };
    init();
  }, []);

  // Background → foreground: lock after 30s
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestamp.current = Date.now();
      }
      if (nextState === 'active') {
        const { isEnabled } = useAppLockStore.getState();
        if (isEnabled && backgroundTimestamp.current) {
          const elapsed = Date.now() - backgroundTimestamp.current;
          if (elapsed > LOCK_THRESHOLD_MS) {
            lockApp();
          }
        }
        backgroundTimestamp.current = null;
      }
    });
    return () => subscription.remove();
  }, []);

  // Notification initialization + deep link handling (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    useReminderStore.getState().initialize();

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const ALLOWED_SCREENS = ['upload', 'home'];
        if (data?.screen && ALLOWED_SCREENS.includes(data.screen as string)) {
          if (data.screen === 'upload') {
            router.push('/upload');
          }
        }
      });

    if (Platform.OS === 'ios') {
      Notifications.setBadgeCountAsync(0);
    }

    return () => {
      responseSubscription.remove();
    };
  }, []);

  // Single navigation effect: handles initial routing + logout redirect
  useEffect(() => {
    if (!initialReady || !loaded || onboardingCompleted === null) return;

    if (isAuthenticated) return; // logged in → show tabs (initialRouteName)

    if (!onboardingCompleted) {
      router.replace('/onboarding');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, initialReady, loaded, onboardingCompleted]);

  if (!loaded || !initialReady) {
    return null;
  }

  return (
    <>
      <RootLayoutNav />
      {isAuthenticated && isLocked && <BiometricLock />}
    </>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DialogProvider>
        <Stack>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="intro" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="terms-agreement" options={{ headerShown: false }} />
          <Stack.Screen name="policy/terms" options={{ headerShown: false }} />
          <Stack.Screen name="policy/privacy" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
          <Stack.Screen name="upload" options={{ headerShown: false }} />
          <Stack.Screen name="media" options={{ headerShown: false }} />
          <Stack.Screen name="app-info" options={{ headerShown: false }} />
          <Stack.Screen name="withdraw" options={{ headerShown: false }} />
          <Stack.Screen name="withdraw-complete" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="language-select" options={{ headerShown: false }} />
          <Stack.Screen name="labs" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </DialogProvider>
    </ThemeProvider>
  );
}
