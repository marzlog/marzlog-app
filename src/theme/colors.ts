/**
 * MarZlog Design System - Colors
 *
 * Primary: Coral/Salmon (#FA5252)
 * Based on Figma design analysis
 */

export const colors = {
  // ============================================
  // Primary Colors - Coral/Salmon
  // ============================================
  primary: {
    50: '#FFF5F5',
    100: '#FFE3E3',
    200: '#FFC9C9',
    300: '#FFA8A8',
    400: '#FF8787',
    500: '#FA5252', // Main Primary
    600: '#F03E3E',
    700: '#E03131',
    800: '#C92A2A',
    900: '#A51111',
  },

  // ============================================
  // Neutral Colors - Grays
  // ============================================
  neutral: {
    0: '#FFFFFF',
    50: '#F8F9FA',
    100: '#F1F3F5',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#868E96',
    700: '#495057',
    800: '#343A40',
    900: '#212529',
    1000: '#000000',
  },

  // ============================================
  // Accent Colors
  // ============================================
  accent: {
    blue: '#228BE6',
    blueDark: '#1971C2',
    blueLight: '#74C0FC',

    green: '#40C057',
    greenDark: '#2F9E44',
    greenLight: '#8CE99A',

    yellow: '#FAB005',
    yellowDark: '#F59F00',
    yellowLight: '#FFE066',

    orange: '#FD7E14',
    orangeDark: '#E8590C',
    orangeLight: '#FFC078',

    purple: '#7950F2',
    purpleDark: '#6741D9',
    purpleLight: '#B197FC',

    pink: '#E64980',
    pinkDark: '#C2255C',
    pinkLight: '#F783AC',

    teal: '#12B886',
    tealDark: '#099268',
    tealLight: '#63E6BE',
  },

  // ============================================
  // Semantic Colors
  // ============================================
  semantic: {
    success: '#40C057',
    successLight: '#D3F9D8',
    successDark: '#2F9E44',

    warning: '#FAB005',
    warningLight: '#FFF3BF',
    warningDark: '#F59F00',

    error: '#FA5252',
    errorLight: '#FFE3E3',
    errorDark: '#E03131',

    info: '#228BE6',
    infoLight: '#D0EBFF',
    infoDark: '#1971C2',
  },

  // ============================================
  // Background Colors
  // ============================================
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#F1F3F5',
    inverse: '#212529',
  },

  // ============================================
  // Text Colors
  // ============================================
  text: {
    primary: '#212529',
    secondary: '#495057',
    tertiary: '#868E96',
    disabled: '#ADB5BD',
    inverse: '#FFFFFF',
    link: '#228BE6',
  },

  // ============================================
  // Border Colors
  // ============================================
  border: {
    light: '#E9ECEF',
    default: '#DEE2E6',
    dark: '#CED4DA',
    focus: '#FA5252',
  },

  // ============================================
  // Overlay Colors
  // ============================================
  overlay: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.4)',
    dark: 'rgba(0, 0, 0, 0.7)',
    white: 'rgba(255, 255, 255, 0.9)',
  },

  // ============================================
  // Transparent
  // ============================================
  transparent: 'transparent',
} as const;

// Type exports
export type ColorPalette = typeof colors;
export type PrimaryColor = keyof typeof colors.primary;
export type NeutralColor = keyof typeof colors.neutral;
export type AccentColor = keyof typeof colors.accent;
export type SemanticColor = keyof typeof colors.semantic;
