import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { borderRadius, fontScaleCap, palette, spacing, typography } from '@/src/theme';
import type { PlusColors } from './plusColors';

/**
 * Plus 화면 공용 주 버튼(결제·완료 화면) — 코랄 채움, 흰 글자. 시안 01·03.
 * 글자 확대에서 잘리지 않게 고정 height 대신 minHeight·줄바꿈 허용.
 */
interface PlusCtaProps {
  label: string;
  onPress: () => void;
  /** plusColors(theme, isDark) 결과 — 라이트/다크 분기는 화면에서 한 번만 계산한다 */
  colors: PlusColors;
  /** 진행 중 — 스피너 표시 + 누름 막음 */
  loading?: boolean;
  disabled?: boolean;
}

export function PlusCta({ label, onPress, colors, loading = false, disabled = false }: PlusCtaProps) {
  const inactive = loading || disabled;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.cta, { backgroundColor: inactive ? colors.ctaDisabled : colors.ctaBackground }]}
    >
      {loading ? (
        <ActivityIndicator color={palette.neutral[0]} />
      ) : (
        <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.text, { color: palette.neutral[0] }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cta: {
    minHeight: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, textAlign: 'center' },
});
