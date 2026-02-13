import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';

export default function WithdrawCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const handleStart = () => {
    router.replace('/');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.content}>
        <Logo size={64} showText={false} color="#1F2937" />
        <Text style={styles.title}>{t('account.withdrawCompleteTitle')}</Text>
        <Text style={styles.description}>{t('account.withdrawCompleteDesc')}</Text>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStart}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>{t('account.startService')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: 24,
  },
  startButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
