// MarZlog 브랜드 컬러 (Figma 디자인 기반)

// Primitive Colors (기본 색상 팔레트)
export const palette = {
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

  // Neutral Scale
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#EBEBE8',
    300: '#E0E0DD',
    400: '#D4D4D1',
    500: '#A8A8A5',
    600: '#737370',
    700: '#525250',
    800: '#3D3D3B',
    900: '#292928',
    950: '#1A1A19',
    1000: '#000000',
  },

  // Semantic Colors
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#22C55E',
    600: '#16A34A',
    900: '#14532D',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    900: '#78350F',
  },
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    900: '#7F1D1D',
  },
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    900: '#1E3A8A',
  },

  // Tag Colors (Figma 디자인 토큰)
  tag: {
    gray: '#EBEFF0',
    personal: '#FEE6C9',
    important: '#FFD9D9',
    fun: '#D2F0FF',
    black: '#252525',
  },
} as const;

// Light Theme
export const lightTheme = {
  // Background
  background: {
    primary: palette.neutral[50],    // 메인 배경
    secondary: palette.neutral[100], // 섹션 배경
    tertiary: palette.neutral[200],  // 카드 배경
  },

  // Surface (카드, 모달 등)
  surface: {
    primary: palette.neutral[0],     // 카드 배경
    secondary: palette.neutral[50],  // 서브 영역
    elevated: palette.neutral[0],    // 떠있는 요소
  },

  // Text
  text: {
    primary: palette.neutral[900],   // 기본 텍스트
    secondary: palette.neutral[700], // 보조 텍스트
    tertiary: palette.neutral[600],  // 힌트 텍스트
    disabled: palette.neutral[500],  // 비활성 텍스트
    inverse: palette.neutral[0],     // 반전 텍스트
  },

  // Border
  border: {
    default: palette.neutral[300],   // 기본 테두리
    light: palette.neutral[200],     // 연한 테두리
    strong: palette.neutral[400],    // 강한 테두리
  },

  // Primary (브랜드)
  primary: {
    default: palette.primary[500],   // 버튼, 링크
    hover: palette.primary[600],
    active: palette.primary[700],
    disabled: palette.primary[300],
    background: palette.primary[50],
    text: palette.neutral[0],
  },

  // Secondary
  secondary: {
    default: palette.neutral[700],
    hover: palette.neutral[800],
    active: palette.neutral[900],
    disabled: palette.neutral[400],
    background: palette.neutral[100],
    text: palette.neutral[0],
  },

  // Semantic
  success: {
    default: palette.success[500],
    background: palette.success[50],
    text: palette.success[900],
  },
  warning: {
    default: palette.warning[500],
    background: palette.warning[50],
    text: palette.warning[900],
  },
  error: {
    default: palette.error[500],
    background: palette.error[50],
    text: palette.error[900],
  },
  info: {
    default: palette.info[500],
    background: palette.info[50],
    text: palette.info[900],
  },

  // Tags
  tag: palette.tag,

  // Icon
  icon: {
    primary: palette.neutral[900],
    secondary: palette.neutral[600],
    disabled: palette.neutral[400],
    inverse: palette.neutral[0],
  },

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

// Dark Theme
export const darkTheme = {
  // Background
  background: {
    primary: palette.neutral[950],   // 메인 배경
    secondary: palette.neutral[900], // 섹션 배경
    tertiary: palette.neutral[800],  // 카드 배경
  },

  // Surface (카드, 모달 등)
  surface: {
    primary: palette.neutral[900],   // 카드 배경
    secondary: palette.neutral[800], // 서브 영역
    elevated: palette.neutral[800],  // 떠있는 요소
  },

  // Text
  text: {
    primary: palette.neutral[50],    // 기본 텍스트
    secondary: palette.neutral[300], // 보조 텍스트
    tertiary: palette.neutral[400],  // 힌트 텍스트
    disabled: palette.neutral[600],  // 비활성 텍스트
    inverse: palette.neutral[900],   // 반전 텍스트
  },

  // Border
  border: {
    default: palette.neutral[700],   // 기본 테두리
    light: palette.neutral[800],     // 연한 테두리
    strong: palette.neutral[600],    // 강한 테두리
  },

  // Primary (브랜드)
  primary: {
    default: palette.primary[400],   // 다크모드에서 밝은 톤
    hover: palette.primary[300],
    active: palette.primary[500],
    disabled: palette.primary[700],
    background: palette.primary[900],
    text: palette.neutral[0],
  },

  // Secondary
  secondary: {
    default: palette.neutral[300],
    hover: palette.neutral[200],
    active: palette.neutral[100],
    disabled: palette.neutral[600],
    background: palette.neutral[800],
    text: palette.neutral[900],
  },

  // Semantic (다크모드에서 밝은 톤)
  success: {
    default: palette.success[500],
    background: 'rgba(34, 197, 94, 0.15)',
    text: palette.success[100],
  },
  warning: {
    default: palette.warning[500],
    background: 'rgba(245, 158, 11, 0.15)',
    text: palette.warning[100],
  },
  error: {
    default: palette.error[500],
    background: 'rgba(239, 68, 68, 0.15)',
    text: palette.error[100],
  },
  info: {
    default: palette.info[500],
    background: 'rgba(59, 130, 246, 0.15)',
    text: palette.info[100],
  },

  // Tags (다크모드용 조정)
  tag: {
    gray: '#3D4045',
    personal: '#5C4A35',
    important: '#5C3535',
    fun: '#354555',
    black: '#E0E0E0',
  },

  // Icon
  icon: {
    primary: palette.neutral[50],
    secondary: palette.neutral[400],
    disabled: palette.neutral[600],
    inverse: palette.neutral[900],
  },

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
} as const;

// 기본 테마 타입 (light와 dark 모두 호환)
export interface Theme {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  surface: {
    primary: string;
    secondary: string;
    elevated: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
    inverse: string;
  };
  border: {
    default: string;
    light: string;
    strong: string;
  };
  primary: {
    default: string;
    hover: string;
    active: string;
    disabled: string;
    background: string;
    text: string;
  };
  secondary: {
    default: string;
    hover: string;
    active: string;
    disabled: string;
    background: string;
    text: string;
  };
  success: {
    default: string;
    background: string;
    text: string;
  };
  warning: {
    default: string;
    background: string;
    text: string;
  };
  error: {
    default: string;
    background: string;
    text: string;
  };
  info: {
    default: string;
    background: string;
    text: string;
  };
  tag: {
    gray: string;
    personal: string;
    important: string;
    fun: string;
    black: string;
  };
  icon: {
    primary: string;
    secondary: string;
    disabled: string;
    inverse: string;
  };
  overlay: string;
}

// 테마 선택 헬퍼
export const getTheme = (isDark: boolean): Theme =>
  isDark ? (darkTheme as Theme) : (lightTheme as Theme);

// 하위 호환성을 위한 기존 colors 객체
export const colors = {
  brand: {
    primary: palette.primary[500],
    secondary: palette.primary[500],
    light: palette.primary[300],
    dark: palette.neutral[900],
  },
  primary: palette.primary,
  neutral: {
    '0.5': palette.neutral[50],
    1: palette.neutral[100],
    2: palette.neutral[200],
    3: palette.neutral[300],
    4: palette.neutral[400],
    5: palette.neutral[500],
    6: palette.neutral[600],
    7: palette.neutral[700],
    8: palette.neutral[800],
    9: palette.neutral[900],
  },
  gray: {
    50: palette.neutral[50],
    100: palette.neutral[100],
    200: palette.neutral[200],
    300: palette.neutral[400],
    400: palette.neutral[500],
    500: palette.neutral[600],
    600: palette.neutral[700],
    700: palette.neutral[800],
    800: palette.neutral[900],
    900: palette.neutral[950],
  },
  tag: palette.tag,
  success: palette.success[500],
  warning: palette.warning[500],
  error: palette.error[500],
  info: palette.info[500],
  background: palette.neutral[50],
  surface: palette.neutral[50],
  text: {
    primary: palette.neutral[900],
    secondary: palette.neutral[700],
    disabled: palette.neutral[500],
    inverse: palette.neutral[50],
  },
} as const;

export type Colors = typeof colors;
