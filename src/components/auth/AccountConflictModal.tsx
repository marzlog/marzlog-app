import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

type ConflictCode = 'ACCOUNT_ALREADY_EXISTS' | 'ACCOUNT_EXISTS_DIFFERENT_PROVIDER';

interface AccountConflictModalProps {
  visible: boolean;
  conflictCode: ConflictCode;
  registeredProvider: string;
  emailMasked: string;
  onClose: () => void;
  onLoginPress?: () => void;
}

function providerLabel(provider: string): string {
  switch (provider) {
    case 'apple':
      return 'Apple';
    case 'google':
      return 'Google';
    case 'kakao':
      return '카카오';
    case 'email':
      return '이메일';
    default:
      return provider;
  }
}

export function AccountConflictModal({
  visible,
  conflictCode,
  registeredProvider,
  emailMasked,
  onClose,
  onLoginPress,
}: AccountConflictModalProps) {
  const label = providerLabel(registeredProvider);
  const isSameProvider = conflictCode === 'ACCOUNT_ALREADY_EXISTS';

  const title = isSameProvider
    ? '이미 가입된 이메일입니다'
    : `${label}로 가입된 이메일입니다`;

  const message = isSameProvider
    ? '아래 이메일로 이미 가입되어 있습니다. 로그인해주세요.'
    : `이 이메일은 ${label} 로그인으로 이미 가입되어 있습니다.\n${label}로 로그인해주세요.`;

  const ctaLabel = isSameProvider
    ? '로그인 화면으로'
    : `${label}로 로그인`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.emailBlock}>
            <Text style={styles.emailLabel}>이메일</Text>
            <Text style={styles.emailValue}>{emailMasked}</Text>
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onLoginPress ?? onClose}
          >
            <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#292928',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#525250',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F4',
    borderRadius: 8,
    marginBottom: 20,
  },
  emailLabel: {
    fontSize: 14,
    color: '#737370',
  },
  emailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#292928',
  },
  primaryButton: {
    backgroundColor: '#FA5252',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#737370',
    fontSize: 14,
  },
});
