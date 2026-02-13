import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { palette, lightTheme, darkTheme } from '@/src/theme/colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';

// --- Tab Icons ---

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 22V12H15V22"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ImagesIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 3H6C4.34315 3 3 4.34315 3 6V14C3 15.6569 4.34315 17 6 17H18C19.6569 17 21 15.6569 21 14V6C21 4.34315 19.6569 3 18 3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 21H19C20.1046 21 21 20.1046 21 19V18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 13L7.29289 8.70711C7.68342 8.31658 8.31658 8.31658 8.70711 8.70711L12 12L14.2929 9.70711C14.6834 9.31658 15.3166 9.31658 15.7071 9.70711L21 15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="11"
        cy="11"
        r="7"
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M16.5 16.5L21 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function PersonIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="12"
        cy="7"
        r="4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoreIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="1" fill={color} stroke={color} strokeWidth={2} />
      <Circle cx="19" cy="12" r="1" fill={color} stroke={color} strokeWidth={2} />
      <Circle cx="5" cy="12" r="1" fill={color} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// --- Custom Tab Bar ---

// 탭 순서: index(0), timeline(1), search(2), profile(3), more(4)
const CENTER_TAB_INDEX = 2; // search가 중앙

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const renderIcon = (routeName: string, color: string) => {
    switch (routeName) {
      case 'index':
        return <HomeIcon color={color} />;
      case 'timeline':
        return <ImagesIcon color={color} />;
      case 'search':
        return <SearchIcon color={color} />;
      case 'profile':
        return <PersonIcon color={color} />;
      case 'more':
        return <MoreIcon color={color} />;
      default:
        return <HomeIcon color={color} />;
    }
  };

  // href: null 제외한 보이는 탭만 필터
  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    return (options as any).href !== null;
  });

  return (
    <View style={styles.tabBarContainer}>
      <View style={[styles.tabBar, { backgroundColor: isDark ? palette.neutral[800] : palette.neutral[200] }]}>
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const routeIndex = state.routes.indexOf(route);
          const isFocused = state.index === routeIndex;
          const isCenter = route.name === 'search';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconColor = isFocused ? '#FFFFFF' : '#A3A3A3';

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconWrapper,
                isCenter && !isFocused && styles.iconWrapperCenter,
                isFocused && styles.iconWrapperActive,
              ]}>
                {renderIcon(route.name, isCenter && !isFocused ? '#FFFFFF' : iconColor)}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Marzlog' }} />
      <Tabs.Screen name="timeline" options={{ title: 'Moments' }} />
      <Tabs.Screen name="search" options={{ title: 'AI Search' }} />
      <Tabs.Screen name="profile" options={{ title: 'My Page' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      <Tabs.Screen name="albums" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  tabBar: {
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabItem: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  iconWrapperActive: {
    backgroundColor: '#FF6A5F', // 코랄/핑크 배경 (Figma)
  },
  iconWrapperCenter: {
    backgroundColor: 'rgba(255, 106, 95, 0.35)', // 반투명 코랄 — 중앙 강조
  },
});
