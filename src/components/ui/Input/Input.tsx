import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { palette } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { borderRadius } from '../../../theme/spacing';

// Input State (Figma 기반)
export type InputState = 'empty' | 'filled' | 'active' | 'error' | 'validated';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  /** 라벨 텍스트 */
  label?: string;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 입력 값 */
  value?: string;
  /** 값 변경 핸들러 */
  onChangeText?: (text: string) => void;
  /** 헬퍼 텍스트 */
  helperText?: string;
  /** 에러 메시지 (표시 시 에러 상태로 전환) */
  error?: string;
  /** 유효성 검증 통과 상태 */
  validated?: boolean;
  /** 왼쪽 아이콘 */
  leftIcon?: React.ReactNode;
  /** 오른쪽 아이콘 */
  rightIcon?: React.ReactNode;
  /** 오른쪽 액션 버튼 */
  actionButton?: React.ReactNode;
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 추가 컨테이너 스타일 */
  containerStyle?: StyleProp<ViewStyle>;
  /** 추가 입력 스타일 */
  inputContainerStyle?: StyleProp<ViewStyle>;
}

// Figma 기반 색상
const stateColors = {
  empty: {
    border: palette.neutral[200],         // #EBEBE8
    background: palette.neutral[200],
  },
  filled: {
    border: palette.neutral[200],
    background: palette.neutral[200],
  },
  active: {
    border: '#42AACC',                     // Figma Active 색상
    background: palette.neutral[200],
  },
  error: {
    border: '#E55B5B',                     // Figma Error 색상
    background: palette.neutral[200],
  },
  validated: {
    border: '#5EC046',                     // Figma Validated 색상
    background: palette.neutral[200],
  },
};

export function Input({
  label,
  placeholder = 'Input Empty',
  value,
  onChangeText,
  helperText,
  error,
  validated = false,
  leftIcon,
  rightIcon,
  actionButton,
  disabled = false,
  containerStyle,
  inputContainerStyle,
  ...textInputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  // 상태 결정
  const getState = useCallback((): InputState => {
    if (error) return 'error';
    if (validated) return 'validated';
    if (isFocused) return 'active';
    if (value && value.length > 0) return 'filled';
    return 'empty';
  }, [error, validated, isFocused, value]);

  const state = getState();
  const colors = stateColors[state];
  const hasValue = value && value.length > 0;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Input Container */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
          disabled && styles.disabled,
          inputContainerStyle,
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <View style={[styles.iconContainer, !hasValue && styles.iconFaded]}>
            {leftIcon}
          </View>
        )}

        {/* Text Area */}
        <View style={styles.textContainer}>
          {/* Label (Filled 상태에서 표시) */}
          {label && hasValue && (
            <Text style={styles.label}>{label}</Text>
          )}

          {/* TextInput */}
          <TextInput
            style={[
              styles.input,
              !hasValue && styles.inputPlaceholder,
            ]}
            placeholder={placeholder}
            placeholderTextColor={`${palette.neutral[900]}80`}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!disabled}
            {...textInputProps}
          />
        </View>

        {/* Right Icon */}
        {rightIcon && (
          <View style={[styles.iconContainer, !hasValue && styles.iconFaded]}>
            {rightIcon}
          </View>
        )}

        {/* Action Button */}
        {actionButton && (
          <View style={styles.actionButton}>
            {actionButton}
          </View>
        )}
      </View>

      {/* Helper Text / Error Message */}
      {(helperText || error) && (
        <View style={styles.helperContainer}>
          <Text
            style={[
              styles.helperText,
              error ? styles.errorText : styles.normalHelperText,
            ]}
          >
            {error || helperText}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    gap: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconFaded: {
    opacity: 0.5,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: typography.fontWeight.medium,
    color: palette.neutral[900],
    opacity: 0.75,
    letterSpacing: -0.24,
  },
  input: {
    fontSize: 16,
    fontWeight: typography.fontWeight.medium,
    color: palette.neutral[900],
    letterSpacing: -0.4,
    padding: 0,
    lineHeight: 24,
  },
  inputPlaceholder: {
    opacity: 0.5,
  },
  actionButton: {
    marginLeft: 'auto',
  },
  helperContainer: {
    paddingLeft: 16,
  },
  helperText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: -0.35,
    lineHeight: 21,
  },
  normalHelperText: {
    color: palette.neutral[900],
    opacity: 0.5,
  },
  errorText: {
    color: '#E55B5B',
  },
});

export default Input;
