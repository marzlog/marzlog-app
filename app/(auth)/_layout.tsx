/**
 * Auth Layout
 *
 * Layout for authentication screens (onboarding, login)
 */

import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // If authenticated, redirect to main app
  if (isAuthenticated) {
    return <Redirect href="/(main)/timeline" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
