/**
 * MarZlog Design System - Spacing
 *
 * Based on 4px grid system
 */

// ============================================
// Spacing Scale (4px base)
// ============================================
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
  '7xl': 96,
  '8xl': 128,
} as const;

// ============================================
// Border Radius
// ============================================
export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  base: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// ============================================
// Border Width
// ============================================
export const borderWidth = {
  none: 0,
  hairline: 0.5,
  thin: 1,
  base: 1.5,
  thick: 2,
  heavy: 3,
} as const;

// ============================================
// Icon Sizes
// ============================================
export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  base: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

// ============================================
// Avatar Sizes
// ============================================
export const avatarSize = {
  xs: 24,
  sm: 32,
  md: 40,
  base: 48,
  lg: 56,
  xl: 64,
  '2xl': 80,
  '3xl': 96,
  '4xl': 128,
} as const;

// ============================================
// Button Sizes (height)
// ============================================
export const buttonHeight = {
  xs: 28,
  sm: 32,
  md: 40,
  base: 48,
  lg: 56,
} as const;

// ============================================
// Input Sizes (height)
// ============================================
export const inputHeight = {
  sm: 36,
  md: 44,
  base: 52,
  lg: 60,
} as const;

// ============================================
// Hit Slop (Touch Target Extension)
// ============================================
export const hitSlop = {
  none: { top: 0, bottom: 0, left: 0, right: 0 },
  xs: { top: 4, bottom: 4, left: 4, right: 4 },
  sm: { top: 8, bottom: 8, left: 8, right: 8 },
  md: { top: 12, bottom: 12, left: 12, right: 12 },
  lg: { top: 16, bottom: 16, left: 16, right: 16 },
} as const;

// ============================================
// Safe Area Insets (defaults, will be overridden)
// ============================================
export const safeAreaInsets = {
  top: 44,
  bottom: 34,
  left: 0,
  right: 0,
} as const;

// ============================================
// Layout Constants
// ============================================
export const layout = {
  // Screen padding
  screenPaddingHorizontal: spacing.base,
  screenPaddingVertical: spacing.base,

  // Header
  headerHeight: 56,
  headerHeightLarge: 96,

  // Tab Bar
  tabBarHeight: 56,
  tabBarHeightWithLabel: 72,

  // Card
  cardPadding: spacing.base,
  cardGap: spacing.md,

  // Grid
  gridGap: spacing.xs,
  gridItemMinWidth: 100,

  // Photo Grid
  photoGridColumns: 4,
  photoGridGap: 2,
  photoAspectRatio: 1, // Square

  // Modal
  modalMaxWidth: 400,
  modalBorderRadius: borderRadius.xl,
} as const;

// Type exports
export type Spacing = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
export type IconSize = keyof typeof iconSize;
