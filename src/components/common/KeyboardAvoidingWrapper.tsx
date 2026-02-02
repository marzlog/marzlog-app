import React, { ReactNode, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  ViewStyle,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAvoidingWrapperProps {
  children: ReactNode;
  style?: ViewStyle;
  /** 키보드 외부 터치 시 닫기 (기본: true, 웹에서는 무시) */
  dismissOnTouchOutside?: boolean;
  /** SafeArea 하단 고려 (기본: false) */
  includeBottomInset?: boolean;
  /** 추가 키보드 오프셋 (기본: 0) */
  keyboardVerticalOffset?: number;
}

const isWeb = Platform.OS === 'web';

/**
 * 키보드 회피 래퍼 컴포넌트
 * - 웹: 일반 View 사용 (KeyboardAvoidingView 비활성화)
 * - iOS: behavior="padding"
 * - Android: behavior="height"
 * - 키보드 외부 터치 시 닫기 (모바일만)
 * - SafeArea 자동 처리
 */
export function KeyboardAvoidingWrapper({
  children,
  style,
  dismissOnTouchOutside = true,
  includeBottomInset = false,
  keyboardVerticalOffset = 0,
}: KeyboardAvoidingWrapperProps) {
  const insets = useSafeAreaInsets();

  // 웹에서는 일반 View 사용
  if (isWeb) {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  // iOS에서 bottom inset 고려
  const offset = Platform.select({
    ios: keyboardVerticalOffset + (includeBottomInset ? insets.bottom : 0),
    android: keyboardVerticalOffset,
    default: keyboardVerticalOffset,
  });

  const content = (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={offset}
    >
      {children}
    </KeyboardAvoidingView>
  );

  // 모바일에서만 외부 터치로 키보드 닫기
  if (dismissOnTouchOutside) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {content}
      </TouchableWithoutFeedback>
    );
  }

  return content;
}

/**
 * 입력 필드 간 포커스 이동을 위한 ref 관리 훅
 *
 * 사용법:
 * const { refs, focusNext, focusInput } = useInputRefs(3);
 *
 * <TextInput
 *   ref={refs[0]}
 *   onSubmitEditing={() => focusNext(0)}
 *   returnKeyType="next"
 * />
 * <TextInput
 *   ref={refs[1]}
 *   onSubmitEditing={() => focusNext(1)}
 *   returnKeyType="next"
 * />
 * <TextInput
 *   ref={refs[2]}
 *   onSubmitEditing={handleSubmit}
 *   returnKeyType="done"
 * />
 */
export function useInputRefs(count: number) {
  const refs = useRef<(TextInput | null)[]>(Array(count).fill(null)).current;

  const setRef = (index: number) => (ref: TextInput | null) => {
    refs[index] = ref;
  };

  const focusNext = (currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < count && refs[nextIndex]) {
      refs[nextIndex]?.focus();
    } else {
      Keyboard.dismiss();
    }
  };

  const focusInput = (index: number) => {
    if (index >= 0 && index < count && refs[index]) {
      refs[index]?.focus();
    }
  };

  return { refs, setRef, focusNext, focusInput };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default KeyboardAvoidingWrapper;
