// MarZlog 브랜드 컬러 (로고 기반)
export const colors = {
  // Brand
  brand: {
    primary: '#F08E76',
    secondary: '#EC6754',
    light: '#F4B8A8',
    dark: '#040000',
  },

  // Primary Scale
  primary: {
    50: '#FEF5F3',
    100: '#FDE8E4',
    200: '#FBD5CD',
    300: '#F8B8AA',
    400: '#F08E76',
    500: '#EC6754',
    600: '#D94D3A',
    700: '#B53D2D',
    800: '#963429',
    900: '#7C2F28',
  },

  // Gray Scale
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Background
  background: '#FFFFFF',
  surface: '#FAFAFA',

  // Text
  text: {
    primary: '#040000',
    secondary: '#525252',
    disabled: '#A3A3A3',
    inverse: '#FFFFFF',
  },
} as const;

export type Colors = typeof colors;
