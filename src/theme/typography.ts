// MarZlog 타이포그래피
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export type Typography = typeof typography;

/**
 * 글자 크기 확대 상한 — Text 의 maxFontSizeMultiplier(B-SHEET-FONT-SCALE). 손쉬운 사용 "더 큰 글자" 최대에서
 * 결제 관련 화면의 버튼이 밀려나지 않게 제목·본문을 나눠 막는다. 화면마다 숫자를 쓰지 말고 이 값을 쓴다.
 *  - title: 화면·시트 제목(1.3배)
 *  - body: 본문·버튼·표(1.5배)
 */
export const fontScaleCap = {
  title: 1.3,
  body: 1.5,
} as const;
