import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '../../store/settingsStore';

interface PinInputProps {
  onComplete: (pin: string) => void;
  title: string;
  subtitle?: string;
  error?: string | null;
  lockoutSeconds?: number;
}

const PIN_LENGTH = 4;

export function PinInput({ onComplete, title, subtitle, error, lockoutSeconds }: PinInputProps) {
  const [pin, setPin] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  useEffect(() => {
    if (error) {
      setPin('');
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  const handlePress = useCallback((digit: string) => {
    if (lockoutSeconds && lockoutSeconds > 0) return;
    setPin(prev => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = prev + digit;
      if (next.length === PIN_LENGTH) {
        setTimeout(() => onComplete(next), 100);
      }
      return next;
    });
  }, [onComplete, lockoutSeconds]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
  }, []);

  const isLocked = lockoutSeconds != null && lockoutSeconds > 0;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDark && styles.titleDark]}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, isDark && styles.dotDark, i < pin.length && styles.dotFilled]}
          />
        ))}
      </Animated.View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {isLocked && (
        <Text style={styles.lockoutText}>{lockoutSeconds}s</Text>
      )}

      <View style={styles.keypad}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'delete']].map((row, ri) => (
          <View key={ri} style={styles.keypadRow}>
            {row.map((key, ki) => {
              if (key === '') {
                return <View key={ki} style={styles.keyButton} />;
              }
              if (key === 'delete') {
                return (
                  <TouchableOpacity
                    key={ki}
                    style={[styles.keyButton, isDark && styles.keyButtonDark]}
                    onPress={handleDelete}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="backspace-outline" size={24} color={isDark ? '#D1D5DB' : '#374151'} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={ki}
                  style={[styles.keyButton, isDark && styles.keyButtonDark, isLocked && styles.keyButtonDisabled]}
                  onPress={() => handlePress(key)}
                  activeOpacity={0.6}
                  disabled={isLocked}
                >
                  <Text style={[styles.keyText, isDark && styles.keyTextDark, isLocked && styles.keyTextDisabled]}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#FA5252',
    borderColor: '#FA5252',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 8,
  },
  lockoutText: {
    fontSize: 13,
    color: '#F59E0B',
    marginBottom: 8,
  },
  keypad: {
    marginTop: 24,
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 24,
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  keyButtonDisabled: {
    opacity: 0.4,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#1F2937',
  },
  keyTextDisabled: {
    color: '#9CA3AF',
  },
  titleDark: {
    color: '#F9FAFB',
  },
  dotDark: {
    borderColor: '#4B5563',
  },
  keyButtonDark: {
    backgroundColor: '#1F2937',
  },
  keyTextDark: {
    color: '#F9FAFB',
  },
});

export default PinInput;
