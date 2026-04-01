import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost';

interface AppButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const BG: Record<Variant, string> = {
  primary: '#6366F1',
  secondary: '#E5E7EB',
  ghost: 'transparent',
};
const BG_DARK: Record<Variant, string> = {
  primary: '#4F46E5',
  secondary: '#374151',
  ghost: 'transparent',
};
const TEXT_COLOR: Record<Variant, string> = {
  primary: '#FFFFFF',
  secondary: '#374151',
  ghost: '#6366F1',
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { backgroundColor: BG[variant] },
        variant === 'ghost' && styles.ghost,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      hitSlop={HIT_SLOP}
    >
      {loading ? (
        <ActivityIndicator size="small" color={TEXT_COLOR[variant]} />
      ) : (
        <Text style={[styles.label, { color: TEXT_COLOR[variant] }, textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    paddingHorizontal: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AppButton;
