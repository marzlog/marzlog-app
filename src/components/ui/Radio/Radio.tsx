import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { palette } from '../../../theme/colors';
import { typography } from '../../../theme/typography';

export interface RadioProps {
  /** 선택 상태 */
  selected?: boolean;
  /** 라벨 텍스트 */
  label?: string;
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 선택 핸들러 */
  onPress?: () => void;
  /** 추가 스타일 */
  style?: StyleProp<ViewStyle>;
}

export function Radio({
  selected = false,
  label,
  disabled = false,
  onPress,
  style,
}: RadioProps) {
  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  return (
    <Pressable
      style={[styles.container, disabled && styles.disabled, style]}
      onPress={handlePress}
      disabled={disabled}
    >
      {/* Radio Circle */}
      <View
        style={[
          styles.radio,
          selected ? styles.radioSelected : styles.radioUnselected,
        ]}
      >
        {selected && <View style={styles.radioDot} />}
      </View>

      {/* Label */}
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

// RadioGroup for managing multiple radio buttons
export interface RadioGroupProps {
  /** 선택된 값 */
  value?: string;
  /** 값 변경 핸들러 */
  onValueChange?: (value: string) => void;
  /** 옵션 배열 */
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  /** 방향 */
  direction?: 'horizontal' | 'vertical';
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 추가 스타일 */
  style?: StyleProp<ViewStyle>;
}

export function RadioGroup({
  value,
  onValueChange,
  options,
  direction = 'vertical',
  disabled = false,
  style,
}: RadioGroupProps) {
  return (
    <View
      style={[
        styles.groupContainer,
        direction === 'horizontal' ? styles.groupHorizontal : styles.groupVertical,
        style,
      ]}
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          selected={value === option.value}
          label={option.label}
          disabled={disabled || option.disabled}
          onPress={() => onValueChange?.(option.value)}
        />
      ))}
    </View>
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
  radio: {
    width: 18,
    height: 18,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.neutral[900],  // #292928
  },
  radioUnselected: {
    backgroundColor: palette.neutral[200],  // #EBEBE8
  },
  radioSelected: {
    backgroundColor: '#1A2E28',  // Figma primary dark
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 16,
    backgroundColor: palette.neutral[50],  // #FAFAF9
  },
  label: {
    fontSize: 16,
    fontWeight: typography.fontWeight.regular,
    color: palette.neutral[900],
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  groupContainer: {
    gap: 12,
  },
  groupHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  groupVertical: {
    flexDirection: 'column',
  },
});

export default Radio;
