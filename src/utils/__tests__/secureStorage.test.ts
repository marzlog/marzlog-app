/**
 * secureStorage 단위 테스트 (B-SECURESTORE-LOCKED)
 *
 * 1) isKeychainUnavailableError — 판정이 틀리면 피해가 양방향이다:
 *    false negative → 잠금 일시 실패가 토큰 삭제(영구 로그아웃)로 굳는다
 *    false positive → 진짜 무효 토큰이 삭제되지 않고 보류로 남는다
 * 2) getItem의 _v2 투명 이관 — 불변식은 "읽기가 실패한 경로에서는 절대 delete하지 않는다".
 */

// secureStorage는 react-native / expo-secure-store / sentry를 import하지만, 테스트 대상은
// 순수 로직이다. node 환경에서 모듈 해석만 되도록 최소 목만 둔다.
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../sentry', () => ({ captureError: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  // 네이티브 rawValue와 동일한 상수 (SecureStoreAccessible.afterFirstUnlockThisDeviceOnly = 1)
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { captureError } from '../sentry';
import { secureStorage, isKeychainUnavailableError } from '../secureStorage';

const getItemAsync = SecureStore.getItemAsync as jest.Mock;
const setItemAsync = SecureStore.setItemAsync as jest.Mock;
const deleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;
const captureErrorMock = captureError as jest.Mock;

const ACCESSIBLE = SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY;
const KEY = 'access_token';
const V2 = 'access_token_v2';

