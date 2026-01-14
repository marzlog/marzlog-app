import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { palette, lightTheme } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { borderRadius } from '../../../theme/spacing';

// Button Variants (Figma 기반)
export type ButtonVariant =
  | 'primary'    // Filled A - 코랄
  | 'secondary'  // Filled B - 녹색계열
  | 'tertiary'   // Filled C - 다크
  | 'outlined'   // Outlined
  | 'text'       // Text Button
  | 'neutral';   // Neutral

// Button Sizes (Figma 기반)
export type ButtonSize = 'large' | 'medium' | 'small';

export interface ButtonProps {
  /** 버튼 텍스트 */
  children: string;
  /** 버튼 스타일 변형 */
  variant?: ButtonVariant;
  /** 버튼 크기 */
  size?: ButtonSize;
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 로딩 상태 */
  loading?: boolean;
  /** 전체 너비 */
  fullWidth?: boolean;
  /** 왼쪽 아이콘 */
  leftIcon?: React.ReactNode;
  /** 오른쪽 아이콘 */
  rightIcon?: React.ReactNode;
  /** 클릭 핸들러 */
  onPress?: () => void;
  /** 추가 스타일 */
  style?: StyleProp<ViewStyle>;
  /** 텍스트 추가 스타일 */
  textStyle?: StyleProp<TextStyle>;
}

// Figma 디자인 기반 색상
const variantColors = {
  primary: {
    background: palette.primary[500],      // #FF6A5F
    backgroundPressed: palette.primary[600],
    backgroundDisabled: palette.primary[300],
    text: '#FFFFFF',
    textDisabled: '#FFFFFF',
  },
  secondary: {
    background: '#566661',                  // Figma Filled B
    backgroundPressed: '#4A5A55',
    backgroundDisabled: '#A8B0AC',
    text: '#FFFFFF',
    textDisabled: '#FFFFFF',
  },
  tertiary: {
    background: '#1A2E28',                  // Figma Filled C
    backgroundPressed: '#0F1F1A',
    backgroundDisabled: '#8A9A95',
    text: '#FFFFFF',
    textDisabled: '#FFFFFF',
  },
  outlined: {
    background: 'transparent',
    backgroundPressed: palette.neutral[100],
    backgroundDisabled: 'transparent',
    text: palette.neutral[900],
    textDisabled: palette.neutral[400],
    borderColor: palette.neutral[400],
    borderColorDisabled: palette.neutral[300],
  },
  text: {
    background: 'transparent',
    backgroundPressed: palette.neutral[100],
    backgroundDisabled: 'transparent',
    text: palette.primary[500],
    textDisabled: palette.neutral[400],
  },
  neutral: {
    background: palette.neutral[200],
    backgroundPressed: palette.neutral[300],
    backgroundDisabled: palette.neutral[100],
    text: palette.neutral[900],
    textDisabled: palette.neutral[400],
  },
};

// Figma 디자인 기반 크기
const sizeStyles = {
  large: {
    height: 56,
    paddingHorizontal: 24,
    fontSize: typography.fontSize.lg,    // 18
    iconSize: 24,
    gap: 8,
    borderRadius: borderRadius.lg,       // 12
  },
  medium: {
    height: 40,
    paddingHorizontal: 16,
    fontSize: typography.fontSize.base,  // 16
    iconSize: 20,
    gap: 6,
    borderRadius: borderRadius.md,       // 8
  },
  small: {
    height: 32,
    paddingHorizontal: 12,
    fontSize: typography.fontSize.sm,    // 14
    iconSize: 16,
    gap: 4,
    borderRadius: borderRadius.sm,       // 4
  },
};

export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onPress,
  style,
  textStyle,
}: ButtonProps) {
  const colors = variantColors[variant];
  const sizes = sizeStyles[size];
  const isDisabled = disabled || loading;

  const buttonStyle = useMemo(() => {
    const baseStyle: ViewStyle = {
      height: sizes.height,
      paddingHorizontal: sizes.paddingHorizontal,
      borderRadius: sizes.borderRadius,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: sizes.gap,
      backgroundColor: isDisabled ? colors.backgroundDisabled : colors.background,
    };

    // Outlined 버튼 테두리
    if (variant === 'outlined') {
      baseStyle.borderWidth = 1;
      const outlinedColors = variantColors.outlined;
      baseStyle.borderColor = isDisabled
        ? outlinedColors.borderColorDisabled
        : outlinedColors.borderColor;
    }

    // 전체 너비
    if (fullWidth) {
      baseStyle.width = '100%';
    } else {
      baseStyle.alignSelf = 'flex-start';
    }

    return baseStyle;
  }, [variant, sizes, isDisabled, colors, fullWidth]);

  const labelStyle = useMemo((): TextStyle => ({
    fontSize: sizes.fontSize,
    fontWeight: typography.fontWeight.semiBold,
    color: isDisabled ? colors.textDisabled : colors.text,
  }), [sizes, isDisabled, colors]);

  const handlePressIn = () => {
    // Pressed 상태 처리 (향후 Animated 적용 가능)
  };

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={onPress}
      onPressIn={handlePressIn}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={colors.text}
        />
      ) : (
        <>
          {leftIcon && (
            <View style={{ width: sizes.iconSize, height: sizes.iconSize }}>
              {leftIcon}
            </View>
          )}
          <Text style={[labelStyle, textStyle]}>{children}</Text>
          {rightIcon && (
            <View style={{ width: sizes.iconSize, height: sizes.iconSize }}>
              {rightIcon}
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

export default Button;
