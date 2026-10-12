import { darkTheme, lightTheme, palette } from '../../../theme';
import { plusColors } from '../plusColors';

describe('plusColors', () => {
  it('라이트: 현행 테마 토큰 그대로', () => {
    expect(plusColors(lightTheme, false)).toEqual({
      ctaBackground: lightTheme.primary.default,
      ctaDisabled: lightTheme.primary.disabled,
      selectedCardBackground: lightTheme.primary.background,
      selectedCardBorder: lightTheme.primary.default,
      badgeBackground: lightTheme.text.primary,
      badgeText: lightTheme.text.inverse,
    });
  });

  it('다크: 선택 카드는 채움 없이 카드 배경 + 코랄 테두리, CTA·배지는 코랄 500, locked 는 현행', () => {
    expect(plusColors(darkTheme, true)).toEqual({
      ctaBackground: palette.primary[500],
      ctaDisabled: darkTheme.primary.disabled,
      selectedCardBackground: darkTheme.surface.primary,
      selectedCardBorder: palette.primary[500],
      badgeBackground: palette.primary[500],
      badgeText: palette.neutral[0],
    });
  });
});
