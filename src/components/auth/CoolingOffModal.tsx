import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface CoolingOffModalProps {
  visible: boolean;
  withdrawnAt: string;
  rejoinAvailableAt: string;
  onClose: () => void;
}

function formatKoreanDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}년 ${mm}월 ${dd}일`;
  } catch {
    return isoString;
  }
}

export function CoolingOffModal({
  visible,
  withdrawnAt,
  rejoinAvailableAt,
  onClose,
}: CoolingOffModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>최근 탈퇴한 이메일입니다</Text>
          <Text style={styles.message}>
            30일 이내에 탈퇴한 계정으로는 재가입할 수 없습니다.
          </Text>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>탈퇴일</Text>
            <Text style={styles.dateValue}>{formatKoreanDate(withdrawnAt)}</Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>재가입 가능일</Text>
            <Text style={styles.dateValue}>{formatKoreanDate(rejoinAvailableAt)}</Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>확인</Text>
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
  dateBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBE8',
  },
  dateLabel: {
    fontSize: 14,
    color: '#737370',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#292928',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#FA5252',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
