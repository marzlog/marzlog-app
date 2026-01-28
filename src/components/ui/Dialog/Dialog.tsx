/**
 * Dialog Component (Figma 기반)
 *
 * 7가지 케이스 지원:
 * 1. 수정 확인 (confirm)
 * 2. 저장 확인 (confirm)
 * 3. 입력 안내 (alert)
 * 4. 요청 실패 (alert)
 * 5. 취소 확인 (confirm)
 * 6. 요청 제한 (alert)
 * 7. 삭제 확인 (danger)
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { palette, lightTheme, darkTheme } from '../../../theme/colors';
import { typography } from '../../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DIALOG_WIDTH = Math.min(343, SCREEN_WIDTH - 32);

export type DialogVariant = 'confirm' | 'alert' | 'danger';

export interface DialogProps {
  /** 다이얼로그 표시 여부 */
  visible: boolean;
  /** 제목 */
  title: string;
  /** 설명 (선택) */
  description?: string;
  /** 확인 버튼 텍스트 */
  confirmText?: string;
  /** 취소 버튼 텍스트 */
  cancelText?: string;
  /** 확인 버튼 클릭 핸들러 */
  onConfirm: () => void;
  /** 취소 버튼 클릭 핸들러 (없으면 단일 버튼 모드) */
  onCancel?: () => void;
  /** 다이얼로그 타입 */
  variant?: DialogVariant;
  /** 다크모드 */
  isDark?: boolean;
}

export function Dialog({
  visible,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  variant = 'confirm',
  isDark = false,
}: DialogProps) {
  const theme = isDark ? darkTheme : lightTheme;
  const hasCancel = !!onCancel;

  // 확인 버튼 색상
  const getConfirmButtonColor = () => {
    switch (variant) {
      case 'danger':
        return palette.error[500]; // #EF4444
      case 'alert':
        return palette.primary[500]; // #FF6A5F
      case 'confirm':
      default:
        return palette.primary[500]; // #FF6A5F
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel || onConfirm}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.container,
          { backgroundColor: isDark ? palette.neutral[800] : palette.neutral[0] }
        ]}>
          {/* Title */}
          <Text style={[
            styles.title,
            { color: isDark ? palette.neutral[50] : palette.neutral[900] }
          ]}>
            {title}
          </Text>

          {/* Description */}
          {description && (
            <Text style={[
              styles.description,
              { color: isDark ? palette.neutral[400] : palette.neutral[600] }
            ]}>
              {description}
            </Text>
          )}

          {/* Buttons */}
          <View style={[
            styles.buttonContainer,
            !hasCancel && styles.buttonContainerSingle
          ]}>
            {hasCancel && (
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: isDark ? palette.neutral[700] : palette.neutral[200] },
                  pressed && styles.buttonPressed,
                ]}
                onPress={onCancel}
              >
                <Text style={[
                  styles.buttonText,
                  { color: isDark ? palette.neutral[100] : palette.neutral[900] }
                ]}>
                  {cancelText}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                { backgroundColor: getConfirmButtonColor() },
                pressed && styles.buttonPressed,
                !hasCancel && styles.buttonFull,
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.buttonText, styles.confirmButtonText]}>
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: DIALOG_WIDTH,
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 32,
    borderRadius: 16,
    gap: 24,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    textAlign: 'center',
    lineHeight: 26,
  },
  description: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: -8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonContainerSingle: {
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonFull: {
    flex: 1,
  },
  cancelButton: {
    // 색상은 동적으로 적용
  },
  confirmButton: {
    // 색상은 동적으로 적용
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  confirmButtonText: {
    color: '#252525',
  },
});

export default Dialog;
