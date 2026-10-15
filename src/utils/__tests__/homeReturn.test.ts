/**
 * resolveHomeReturn 단위 테스트 (B-HOME-DUPLICATE-ON-REPLACE)
 */
import { resolveHomeReturn } from '../homeReturn';

it('결제 → 완료 화면(스택 아래 탭 있음) → 기존 탭까지 되돌림', () => {
  expect(resolveHomeReturn(['(tabs)', 'plus-success'])).toBe('dismiss-to-tabs');
});

it('설정 → 구독 → 결제 → 완료(탭이 더 아래) → 기존 탭까지 되돌림', () => {
  expect(resolveHomeReturn(['(tabs)', 'settings', 'subscription', 'plus-success'])).toBe('dismiss-to-tabs');
});

it('딥링크로 결제 화면을 바로 연 경우(스택에 탭 없음) → 교체', () => {
  expect(resolveHomeReturn(['plus-success'])).toBe('replace-with-tabs');
  expect(resolveHomeReturn(['paywall'])).toBe('replace-with-tabs');
});

it('현재 화면 자신만 탭이면(이미 홈) 아래에 탭이 없는 것으로 본다 → 교체', () => {
  expect(resolveHomeReturn(['(tabs)'])).toBe('replace-with-tabs');
});

it('빈 스택(내비게이션 준비 전) → 교체', () => {
  expect(resolveHomeReturn([])).toBe('replace-with-tabs');
});
