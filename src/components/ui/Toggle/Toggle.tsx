import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { palette } from '../../../theme/colors';
import { typography } from '../../../theme/typography';

export interface ToggleProps {
  /** 활성화 상태 */
  value?: boolean;
  /** 라벨 텍스트 */
  label?: string;
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 상태 변경 핸들러 */
  onValueChange?: (value: boolean) => void;
  /** 추가 스타일 */
  style?: StyleProp<ViewStyle>;
}

// Figma 디자인 기반 상수
const TRACK_WIDTH = 40;
const TRACK_HEIGHT = 24;
const TRACK_PADDING = 4;
const THUMB_SIZE = 16;
const THUMB_TRAVEL = TRACK_WIDTH - TRACK_PADDING * 2 - THUMB_SIZE; // 16px

export function Toggle({
  value = false,
  label,
  disabled = false,
  onValueChange,
  style,
}: ToggleProps) {
  const translateX = useRef(new Animated.Value(value ? THUMB_TRAVEL : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: value ? THUMB_TRAVEL : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [value, translateX]);

  const handlePress = () => {
    if (!disabled && onValueChange) {
      onValueChange(!value);
    }
  };

  return (
    <Pressable
      style={[styles.container, disabled && styles.disabled, style]}
      onPress={handlePress}
      disabled={disabled}
    >
      {/* Toggle Track */}
      <View style={[styles.track, !value && styles.trackOff]}>
        {/* Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX }] },
          ]}
        />
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
  },
  disabled: {
    opacity: 0.5,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: 500,
    backgroundColor: '#1A2E28',  // Figma primary dark
    padding: TRACK_PADDING,
    justifyContent: 'center',
  },
  trackOff: {
    opacity: 0.25,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 50,
    backgroundColor: palette.neutral[50],  // #FAFAF9
  },
  label: {
    fontSize: 16,
    fontWeight: typography.fontWeight.regular,
    color: palette.neutral[900],
    letterSpacing: -0.4,
    lineHeight: 24,
  },
});

export default Toggle;
