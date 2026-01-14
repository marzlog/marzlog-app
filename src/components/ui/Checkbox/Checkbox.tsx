import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { palette } from '../../../theme/colors';
import { typography } from '../../../theme/typography';

// Checkbox State (Figma 기반)
export type CheckboxState = 'unchecked' | 'intermediate' | 'checked';

export interface CheckboxProps {
  /** 체크 상태 */
  checked?: boolean;
  /** 중간 상태 (부분 선택) */
  intermediate?: boolean;
  /** 라벨 텍스트 */
  label?: string;
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 상태 변경 핸들러 */
  onPress?: (checked: boolean) => void;
  /** 추가 스타일 */
  style?: StyleProp<ViewStyle>;
}

// Checkmark SVG 아이콘
function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M13.3334 4L6.00008 11.3333L2.66675 8"
        stroke="#FAFAF9"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Intermediate (minus) SVG 아이콘
function IntermediateIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M4 8H12"
        stroke="#FAFAF9"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function Checkbox({
  checked = false,
  intermediate = false,
  label,
  disabled = false,
  onPress,
  style,
}: CheckboxProps) {
  const state: CheckboxState = intermediate
    ? 'intermediate'
    : checked
    ? 'checked'
    : 'unchecked';

  const isActive = state !== 'unchecked';

  const handlePress = () => {
    if (!disabled && onPress) {
      onPress(!checked);
    }
  };

  return (
    <Pressable
      style={[styles.container, disabled && styles.disabled, style]}
      onPress={handlePress}
      disabled={disabled}
    >
      {/* Checkbox Box */}
      <View
        style={[
          styles.checkbox,
          isActive ? styles.checkboxActive : styles.checkboxInactive,
        ]}
      >
        {state === 'checked' && <CheckIcon />}
        {state === 'intermediate' && <IntermediateIcon />}
      </View>

      {/* Label */}
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
  },
  disabled: {
    opacity: 0.5,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInactive: {
    backgroundColor: palette.neutral[200],  // #EBEBE8
    borderWidth: 1,
    borderColor: palette.neutral[900],      // #292928
  },
  checkboxActive: {
    backgroundColor: '#1A2E28',              // Figma primary dark
    borderWidth: 1,
    borderColor: '#1A2E28',
  },
  label: {
    fontSize: 16,
    fontWeight: typography.fontWeight.regular,
    color: palette.neutral[900],
    letterSpacing: -0.4,
    lineHeight: 24,
  },
});

export default Checkbox;
