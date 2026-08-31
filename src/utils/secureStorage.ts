import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { captureError } from './sentry';

/**
 * B-SECURESTORE-LOCKED: Keychain accessibility 이관 (_v2 키).
 *
 * 구 항목은 expo-secure-store 기본값 WHEN_UNLOCKED로 저장돼 기기 잠금 중 읽기가 실패한다.
 * accessibility는 SecItemAdd 시점에만 확정되고, 같은 키로 다시 set하면 네이티브가
 * SecItemUpdate로 빠져 kSecValueData만 갱신한다(kSecAttrAccessible 불변) — 즉 옵션만
 * 붙여서는 기존 항목이 절대 바뀌지 않는다. 그래서 별도 _v2 키로 새로 쓰고, 되읽어
 * 검증한 뒤에만 구 키를 지우는 방식으로 이관한다.
 *
 * 이관은 getItem 안에서 투명하게 1회 일어나며 호출부는 변경되지 않는다.
 * Android에서 keychainAccessible은 무시된다(플랫폼 분기 없이 동일 코드).
 */
const ACCESSIBLE = SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY;

const v2Key = (key: string) => `${key}_v2`;

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    // web은 Keychain이 아니라 localStorage — 키를 바꾸면 기존 웹 세션이 끊기므로 무변경
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }

    // 1) 신 키 우선. 이관이 끝난 사용자는 여기서 종료(구 키 조회 없음).
    const v2 = await SecureStore.getItemAsync(v2Key(key));
    if (v2 != null) return v2;

    // 2) 구 키. 읽기 실패(잠금 -25308 등)는 그대로 전파한다 — 여기서 삼키면
    //    호출부(checkAuth 등)의 "보류" 판정이 무력화되고 값이 없는 것처럼 보인다.
    const legacy = await SecureStore.getItemAsync(key);
    if (legacy == null) return null;

    // 3) 1회 이관. 위 두 읽기가 throw하면 이 지점에 도달하지 못하므로,
    //    읽기 실패한 어떤 경로에서도 deleteItemAsync는 호출되지 않는다.
    try {
      await SecureStore.setItemAsync(v2Key(key), legacy, { keychainAccessible: ACCESSIBLE });
      const back = await SecureStore.getItemAsync(v2Key(key));
      if (back === legacy) {
        // 검증 통과 시에만 구 키 삭제
        await SecureStore.deleteItemAsync(key);
      } else {
        // 구 키 유지 → 다음 getItem에서 재시도. 값은 절대 싣지 않고 키 이름만 남긴다.
        captureError(new Error('secureStorage migrate verify mismatch'), {
          scope: 'secureStorage.migrate',
          key,
        });
      }
    } catch (e) {
      // set/verify 자체가 실패해도 구 키는 그대로다 — 다음 getItem에서 재시도된다.
      // 이관 실패가 "값을 못 읽음"으로 번지면 안 되므로 legacy는 정상 반환한다.
      captureError(e instanceof Error ? e : new Error(String(e)), {
        scope: 'secureStorage.migrate',
        key,
      });
    }

    return legacy;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(v2Key(key), value, { keychainAccessible: ACCESSIBLE });
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    // 신/구 둘 다 제거 — 이관 전후 사용자를 모두 덮는다(각각 독립 await, 순서 무관)
    await SecureStore.deleteItemAsync(v2Key(key));
    await SecureStore.deleteItemAsync(key);
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
 * 아직 _v2로 이관되지 않은 구 항목은 expo-secure-store 기본 accessibility(WHEN_UNLOCKED)로
 * 저장돼 있어, 기기가 잠긴 동안 getItemAsync가 errSecInteractionNotAllowed(-25308)로 throw한다.
 * (이관 후에는 AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY라 재부팅 직후 첫 해제 전에만 해당된다.)
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
