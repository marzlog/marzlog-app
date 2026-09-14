import { MEMO_HINT_DEFAULT_ON, shouldFocusMemoInput } from '../memoHint';

// AI 일기 힌트 토글 (JJ 결정 2026-09-15): 기본 on, 사용자가 토글을 켰을 때만 입력창에 포커스.
// 화면 첫 진입(기본 on)에서 키보드가 올라오면 사진 확인을 가리므로 포커스하지 않는다.

describe('AI 일기 힌트 토글', () => {
  it('기본값은 on 이다', () => {
    expect(MEMO_HINT_DEFAULT_ON).toBe(true);
  });

  it('사용자가 토글을 켜서 입력창이 보이면 포커스한다', () => {
    expect(shouldFocusMemoInput(true, true)).toBe(true);
  });

  it('첫 마운트(기본 on)에서는 포커스하지 않는다', () => {
    expect(shouldFocusMemoInput(true, false)).toBe(false);
  });

  it('토글을 끄면 포커스하지 않는다', () => {
    expect(shouldFocusMemoInput(false, true)).toBe(false);
  });
});
