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
import { borderRadius } from '../../../theme/spacing';

// TopAppBar Variants (Figma 기반)
export type TopAppBarVariant =
  | 'small'      // Small-Centered: 뒤로가기 + 제목 + 우측 아이콘
  | 'medium'     // Medium-Icons: 뒤로가기 + 우측 아이콘 + 24pt 제목
  | 'large'      // Large-Icons: 뒤로가기 + 우측 아이콘 + 32pt 제목
  | 'search';    // Search: 메뉴 + 검색바 + 추가

export interface TopAppBarProps {
  /** 스타일 변형 */
  variant?: TopAppBarVariant;
  /** 제목 텍스트 */
  title?: string;
  /** 뒤로가기 버튼 표시 */
  showBackButton?: boolean;
  /** 뒤로가기 핸들러 */
  onBackPress?: () => void;
  /** 왼쪽 커스텀 컴포넌트 */
  leftComponent?: React.ReactNode;
  /** 오른쪽 커스텀 컴포넌트 */
  rightComponent?: React.ReactNode;
  /** 우측 1번 아이콘 (onPress 필요) */
  onRightIcon1Press?: () => void;
  /** 우측 2번 아이콘 (onPress 필요) */
  onRightIcon2Press?: () => void;
  /** 우측 더보기 아이콘 (onPress 필요) */
  onMorePress?: () => void;
  /** 검색 플레이스홀더 (search variant) */
  searchPlaceholder?: string;
  /** 검색 클릭 핸들러 */
  onSearchPress?: () => void;
  /** 추가 버튼 핸들러 */
  onAddPress?: () => void;
  /** 추가 스타일 */
  style?: StyleProp<ViewStyle>;
}

// 뒤로가기 화살표 아이콘
function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke={palette.neutral[900]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 메뉴 아이콘
function MenuIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6H20M4 12H20M4 18H20"
        stroke={palette.neutral[900]}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// 검색 아이콘
function SearchIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
        stroke={palette.neutral[900]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 더하기 아이콘
function PlusIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5V19M5 12H19"
        stroke={palette.neutral[900]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 더보기(vertical) 아이콘
function MoreIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z"
        fill={palette.neutral[900]}
        stroke={palette.neutral[900]}
        strokeWidth={2}
      />
      <Path
        d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z"
        fill={palette.neutral[900]}
        stroke={palette.neutral[900]}
        strokeWidth={2}
      />
      <Path
        d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z"
        fill={palette.neutral[900]}
        stroke={palette.neutral[900]}
        strokeWidth={2}
      />
    </Svg>
  );
}

// 아이콘 버튼 컴포넌트
interface IconButtonProps {
  onPress?: () => void;
  children: React.ReactNode;
  filled?: boolean;
}

function IconButton({ onPress, children, filled = false }: IconButtonProps) {
  return (
    <Pressable
      style={[styles.iconButton, filled && styles.iconButtonFilled]}
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}

export function TopAppBar({
  variant = 'small',
  title,
  showBackButton = true,
  onBackPress,
  leftComponent,
  rightComponent,
  onRightIcon1Press,
  onRightIcon2Press,
  onMorePress,
  searchPlaceholder = 'Search...',
  onSearchPress,
  onAddPress,
  style,
}: TopAppBarProps) {
  // Search Variant
  if (variant === 'search') {
    return (
      <View style={[styles.container, styles.searchContainer, style]}>
        {/* Left Menu Button */}
        {leftComponent || (
          <IconButton filled>
            <MenuIcon />
          </IconButton>
        )}

        {/* Search Bar */}
        <Pressable style={styles.searchBar} onPress={onSearchPress}>
          <View style={styles.searchIconContainer}>
            <SearchIcon />
          </View>
          <Text style={styles.searchPlaceholder}>{searchPlaceholder}</Text>
        </Pressable>

        {/* Add Button */}
        <IconButton onPress={onAddPress}>
          <PlusIcon />
        </IconButton>

        {rightComponent}
      </View>
    );
  }

  // Medium/Large Variant
  if (variant === 'medium' || variant === 'large') {
    return (
      <View style={[styles.container, styles.multiLineContainer, style]}>
        {/* Top Row: Icons */}
        <View style={styles.topRow}>
          {/* Back Button */}
          {showBackButton && (
            <IconButton filled onPress={onBackPress}>
              <BackIcon />
            </IconButton>
          )}
          {leftComponent}

          <View style={styles.spacer} />

          {/* Trailing Icons */}
          <View style={styles.trailingIcons}>
            {onRightIcon1Press && (
              <IconButton onPress={onRightIcon1Press}>
                <PlusIcon />
              </IconButton>
            )}
            {onRightIcon2Press && (
              <IconButton onPress={onRightIcon2Press}>
                <PlusIcon />
              </IconButton>
            )}
            {onMorePress && (
              <IconButton onPress={onMorePress}>
                <MoreIcon />
              </IconButton>
            )}
            {rightComponent}
          </View>
        </View>

        {/* Bottom Row: Title */}
        {title && (
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                variant === 'large' ? styles.titleLarge : styles.titleMedium,
              ]}
            >
              {title}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Small Variant (default)
  return (
    <View style={[styles.container, styles.smallContainer, style]}>
      {/* Back Button */}
      {showBackButton ? (
        <IconButton filled onPress={onBackPress}>
          <BackIcon />
        </IconButton>
      ) : (
        leftComponent || <View style={styles.iconPlaceholder} />
      )}

      {/* Centered Title */}
      {title && (
        <Text style={[styles.title, styles.titleSmall]} numberOfLines={1}>
          {title}
        </Text>
      )}

      {/* Right Component */}
      {rightComponent || (
        <View style={styles.iconPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.neutral[50],  // #FAFAF9
    width: '100%',
  },
  smallContainer: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchContainer: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    gap: 16,
  },
  multiLineContainer: {
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingLeft: 12,
    paddingRight: 8,
  },
  titleRow: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 360,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  iconButtonFilled: {
    backgroundColor: palette.neutral[200],  // #EBEBE8
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
  },
  spacer: {
    flex: 1,
  },
  trailingIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: palette.neutral[900],
    fontWeight: typography.fontWeight.medium,
  },
  titleSmall: {
    flex: 1,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  titleMedium: {
    fontSize: 24,
    lineHeight: 34,
    letterSpacing: -0.96,
  },
  titleLarge: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1.44,
  },
  searchBar: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.neutral[200],
    borderRadius: 16,
    borderWidth: 2,
    borderColor: palette.neutral[200],
    paddingHorizontal: 16,
    gap: 12,
  },
  searchIconContainer: {
    opacity: 0.5,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    fontWeight: typography.fontWeight.medium,
    color: palette.neutral[900],
    opacity: 0.5,
    letterSpacing: -0.4,
  },
});

export default TopAppBar;
