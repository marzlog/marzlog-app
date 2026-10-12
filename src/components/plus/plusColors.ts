/**
 * Plus 화면(결제·완료) 강조 색 — 라이트/다크 분기를 한 곳에서 계산한다. 순수 함수.
 *
 * 라이트: 테마 토큰 그대로(현행). 다크: 테마의 밝은 코랄(primary.default = 400) 대신 브랜드 코랄(500)을
 * 쓰고, 선택 카드는 채움 없이 카드 배경 + 코랄 테두리로 구분한다(테마 토큰 파일은 바꾸지 않는다).
 */
import { palette, type Theme } from '../../theme';

export interface PlusColors {
  ctaBackground: string;
  ctaDisabled: string;
  selectedCardBackground: string;
  selectedCardBorder: string;
  badgeBackground: string;
  badgeText: string;
}

export function plusColors(theme: Theme, isDark: boolean): PlusColors {
  if (isDark) {
    return {
      ctaBackground: palette.primary[500],
      ctaDisabled: theme.primary.disabled,
      selectedCardBackground: theme.surface.primary,
      selectedCardBorder: palette.primary[500],
      badgeBackground: palette.primary[500],
      badgeText: palette.neutral[0],
    };
  }
  return {
    ctaBackground: theme.primary.default,
    ctaDisabled: theme.primary.disabled,
    selectedCardBackground: theme.primary.background,
    selectedCardBorder: theme.primary.default,
    badgeBackground: theme.text.primary,
    badgeText: theme.text.inverse,
  };
}
