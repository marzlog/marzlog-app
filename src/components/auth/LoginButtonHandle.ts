/**
 * 로그인 버튼 imperative handle.
 *
 * AccountConflictModal의 "○○로 로그인" CTA가 registered_provider에 해당하는
 * 로그인 플로우를 직접 트리거하기 위해 각 버튼이 ref로 노출한다.
 * trigger()는 버튼 탭과 동일한 내부 핸들러를 그대로 호출한다 (동작 차이 금지).
 */
export interface LoginButtonHandle {
  trigger: () => void;
}
