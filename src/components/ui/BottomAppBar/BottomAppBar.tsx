import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { palette } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { shadow } from '../../../theme/spacing';

// BottomAppBar Variants (Figma 기반)
export type BottomAppBarVariant = 'full' | 'floating' | 'labels';

// Tab Item 타입
export interface TabItem {
  key: string;
  label?: string;
  icon: React.ReactNode;
  badge?: number;
  onPress?: () => void;
}

export interface BottomAppBarProps {
  /** 스타일 변형 */
  variant?: BottomAppBarVariant;
  /** 탭 아이템 배열 */
  tabs: TabItem[];
  /** 현재 활성 탭 키 */
  activeTab?: string;
  /** 탭 선택 핸들러 */
  onTabChange?: (key: string) => void;
  /** 홈 인디케이터 표시 (full, labels only) */
  showHomeIndicator?: boolean;
  /** 추가 스타일 */
  style?: StyleProp<ViewStyle>;
}

// 기본 아이콘들
export function HomeIcon({ color = palette.neutral[900] }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BookIcon({ color = palette.neutral[900] }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20M4 19.5C4 20.163 4.26339 20.7989 4.73223 21.2678C5.20107 21.7366 5.83696 22 6.5 22H20V2H6.5C5.83696 2 5.20107 2.26339 4.73223 2.73223C4.26339 3.20107 4 3.83696 4 4.5V19.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UserIcon({ color = palette.neutral[900] }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MoreIcon({ color = palette.neutral[900] }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12H5.01M12 12H12.01M19 12H19.01M6 12C6 12.5523 5.55228 13 5 13C4.44772 13 4 12.5523 4 12C4 11.4477 4.44772 11 5 11C5.55228 11 6 11.4477 6 12ZM13 12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12ZM20 12C20 12.5523 19.5523 13 19 13C18.4477 13 18 12.5523 18 12C18 11.4477 18.4477 11 19 11C19.5523 11 20 11.4477 20 12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Badge 컴포넌트
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

// Home Indicator 컴포넌트
function HomeIndicator() {
  return (
    <View style={styles.homeIndicatorContainer}>
      <View style={styles.homeIndicator} />
    </View>
  );
}

export function BottomAppBar({
  variant = 'full',
  tabs,
  activeTab,
  onTabChange,
  showHomeIndicator = true,
  style,
}: BottomAppBarProps) {
  const handleTabPress = (key: string, onPress?: () => void) => {
    onPress?.();
    onTabChange?.(key);
  };

  // Floating Variant
  if (variant === 'floating') {
    return (
      <View style={[styles.floatingContainer, style]}>
        <View style={styles.floatingBar}>
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                style={[
                  styles.iconButton,
                  isActive && styles.iconButtonActive,
                ]}
                onPress={() => handleTabPress(tab.key, tab.onPress)}
              >
                {tab.icon}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // Labels Variant
  if (variant === 'labels') {
    return (
      <View style={[styles.container, styles.labelsContainer, style]}>
        <View style={styles.labelsIconContainer}>
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                style={styles.segment}
                onPress={() => handleTabPress(tab.key, tab.onPress)}
              >
                <View style={styles.iconWrapper}>
                  <View
                    style={[
                      styles.iconButton,
                      isActive && styles.iconButtonActive,
                    ]}
                  >
                    {tab.icon}
                  </View>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <Badge count={tab.badge} />
                  )}
                </View>
                {tab.label && (
                  <Text style={styles.label}>{tab.label}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
        {showHomeIndicator && <HomeIndicator />}
      </View>
    );
  }

  // Full Variant (default)
  return (
    <View style={[styles.container, styles.fullContainer, style]}>
      <View style={styles.iconContainer}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.iconButton,
                isActive && styles.iconButtonActive,
              ]}
              onPress={() => handleTabPress(tab.key, tab.onPress)}
            >
              {tab.icon}
            </Pressable>
          );
        })}
      </View>
      {showHomeIndicator && <HomeIndicator />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.neutral[200],  // #EBEBE8
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...shadow.lg,
    shadowOpacity: 0.05,
    elevation: 8,
  },
  fullContainer: {},
  labelsContainer: {},
  floatingContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.neutral[200],
    borderRadius: 360,
    padding: 16,
    ...shadow.lg,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  labelsIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 360,
    backgroundColor: palette.neutral[200],  // #EBEBE8
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  iconButtonActive: {
    backgroundColor: palette.primary[500],  // #FF6A5F
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 100,
    backgroundColor: '#53D5FF',  // info-focus
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.semiBold,
    color: palette.neutral[900],
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: palette.neutral[900],
    textAlign: 'center',
    letterSpacing: -0.24,
    lineHeight: 18,
  },
  homeIndicatorContainer: {
    height: 32,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  homeIndicator: {
    width: 134,
    height: 5,
    borderRadius: 100,
    backgroundColor: palette.neutral[900],
  },
});

export default BottomAppBar;
