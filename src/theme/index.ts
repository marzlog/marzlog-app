/**
 * MarZlog Design System - Theme
 *
 * Unified export of all design tokens
 */

// ============================================
// Individual exports
// ============================================
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';

// ============================================
// Named exports for convenience
// ============================================
import { colors } from './colors';
import {
  typography,
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  fontWeight,
  textStyles,
} from './typography';
import {
  spacing,
  borderRadius,
  borderWidth,
  iconSize,
  avatarSize,
  buttonHeight,
  inputHeight,
  hitSlop,
  layout,
} from './spacing';
import { shadows, coloredShadows, cardShadows, applyShadow } from './shadows';

// ============================================
// Theme Object
// ============================================
export const theme = {
  colors,
  typography,
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  fontWeight,
  textStyles,
  spacing,
  borderRadius,
  borderWidth,
  iconSize,
  avatarSize,
  buttonHeight,
  inputHeight,
  hitSlop,
  layout,
  shadows,
  coloredShadows,
  cardShadows,
  applyShadow,
} as const;

// ============================================
// Theme Type
// ============================================
export type Theme = typeof theme;

// ============================================
// Default export
// ============================================
export default theme;
