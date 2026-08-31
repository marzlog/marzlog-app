import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { secureStorage, SECURE_KEYS, isKeychainUnavailableError } from '../utils/secureStorage';
import { captureError } from '../utils/sentry';

interface AppLockState {
  isEnabled: boolean;
  isLocked: boolean;
  failCount: number;
  lockoutUntil: number | null;
  biometricType: 'face' | 'fingerprint' | 'iris' | 'none';
  /** B-SECURESTORE-LOCKED: 잠금 중 Keychain 실패로 initialize가 보류됐음 → 해제 후 재시도 대상 */
  initDeferred: boolean;

  initialize: () => Promise<void>;
  retryInitialize: () => Promise<void>;
  enableLock: (pin: string) => Promise<void>;
  disableLock: (pin: string) => Promise<boolean>;
  lock: () => void;
  unlock: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  checkBiometric: () => Promise<void>;
  authenticateBiometric: (promptMessage: string, cancelLabel: string) => Promise<boolean>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

const hashPin = async (pin: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `marzlog_v1_${pin}_${Platform.OS}`
  );
};

export const useAppLockStore = create<AppLockState>((set, get) => ({
  isEnabled: false,
  isLocked: false,
  failCount: 0,
  lockoutUntil: null,
  biometricType: 'none',
  initDeferred: false,

  initialize: async () => {
    // B-SECURESTORE-LOCKED: 여기서 throw가 새어나가면 _layout의 부트 Promise가 깨져
    // setInitialReady가 영영 서지 않고 화면이 blank로 정지한다. checkBiometric(아래)과
    // 동일하게 안전 폴백으로 흡수하고, 잠금 원인이면 재시도 대상으로 표시한다.
    try {
      const enabled = await secureStorage.getItem(SECURE_KEYS.APP_LOCK_ENABLED);
      const isEnabled = enabled === 'true';
      set({ isEnabled, isLocked: isEnabled, initDeferred: false });
      if (isEnabled) {
        await get().checkBiometric();
      }
    } catch (e) {
      set({ isEnabled: false, isLocked: false, initDeferred: isKeychainUnavailableError(e) });
      captureError(e instanceof Error ? e : new Error(String(e)), { scope: 'appLock.initialize' });
    }
  },

  /** 보류된 initialize만 1회 재실행 (해제 직후 포그라운드 복귀 시 호출) */
  retryInitialize: async () => {
    if (!get().initDeferred) return;
    await get().initialize();
  },

  enableLock: async (pin: string) => {
    const hash = await hashPin(pin);
    await secureStorage.setItem(SECURE_KEYS.PIN_HASH, hash);
    await secureStorage.setItem(SECURE_KEYS.APP_LOCK_ENABLED, 'true');
    set({ isEnabled: true, isLocked: false });
    await get().checkBiometric();
  },

  disableLock: async (pin: string) => {
    const valid = await get().verifyPin(pin);
    if (!valid) return false;
    await secureStorage.removeItem(SECURE_KEYS.PIN_HASH);
    await secureStorage.setItem(SECURE_KEYS.APP_LOCK_ENABLED, 'false');
    set({ isEnabled: false, isLocked: false, failCount: 0, lockoutUntil: null });
    return true;
  },

  lock: () => set({ isLocked: true, failCount: 0, lockoutUntil: null }),

  unlock: () => set({ isLocked: false, failCount: 0, lockoutUntil: null }),

  verifyPin: async (pin: string) => {
    const { lockoutUntil } = get();

    if (lockoutUntil && Date.now() < lockoutUntil) {
      return false;
    }

    const storedHash = await secureStorage.getItem(SECURE_KEYS.PIN_HASH);
    if (!storedHash) return false;

    const inputHash = await hashPin(pin);
    if (storedHash === inputHash) {
      get().unlock();
      return true;
    }

    const newFailCount = get().failCount + 1;
    if (newFailCount >= MAX_ATTEMPTS) {
      set({ failCount: newFailCount });
      return false;
    } else if (newFailCount >= 3) {
      set({ failCount: newFailCount, lockoutUntil: Date.now() + LOCKOUT_MS });
    } else {
      set({ failCount: newFailCount });
    }
    return false;
  },

  changePin: async (currentPin: string, newPin: string) => {
    const storedHash = await secureStorage.getItem(SECURE_KEYS.PIN_HASH);
    if (!storedHash) return false;

    const currentHash = await hashPin(currentPin);
    if (storedHash !== currentHash) return false;

    const newHash = await hashPin(newPin);
    await secureStorage.setItem(SECURE_KEYS.PIN_HASH, newHash);
    return true;
  },

  checkBiometric: async () => {
    if (Platform.OS === 'web') {
      set({ biometricType: 'none' });
      return;
    }
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        set({ biometricType: 'none' });
        return;
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        set({ biometricType: 'face' });
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        set({ biometricType: 'fingerprint' });
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        set({ biometricType: 'iris' });
      } else {
        set({ biometricType: 'none' });
      }
    } catch {
      set({ biometricType: 'none' });
    }
  },

  authenticateBiometric: async (promptMessage: string, cancelLabel: string) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel,
        disableDeviceFallback: true,
      });
      if (result.success) {
        get().unlock();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));

export default useAppLockStore;
