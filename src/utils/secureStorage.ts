import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const SECURE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  PIN_HASH: 'marzlog_pin_hash',
  APP_LOCK_ENABLED: 'marzlog_app_lock_enabled',
} as const;

/**
 * B-SECURESTORE-LOCKED: 기기 잠금 중 Keychain 접근 실패 판정.
 *
 * 이 앱의 SecureStore 항목은 전부 expo-secure-store 기본 accessibility(WHEN_UNLOCKED)로
 * 저장돼 있어, 기기가 잠긴 동안 getItemAsync가 errSecInteractionNotAllowed(-25308)로 throw한다.
 * 이는 "토큰이 무효하다"가 아니라 "지금은 읽을 수 없다"이므로, 호출부가 삭제/로그아웃 대신
 * 보류 후 재시도를 선택할 수 있도록 원인을 구분한다.
 */
export function isKeychainUnavailableError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;

  const message = e.message ?? '';
  if (message.includes('User interaction is not allowed')) return true;
  if (message.includes('getValueWithKeyAsync')) return true;
  if (message.includes('-25308')) return true;

  // expo-modules의 CodedError는 code를 문자열로, 네이티브 OSStatus는 숫자로 실어 보낼 수 있다
  const code = (e as { code?: unknown }).code;
  if (typeof code === 'number' && code === -25308) return true;
  if (typeof code === 'string' && code.includes('-25308')) return true;

  return false;
}
