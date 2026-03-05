import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../hooks/useTranslation';
import { PinInput } from './PinInput';

interface PinSetupProps {
  onSetup: (pin: string) => Promise<void>;
  onCancel: () => void;
  isDark: boolean;
}

export function PinSetup({ onSetup, onCancel, isDark }: PinSetupProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'set' | 'confirm'>('set');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFirstPin = useCallback((pin: string) => {
    setFirstPin(pin);
    setStep('confirm');
    setError(null);
  }, []);

  const handleConfirmPin = useCallback(async (pin: string) => {
    if (pin !== firstPin) {
      setError(t('appLock.pinMismatch'));
      setStep('set');
      setFirstPin('');
      return;
    }
    await onSetup(pin);
  }, [firstPin, onSetup, t]);

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </TouchableOpacity>
      </View>

      {step === 'set' ? (
        <PinInput
          onComplete={handleFirstPin}
          title={t('appLock.setPin')}
          error={error}
        />
      ) : (
        <PinInput
          onComplete={handleConfirmPin}
          title={t('appLock.confirmPin')}
          error={error}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PinSetup;
