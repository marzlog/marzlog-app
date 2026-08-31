/**
 * isKeychainUnavailableError 단위 테스트 (B-SECURESTORE-LOCKED)
 *
 * 판정이 틀리면 피해가 양방향이다:
 *  - false negative → 잠금 일시 실패가 토큰 삭제(영구 로그아웃)로 굳는다
 *  - false positive → 진짜 무효 토큰이 삭제되지 않고 보류로 남는다
 * 따라서 true/false 양쪽을 모두 고정한다.
 */
import { isKeychainUnavailableError } from '../secureStorage';

// secureStorage는 react-native / expo-secure-store를 import하지만, 테스트 대상 함수는
// 순수 판정 로직이다. node 환경에서 모듈 해석만 되도록 최소 목만 둔다.
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

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
