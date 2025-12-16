/**
 * MarZlog Design System - Typography
 *
 * Font Family: Pretendard (Korean optimized)
 * Fallback: System fonts
 */

import { Platform, TextStyle } from 'react-native';

// ============================================
// Font Family
// ============================================
export const fontFamily = {
  regular: Platform.select({
    ios: 'Pretendard-Regular',
    android: 'Pretendard-Regular',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'Pretendard-Medium',
    android: 'Pretendard-Medium',
    default: 'System',
  }),
  semibold: Platform.select({
    ios: 'Pretendard-SemiBold',
    android: 'Pretendard-SemiBold',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'Pretendard-Bold',
    android: 'Pretendard-Bold',
    default: 'System',
  }),
} as const;

// ============================================
// Font Sizes
// ============================================
export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

// ============================================
// Line Heights
// ============================================
export const lineHeight = {
  xs: 14,
  sm: 16,
  md: 20,
  base: 24,
  lg: 28,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 44,
  '5xl': 56,
} as const;

// ============================================
// Letter Spacing
// ============================================
export const letterSpacing = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
} as const;

// ============================================
// Font Weights (for system fonts)
// ============================================
export const fontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
} as const;

// ============================================
// Text Styles (Pre-defined combinations)
// ============================================
export const textStyles = {
  // Display - Large titles
  displayLarge: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['5xl'],
    lineHeight: lineHeight['5xl'],
    letterSpacing: letterSpacing.tighter,
  } as TextStyle,

  displayMedium: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['4xl'],
    letterSpacing: letterSpacing.tighter,
  } as TextStyle,

  displaySmall: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
    letterSpacing: letterSpacing.tight,
  } as TextStyle,

  // Headings
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
    letterSpacing: letterSpacing.tight,
  } as TextStyle,

  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    letterSpacing: letterSpacing.tight,
  } as TextStyle,

  h3: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  h4: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  h5: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  h6: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  // Body
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  bodyMedium: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  // Labels
  labelLarge: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    letterSpacing: letterSpacing.wide,
  } as TextStyle,

  labelMedium: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    letterSpacing: letterSpacing.wide,
  } as TextStyle,

  labelSmall: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    letterSpacing: letterSpacing.wide,
  } as TextStyle,

  // Caption
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  captionSmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  // Button
  buttonLarge: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    letterSpacing: letterSpacing.wide,
  } as TextStyle,

  buttonMedium: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    letterSpacing: letterSpacing.wide,
  } as TextStyle,

  buttonSmall: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    letterSpacing: letterSpacing.wide,
  } as TextStyle,

  // Link
  link: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    letterSpacing: letterSpacing.normal,
    textDecorationLine: 'underline',
  } as TextStyle,
} as const;

// ============================================
// Typography Object Export
// ============================================
export const typography = {
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  fontWeight,
  styles: textStyles,
} as const;

// Type exports
export type TextStyleName = keyof typeof textStyles;
export type FontSize = keyof typeof fontSize;
export type LineHeight = keyof typeof lineHeight;
