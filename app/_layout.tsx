/**
 * Root Layout
 *
 * Handles:
 * - Font loading
 * - Splash screen
 * - Auth state initialization
 * - Root navigation structure
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize auth state
        await initialize();
      } catch (e) {
        console.warn('Auth initialization error:', e);
      } finally {
        // Hide splash screen
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, [initialize]);

  if (!isInitialized) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background.primary },
            animation: 'slide_from_right',
          }}
        >
          {/* Auth screens */}
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />

          {/* Main app */}
          <Stack.Screen name="(main)" options={{ animation: 'fade' }} />

          {/* Modal screens */}
          <Stack.Screen
            name="photo/[id]"
            options={{
              presentation: 'fullScreenModal',
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="album/[id]"
            options={{
              animation: 'slide_from_right',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
