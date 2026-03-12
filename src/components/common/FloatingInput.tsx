import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, TextInput, View, TextInputProps } from 'react-native';

interface FloatingInputProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  isDark: boolean;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  inputRef?: React.RefObject<TextInput>;
  rightIcon?: React.ReactNode;
  editable?: boolean;
}

export function FloatingInput({
  label,
  value,
  onChangeText,
  isDark,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
  inputRef,
  rightIcon,
  editable = true,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(animValue, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(animValue, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    }
  };

  const labelTop = animValue.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const labelSize = animValue.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const activeColor = '#FF6A5F';
  const lineColor = !editable
    ? (isDark ? '#2D3748' : '#E5E7EB')
    : isFocused
      ? activeColor
      : isDark ? '#374151' : '#D1D5DB';
  const labelColor = !editable
    ? (isDark ? '#4B5563' : '#9CA3AF')
    : isFocused
      ? activeColor
      : isDark ? '#6B7280' : '#9CA3AF';

  return (
    <View style={floatStyles.wrapper}>
      <Animated.Text style={[floatStyles.label, { top: labelTop, fontSize: labelSize, color: labelColor }]}>
        {label}
      </Animated.Text>
      <View style={floatStyles.row}>
        <TextInput
          ref={inputRef}
          style={[floatStyles.input, { color: editable ? (isDark ? '#F9FAFB' : '#111827') : (isDark ? '#6B7280' : '#9CA3AF') }]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          editable={editable}
        />
        {rightIcon}
      </View>
      <View style={[floatStyles.line, { backgroundColor: lineColor }]} />
    </View>
  );
}

const floatStyles = StyleSheet.create({
  wrapper: {
    paddingTop: 18,
    paddingBottom: 4,
    marginBottom: 8,
  },
  label: {
    position: 'absolute',
    left: 0,
    fontWeight: '400',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 6,
    paddingRight: 8,
  },
  line: {
    height: 1.5,
    marginTop: 2,
  },
});
