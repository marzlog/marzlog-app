/**
 * scheduleDialogPresentation 단위 테스트 (B-PAYWALL-HANG — 시스템 시트 닫힘 직후 Modal 미표시 완화)
 */
import { DIALOG_AFTER_ACTIVE_DELAY_MS, scheduleDialogPresentation, type DialogPresentationDeps } from '../dialogPresentation';

function fakeDeps(appState: string) {
  const frames: Array<() => void> = [];
  const interactions: Array<() => void> = [];
  const delays: Array<{ ms: number; cb: () => void }> = [];
  const activeListeners = new Set<() => void>();
  const deps: DialogPresentationDeps = {
    getAppState: () => appState,
    onActive: (cb) => {
      activeListeners.add(cb);
      return () => activeListeners.delete(cb);
    },
    nextFrame: (cb) => frames.push(cb),
    afterInteractions: (cb) => interactions.push(cb),
    delay: (ms, cb) => delays.push({ ms, cb }),
  };
  const flush = (q: Array<() => void>) => q.splice(0).forEach((cb) => cb());
  return { deps, frames, interactions, delays, activeListeners, flush };
}

describe('scheduleDialogPresentation', () => {
  it('active 면 바로 띄우지 않고 다음 프레임 → 상호작용 종료 뒤에 1번 띄운다', () => {
    const f = fakeDeps('active');
    const show = jest.fn();
    scheduleDialogPresentation(show, f.deps);
    expect(show).not.toHaveBeenCalled();
    f.flush(f.frames);
    expect(show).not.toHaveBeenCalled();
    f.flush(f.interactions);
    expect(show).toHaveBeenCalledTimes(1);
    // 상호작용 종료가 먼저 왔으면 보조 타이머는 다시 띄우지 않는다
    f.delays.splice(0).forEach((d) => d.cb());
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('inactive 면 active 복귀 + 지연 뒤에 띄운다(복귀 전에는 띄우지 않는다)', () => {
    const f = fakeDeps('inactive');
    const show = jest.fn();
    scheduleDialogPresentation(show, f.deps);
    expect(f.frames).toHaveLength(0);
    expect(f.activeListeners.size).toBe(1);
    expect(show).not.toHaveBeenCalled();

    [...f.activeListeners].forEach((cb) => cb());
    expect(f.activeListeners.size).toBe(0);
    const afterActive = f.delays.splice(0);
    expect(afterActive).toHaveLength(1);
    expect(afterActive[0].ms).toBe(DIALOG_AFTER_ACTIVE_DELAY_MS);
    afterActive[0].cb();
    f.flush(f.frames);
    f.flush(f.interactions);
    expect(show).toHaveBeenCalledTimes(1);
  });
});
