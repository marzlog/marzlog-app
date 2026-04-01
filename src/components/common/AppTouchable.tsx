import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet } from 'react-native';

const DEFAULT_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export function AppTouchable({ style, hitSlop, activeOpacity, children, ...rest }: TouchableOpacityProps) {
  return (
    <TouchableOpacity
      style={[styles.base, style]}
      hitSlop={hitSlop ?? DEFAULT_HIT_SLOP}
      activeOpacity={activeOpacity ?? 0.7}
      {...rest}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    justifyContent: 'center',
  },
});

export default AppTouchable;
