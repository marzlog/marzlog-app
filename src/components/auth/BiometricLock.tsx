import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '../../store/settingsStore';
import { useAppLockStore } from '../../store/appLockStore';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../hooks/useTranslation';
import { PinInput } from './PinInput';
import { Logo } from '../common/Logo';

const MAX_ATTEMPTS = 5;

export function BiometricLock() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { biometricType, authenticateBiometric, verifyPin, failCount } = useAppLockStore();
  const { logout } = useAuthStore();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const biometricTriedRef = useRef(false);

  // Auto-attempt biometric on mount
  useEffect(() => {
    if (biometricType !== 'none' && !biometricTriedRef.current) {
      biometricTriedRef.current = true;
      handleBiometric();
    }
  }, [biometricType]);

  // Lockout countdown timer
  useEffect(() => {
    const { lockoutUntil } = useAppLockStore.getState();
    if (lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutSeconds(remaining);
        startLockoutTimer(lockoutUntil);
      }
    }
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, []);

  const startLockoutTimer = (until: number) => {
    if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    lockoutTimerRef.current = setInterval(() => {
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutSeconds(0);
        if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
      } else {
        setLockoutSeconds(remaining);
      }
    }, 1000);
  };

  const handleBiometric = useCallback(async () => {
    await authenticateBiometric(
      t('appLock.authenticate'),
      t('appLock.usePin')
    );
  }, [authenticateBiometric, t]);

  const handlePinComplete = useCallback(async (pin: string) => {
    const success = await verifyPin(pin);
    if (!success) {
      const currentFail = useAppLockStore.getState().failCount;
      if (currentFail >= MAX_ATTEMPTS) {
        await logout();
        return;
      }
      const remaining = MAX_ATTEMPTS - currentFail;
      setPinError(t('appLock.wrongPin') + ' — ' + t('appLock.attemptsLeft', { count: remaining }));

      const { lockoutUntil } = useAppLockStore.getState();
      if (lockoutUntil) {
        const secs = Math.ceil((lockoutUntil - Date.now()) / 1000);
        setLockoutSeconds(secs);
        startLockoutTimer(lockoutUntil);
      }
    }
  }, [verifyPin, logout, t]);

  const handleForceLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const biometricIcon = biometricType === 'face' ? 'scan-outline' : 'finger-print-outline';
  const biometricLabel =
    biometricType === 'face' ? t('appLock.faceId') : t('appLock.fingerprint');

  if (showPin) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.pinHeader}>
          {biometricType !== 'none' && (
            <TouchableOpacity onPress={() => setShowPin(false)} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
            </TouchableOpacity>
          )}
        </View>
        <PinInput
          onComplete={handlePinComplete}
          title={t('appLock.enterPin')}
          error={pinError}
          lockoutSeconds={lockoutSeconds > 0 ? lockoutSeconds : undefined}
        />
        {failCount >= MAX_ATTEMPTS && (
          <TouchableOpacity style={styles.forceLogoutButton} onPress={handleForceLogout}>
            <Text style={styles.forceLogoutText}>{t('appLock.forceLogout')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.centerContent}>
        <Logo size={48} showText={false} color={isDark ? '#F9FAFB' : '#1F2937'} />
        <Ionicons
          name="lock-closed"
          size={32}
          color={isDark ? '#9CA3AF' : '#6B7280'}
          style={styles.lockIcon}
        />
        <Text style={[styles.appName, isDark && styles.textLight]}>MarZlog</Text>

        {biometricType !== 'none' && (
          <TouchableOpacity style={styles.biometricButton} onPress={handleBiometric}>
            <Ionicons name={biometricIcon} size={48} color="#FA5252" />
            <Text style={[styles.biometricLabel, isDark && styles.textMuted]}>
              {biometricLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.usePinButton} onPress={() => setShowPin(true)}>
        <Text style={styles.usePinText}>{t('appLock.usePin')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F9FAFB',
    zIndex: 9999,
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  pinHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    marginTop: 16,
    marginBottom: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: '300',
    color: '#1F2937',
    marginBottom: 48,
  },
  textLight: {
    color: '#F9FAFB',
  },
  textMuted: {
    color: '#9CA3AF',
  },
  biometricButton: {
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  biometricLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  usePinButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  usePinText: {
    fontSize: 16,
    color: '#FA5252',
    fontWeight: '500',
  },
  forceLogoutButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  forceLogoutText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
});

export default BiometricLock;
