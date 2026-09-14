/**
 * 업로드 화면 "AI 일기 힌트"(memo) 토글 규칙 (JJ 결정 2026-09-15).
 *
 * - 기본 on: 힌트는 AI 일기 품질에 직접 쓰이는 입력이라 눈에 보이게 둔다. 토글 상태는
 *   화면 로컬 state 이고 persist 되지 않으므로 뒤집을 저장값이 없다.
 * - 포커스는 사용자가 토글을 켰을 때만: 첫 진입(기본 on)에 키보드가 올라오면 사진 확인을 가린다.
 */
export const MEMO_HINT_DEFAULT_ON = true;

export const shouldFocusMemoInput = (showMemo: boolean, toggledOnByUser: boolean): boolean =>
  showMemo && toggledOnByUser;