/** Keychain in-memory 대역 — 실제 저장/삭제 효과까지 검증하기 위함 */
function useMemoryKeychain(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  getItemAsync.mockImplementation(async (k: string) =>
    Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null
  );
  setItemAsync.mockImplementation(async (k: string, v: string) => {
    store[k] = v;
  });
  deleteItemAsync.mockImplementation(async (k: string) => {
    delete store[k];
  });
  return store;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('isKeychainUnavailableError', () => {
  describe('true — 잠금 중 Keychain 접근 실패', () => {
    it('네이티브 메시지에 "User interaction is not allowed"가 포함되면 true', () => {
      const e = new Error(
        'The operation couldn’t be completed. User interaction is not allowed.'
      );
      expect(isKeychainUnavailableError(e)).toBe(true);
    });

    it('expo 래핑 메시지("getValueWithKeyAsync ... has failed")면 true', () => {
      const e = new Error("Calling the 'getValueWithKeyAsync' function has failed");
      expect(isKeychainUnavailableError(e)).toBe(true);
    });

    it('OSStatus -25308이 code에 숫자로 실려 오면 true', () => {
      const e = Object.assign(new Error('KeyChainException'), { code: -25308 });
      expect(isKeychainUnavailableError(e)).toBe(true);
    });
  });

  describe('false — 삭제/로그아웃이 정당한 경우', () => {
    it('Error가 아닌 값은 false', () => {
      expect(isKeychainUnavailableError('User interaction is not allowed')).toBe(false);
      expect(isKeychainUnavailableError(null)).toBe(false);
      expect(isKeychainUnavailableError(undefined)).toBe(false);
    });

    it('서버 401(토큰 무효)은 false — 기존 토큰 삭제 경로를 유지해야 한다', () => {
      const e = Object.assign(new Error('Request failed with status code 401'), { code: 401 });
      expect(isKeychainUnavailableError(e)).toBe(false);
    });

    it('네트워크 오류는 false', () => {
      const e = Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
      expect(isKeychainUnavailableError(e)).toBe(false);
    });
  });
});

describe('secureStorage._v2 이관', () => {
  it('(a) v2가 있으면 v2를 반환하고 구 키는 조회하지 않는다', async () => {
    useMemoryKeychain({ [V2]: 'NEW', [KEY]: 'OLD' });

    await expect(secureStorage.getItem(KEY)).resolves.toBe('NEW');

    expect(getItemAsync).toHaveBeenCalledTimes(1);
    expect(getItemAsync).toHaveBeenCalledWith(V2);
    expect(getItemAsync).not.toHaveBeenCalledWith(KEY);
    expect(setItemAsync).not.toHaveBeenCalled();
    expect(deleteItemAsync).not.toHaveBeenCalled();
  });

  it('(b) 구 키만 있으면 v2로 옮기고, 재읽기 일치 시에만 구 키를 지운 뒤 값을 반환한다', async () => {
    const store = useMemoryKeychain({ [KEY]: 'OLD' });

    await expect(secureStorage.getItem(KEY)).resolves.toBe('OLD');

    expect(setItemAsync).toHaveBeenCalledWith(V2, 'OLD', { keychainAccessible: ACCESSIBLE });
    expect(deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(deleteItemAsync).toHaveBeenCalledWith(KEY);
    expect(store[V2]).toBe('OLD');
    expect(store[KEY]).toBeUndefined();
    expect(captureErrorMock).not.toHaveBeenCalled();

    // 이관 후 재호출은 v2 1회 조회로 끝난다
    getItemAsync.mockClear();
    await expect(secureStorage.getItem(KEY)).resolves.toBe('OLD');
    expect(getItemAsync).toHaveBeenCalledTimes(1);
  });

  it('(c) 재읽기가 불일치하면 구 키를 지우지 않고 captureError 1회', async () => {
    const store = useMemoryKeychain({ [KEY]: 'OLD' });
    // v2 쓰기는 되지만 되읽기에서 다른 값이 돌아오는 상황
    getItemAsync
      .mockImplementationOnce(async () => null) // 1) v2 조회 → 없음
      .mockImplementationOnce(async () => 'OLD') // 2) 구 키 조회
      .mockImplementationOnce(async () => 'CORRUPTED'); // 3) v2 재읽기 → 불일치

    await expect(secureStorage.getItem(KEY)).resolves.toBe('OLD');

    expect(deleteItemAsync).not.toHaveBeenCalled();
    expect(store[KEY]).toBe('OLD');
    expect(captureErrorMock).toHaveBeenCalledTimes(1);

    const [err, extra] = captureErrorMock.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(extra).toEqual({ scope: 'secureStorage.migrate', key: KEY });
    // 값(토큰/PIN)이 계측에 새어나가면 안 된다
    expect(JSON.stringify(extra)).not.toContain('OLD');
  });

  it('(d) v2 읽기가 throw하면 그대로 전파하고 delete는 0회', async () => {
    useMemoryKeychain({ [KEY]: 'OLD' });
    const lockErr = new Error("Calling the 'getValueWithKeyAsync' function has failed");
    getItemAsync.mockRejectedValueOnce(lockErr);

    await expect(secureStorage.getItem(KEY)).rejects.toBe(lockErr);

    expect(deleteItemAsync).not.toHaveBeenCalled();
    expect(setItemAsync).not.toHaveBeenCalled();
  });

  it('(d2) 구 키 읽기가 throw해도 그대로 전파하고 delete는 0회', async () => {
    useMemoryKeychain({ [KEY]: 'OLD' });
    const lockErr = new Error('User interaction is not allowed.');
    getItemAsync
      .mockImplementationOnce(async () => null) // v2 없음
      .mockRejectedValueOnce(lockErr); // 구 키 읽기 실패

    await expect(secureStorage.getItem(KEY)).rejects.toBe(lockErr);

    expect(deleteItemAsync).not.toHaveBeenCalled();
    expect(setItemAsync).not.toHaveBeenCalled();
  });

  it('(e) setItem은 v2 키 + AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY 옵션으로 쓴다', async () => {
    useMemoryKeychain();

    await secureStorage.setItem(KEY, 'VAL');

    expect(setItemAsync).toHaveBeenCalledTimes(1);
    expect(setItemAsync).toHaveBeenCalledWith(V2, 'VAL', { keychainAccessible: ACCESSIBLE });
  });

  it('(f) removeItem은 v2와 구 키를 모두 지운다', async () => {
    const store = useMemoryKeychain({ [V2]: 'NEW', [KEY]: 'OLD' });

    await secureStorage.removeItem(KEY);

    expect(deleteItemAsync).toHaveBeenCalledTimes(2);
    expect(deleteItemAsync).toHaveBeenCalledWith(V2);
    expect(deleteItemAsync).toHaveBeenCalledWith(KEY);
    expect(store).toEqual({});
  });
});
