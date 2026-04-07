import React from 'react';
import { Platform, TouchableOpacity, TouchableOpacityProps, StyleSheet, View } from 'react-native';

const DEFAULT_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const isWeb = Platform.OS === 'web';

export function AppTouchable({ style, hitSlop, activeOpacity, onPress, children, ...rest }: TouchableOpacityProps) {
  if (isWeb) {
    return (
      <View
        style={[styles.base, styles.web, style]}
        // @ts-ignore — web-only onClick binding
        onClick={onPress}
        {...rest}
      >
        {children}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.base, style]}
      hitSlop={hitSlop ?? DEFAULT_HIT_SLOP}
      activeOpacity={activeOpacity ?? 0.7}
      onPress={onPress}
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
  web: {
    cursor: 'pointer',
  } as any,
});

export default AppTouchable;
