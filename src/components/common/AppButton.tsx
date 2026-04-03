import React from 'react';
import {
  Platform,
  TouchableOpacity,
  Text,
  View,
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
const isWeb = Platform.OS === 'web';

const BG: Record<Variant, string> = {
  primary: '#6366F1',
  secondary: '#E5E7EB',
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

  const content = loading ? (
    <ActivityIndicator size="small" color={TEXT_COLOR[variant]} />
  ) : (
    <Text style={[styles.label, { color: TEXT_COLOR[variant] }, textStyle]}>
      {label}
    </Text>
  );

  const buttonStyle = [
    styles.base,
    { backgroundColor: BG[variant] },
    variant === 'ghost' && styles.ghost,
    isDisabled && styles.disabled,
    isWeb && styles.web,
    style,
  ];

  if (isWeb) {
    return (
      <View
        style={buttonStyle}
        // @ts-ignore — web-only onClick binding
        onClick={isDisabled ? undefined : onPress}
      >
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      hitSlop={HIT_SLOP}
    >
      {content}
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
  web: {
    cursor: 'pointer',
  } as any,
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AppButton;
