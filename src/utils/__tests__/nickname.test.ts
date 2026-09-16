/**
 * 닉네임 길이 UX 계약 — F-NICKNAME-LENGTH-UX (14차).
 * 서버 정본 20자: PATCH /auth/me/profile (routers/auth.py:867) → 400.
 * (소셜 가입 완료 경로는 max_length=50 이지만 프로필 편집 기준은 20 — 서버 불일치는 별건 보고.)
 */
import { NICKNAME_MAX_LENGTH, isNicknameTooLong, nicknameCounter } from '../nickname';

it('서버 정본과 같은 20자', () => {
  expect(NICKNAME_MAX_LENGTH).toBe(20);
});

describe('카운터 표기', () => {
  it.each([
    ['', '0/20'],
    ['마즈', '2/20'],
    ['  마즈  ', '2/20'],
    ['a'.repeat(20), '20/20'],
  ])('%s → %s', (value, expected) => {
    expect(nicknameCounter(value)).toBe(expected);
  });

  it('이모지는 코드포인트 1개로 센다 (서버 len() 과 같은 기준)', () => {
    expect(nicknameCounter('🙂🙂')).toBe('2/20');
  });
});

describe('초과 판정', () => {
  it.each([
    ['a'.repeat(20), false],
    ['a'.repeat(21), true],
    [`  ${'a'.repeat(20)}  `, false],
  ])('%s → %s', (value, expected) => {
    expect(isNicknameTooLong(value)).toBe(expected);
  });
});
