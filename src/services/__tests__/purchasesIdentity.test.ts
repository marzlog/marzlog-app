import { resolveIdentityTransition } from '../purchasesIdentity';

describe('resolveIdentityTransition', () => {
  it('미인증 → 로그인: logIn(서버 user id)', () => {
    expect(resolveIdentityTransition(null, 'u-1')).toEqual({ type: 'login', appUserId: 'u-1' });
  });

  it('로그인 → 로그아웃: logOut', () => {
    expect(resolveIdentityTransition('u-1', null)).toEqual({ type: 'logout' });
  });

  it('다른 계정으로 직접 교체: 새 id 로 logIn (logOut 경유 불요)', () => {
    expect(resolveIdentityTransition('u-1', 'u-2')).toEqual({ type: 'login', appUserId: 'u-2' });
  });

  it('id 불변(다른 필드 변화)은 무동작', () => {
    expect(resolveIdentityTransition('u-1', 'u-1')).toBeNull();
    expect(resolveIdentityTransition(null, null)).toBeNull();
  });

  it('undefined·빈 문자열은 미인증으로 본다', () => {
    expect(resolveIdentityTransition(undefined, null)).toBeNull();
    expect(resolveIdentityTransition('', undefined)).toBeNull();
    expect(resolveIdentityTransition('u-1', '')).toEqual({ type: 'logout' });
  });
});
