// MarZlog 브랜드 컬러 (Figma 디자인 기반)
export const colors = {
  // Brand - Figma MO_HOM_0101 기준
  brand: {
    primary: '#FF6A5F',    // 코랄 (secondary-100)
    secondary: '#FF6A5F',
    light: '#FFB3AD',
    dark: '#292928',
  },

  // Primary Scale (코랄 계열)
  primary: {
    50: '#FFF5F4',
    100: '#FFE8E6',
    200: '#FFD5D1',
    300: '#FFB3AD',
    400: '#FF8A82',
    500: '#FF6A5F',
    600: '#E85A50',
    700: '#C44A42',
    800: '#A03D36',
    900: '#7C302B',
  },

  // Neutral Scale (Figma 기준)
  neutral: {
    '0.5': '#FAFAF9',  // surface-neutral-0.5
    1: '#F5F5F4',
    2: '#EBEBE8',      // surface-neutral-2
    3: '#E0E0DD',
    4: '#D4D4D1',
    5: '#A8A8A5',
    6: '#737370',
    7: '#525250',
    8: '#3D3D3B',
    9: '#292928',      // text-neutral-9
  },

  // Gray Scale (호환성 유지)
  gray: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#EBEBE8',
    300: '#D4D4D1',
    400: '#A8A8A5',
    500: '#737370',
    600: '#525250',
    700: '#3D3D3B',
    800: '#292928',
    900: '#1A1A19',
  },

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Background & Surface
  background: '#FAFAF9',
  surface: '#FAFAF9',

  // Text
  text: {
    primary: '#292928',
    secondary: '#525250',
    disabled: '#A8A8A5',
    inverse: '#FAFAF9',
  },
} as const;

export type Colors = typeof colors;
