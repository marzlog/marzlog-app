import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
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
  const [initialReady, setInitialReady] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Check auth status, load settings, and onboarding state on app start
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        checkAuth(),
        loadSettings(),
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

  return <RootLayoutNav />;
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
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </DialogProvider>
    </ThemeProvider>
  );
}
