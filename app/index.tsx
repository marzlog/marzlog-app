/**
 * App Entry Point
 *
 * Redirects based on authentication state:
 * - Authenticated → Main app (timeline)
 * - Not authenticated → Auth flow (onboarding)
 */

import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Redirect href="/(main)/timeline" />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}
