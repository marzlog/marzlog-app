/**
 * MarZlog Design System - Shadows
 *
 * Platform-specific shadow implementations
 */

import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';

// ============================================
// Shadow Types
// ============================================
type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

// ============================================
// Shadow Factory
// ============================================
const createShadow = (
  offsetY: number,
  blurRadius: number,
  opacity: number,
  elevation: number,
  color: string = colors.neutral[1000]
): ShadowStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: blurRadius,
  elevation,
});

// ============================================
// Shadows Scale
// ============================================
export const shadows = {
  none: createShadow(0, 0, 0, 0),

  xs: createShadow(1, 2, 0.05, 1),

  sm: createShadow(1, 3, 0.1, 2),

  md: createShadow(2, 4, 0.1, 3),

  base: createShadow(4, 6, 0.1, 4),

  lg: createShadow(6, 8, 0.12, 6),

  xl: createShadow(8, 12, 0.14, 8),

  '2xl': createShadow(12, 16, 0.16, 12),

  '3xl': createShadow(16, 24, 0.2, 16),

  // Inner shadow (iOS only, Android doesn't support)
  inner: Platform.select({
    ios: {
      shadowColor: colors.neutral[1000],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 0,
    },
    android: {
      elevation: 0,
    },
    default: {},
  }) as ShadowStyle,
} as const;

// ============================================
// Colored Shadows
// ============================================
export const coloredShadows = {
  primary: createShadow(4, 8, 0.25, 4, colors.primary[500]),
  success: createShadow(4, 8, 0.25, 4, colors.semantic.success),
  warning: createShadow(4, 8, 0.25, 4, colors.semantic.warning),
  error: createShadow(4, 8, 0.25, 4, colors.semantic.error),
  info: createShadow(4, 8, 0.25, 4, colors.semantic.info),
} as const;

// ============================================
// Card Shadows (Common presets)
// ============================================
export const cardShadows = {
  // Flat card (subtle)
  flat: shadows.xs,

  // Raised card (default)
  raised: shadows.sm,

  // Elevated card (prominent)
  elevated: shadows.md,

  // Floating card (modal-like)
  floating: shadows.lg,

  // Photo card
  photo: shadows.sm,

  // Button pressed state
  buttonPressed: shadows.xs,

  // Button normal state
  button: shadows.md,
} as const;

// ============================================
// Apply Shadow Helper
// ============================================
export const applyShadow = (
  level: keyof typeof shadows
): ViewStyle => {
  return shadows[level];
};

// Type exports
export type ShadowLevel = keyof typeof shadows;
export type ColoredShadow = keyof typeof coloredShadows;
