/**
 * 대화상자 표시 시점 — 순수 함수 (RN 비의존, 단위 테스트 대상). B-PAYWALL-HANG.
 *
 * iOS 는 시스템 시트(결제·Apple ID)가 닫히는 중에 RN Modal 을 띄우면 화면에 나타나지 않을 수 있다.
 * 그래서 표시를 바로 하지 않고 다음 프레임 → 상호작용(전환 애니메이션) 종료 뒤로 미룬다.
 *  - 앱이 active 가 아니면(시트가 떠 있는 동안 inactive) active 로 돌아온 뒤 AFTER_ACTIVE_DELAY_MS 를 더 기다린다.
 *  - 상호작용 종료가 오지 않아도(핸들 누수) INTERACTIONS_FALLBACK_MS 뒤에는 표시한다.
 * 돌려주는 함수로 예약을 취소한다(새 대화상자가 앞 예약을 대체할 때·Provider 해제 때).
 * signal 을 넘기면 abort 때도 취소된다 — 표시 전에 안내가 무의미해진 경우(B-UNCONFIRMED-RACE: 재확인 성공 뒤 실패 안내).
 */
export const DIALOG_AFTER_ACTIVE_DELAY_MS = 350;
export const DIALOG_INTERACTIONS_FALLBACK_MS = 500;

export interface DialogPresentationDeps {
  /** 현재 AppState — 'background' | 'inactive' 면 active 복귀를 기다린다 */
  getAppState: () => string | null | undefined;
  /** active 로 바뀌면 cb. 구독 해제 함수를 돌려준다 */
  onActive: (cb: () => void) => () => void;
  nextFrame: (cb: () => void) => void;
  afterInteractions: (cb: () => void) => void;
  delay: (ms: number, cb: () => void) => void;
}

export function scheduleDialogPresentation(show: () => void, deps: DialogPresentationDeps, signal?: AbortSignal): () => void {
  let cancelled = signal?.aborted === true;
  let done = false;
  let unsubscribe: (() => void) | null = null;
  if (cancelled) return () => {};

  const present = () => {
    if (cancelled || done) return;
    done = true;
    show();
  };

  const afterFrame = () => {
    deps.nextFrame(() => {
      if (cancelled) return;
      deps.afterInteractions(present);
      deps.delay(DIALOG_INTERACTIONS_FALLBACK_MS, present);
    });
  };

  const state = deps.getAppState();
  if (state === 'background' || state === 'inactive') {
    unsubscribe = deps.onActive(() => {
      unsubscribe?.();
      unsubscribe = null;
      if (cancelled) return;
      deps.delay(DIALOG_AFTER_ACTIVE_DELAY_MS, afterFrame);
    });
  } else {
    afterFrame();
  }

  const cancel = () => {
    cancelled = true;
    unsubscribe?.();
    unsubscribe = null;
    signal?.removeEventListener('abort', cancel);
  };
  signal?.addEventListener('abort', cancel);
  return cancel;
}
