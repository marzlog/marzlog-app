/**
 * Main Tab Layout
 *
 * Bottom tab navigation for authenticated users
 */

import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme';

export default function MainLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const insets = useSafeAreaInsets();

  // If not authenticated, redirect to auth
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          backgroundColor: colors.background.primary,
          borderTopWidth: 1,
          borderTopColor: colors.border.light,
          // Web specific styles
          ...(Platform.OS === 'web' && {
            position: 'fixed' as any,
            bottom: 0,
            left: 0,
            right: 0,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="timeline"
        options={{
          title: '타임라인',
          tabBarIcon: ({ color }) => <TabIcon name="timeline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '검색',
          tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: '앨범',
          tabBarIcon: ({ color }) => <TabIcon name="albums" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ color }) => <TabIcon name="profile" color={color} />,
        }}
      />
    </Tabs>
  );
}

// Simple emoji icons (will replace with proper icons later)
import { Text } from 'react-native';

function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    timeline: '📅',
    search: '🔍',
    albums: '📁',
    profile: '👤',
  };

  return <Text style={{ fontSize: 24 }}>{icons[name]}</Text>;
}
