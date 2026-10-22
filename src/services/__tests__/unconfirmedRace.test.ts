/**
 * 결과 미확인 구매 경쟁 단위 테스트 (B-UNCONFIRMED-RACE)
 *
 * 2026-10-22 iPhone 실측: 미확인 구매 → 비행기 모드 해제 → 자동 반영 확인이 이겨 구독 화면으로 갔고,
 * 미확인 직후 예약된 실패 대화상자가 그 위에 떴다.
 */
import { resolveRecheckRoute, resolveUnconfirmedRecheck } from '../reconnectRecheck';
import {
  buildPaywallVM,
  resolvePurchaseFollowUp,
  shouldRedirectToSubscription,
  type PaywallVMInput,
} from '../../utils/paywallViewModel';
import { scheduleDialogPresentation, type DialogPresentationDeps } from '../../components/ui/Dialog/dialogPresentation';

const NO_TRIAL = { eligible: false, days: null };

function vmInput(overrides: Partial<PaywallVMInput> = {}): PaywallVMInput {
  return {
    isAuthenticated: true,
    isPlus: false,
    loading: false,
    offerResult: {
      status: 'ok',
      offer: {
        annual: { priceString: '₩44,000', perMonthPriceString: '₩3,667', trial: NO_TRIAL },
        monthly: { priceString: '₩5,500', perMonthPriceString: null, trial: NO_TRIAL },
        annualDiscountPercent: 33,
      },
    },
    selected: 'monthly',
    busy: false,
    reflecting: 'idle',
    ...overrides,
  };
}

describe('B-UNCONFIRMED-RACE', () => {
  it('경쟁 시 우선순위 — 미확인 구매가 있으면 그 재확인만(자동 반영 확인 건너뜀), 진행 중·연결 없음이면 건너뜀', () => {
    expect(resolveRecheckRoute({ hasUnconfirmed: true, online: true, inFlight: false })).toBe('unconfirmed');
    expect(resolveRecheckRoute({ hasUnconfirmed: true, online: null, inFlight: false })).toBe('unconfirmed');
    expect(resolveRecheckRoute({ hasUnconfirmed: false, online: true, inFlight: false })).toBe('auto-reflect');
    // 포그라운드 복귀가 네트워크 복귀보다 먼저 와도 연결 없음이면 기다린다 / 앞 확인이 진행 중이면 겹치지 않는다
    expect(resolveRecheckRoute({ hasUnconfirmed: true, online: false, inFlight: false })).toBe('skip');
    expect(resolveRecheckRoute({ hasUnconfirmed: true, online: true, inFlight: true })).toBe('skip');
    expect(resolveRecheckRoute({ hasUnconfirmed: false, online: true, inFlight: true })).toBe('skip');
    // 미확인 대기 중 Plus 가 반영돼도 구독 화면으로 보내지 않는다(화면이 구매 완료 화면으로 보낸다)
    const plus = { isAuthenticated: true, isPlus: true, reflecting: 'idle' as const, busy: false };
    expect(shouldRedirectToSubscription({ ...plus, awaitingConfirmation: true })).toBe(false);
  });

  it('실패 안내 지연 — 미확인은 바로 안내하지 않고 "확인 중" 문구(잠금 없음), 재확인 결과 \'없음\'일 때만 실패 안내', () => {
    expect(resolvePurchaseFollowUp('unconfirmed')).toBe('await-confirmation');
    expect(resolvePurchaseFollowUp('failed')).toBe('alert-failed');

    const vm = buildPaywallVM(vmInput({ awaitingConfirmation: true }));
    if (vm.body.kind !== 'ready') throw new Error(vm.body.kind);
    expect(vm.body.status).toEqual({ key: 'paywall.unconfirmedPending' });
    expect(vm.body.locked).toBe(false);
    expect(vm.header.restoreEnabled).toBe(true);
    // 재확인이 반영 확인 단계로 들어가면 "결제를 확인하고 있어요"가 우선
    const checking = buildPaywallVM(vmInput({ awaitingConfirmation: true, busy: true, reflecting: 'checking' }));
    if (checking.body.kind !== 'ready') throw new Error(checking.body.kind);
    expect(checking.body.status).toEqual({ key: 'paywall.reflecting' });

    expect(resolveUnconfirmedRecheck('active')).toBe('confirm');
    expect(resolveUnconfirmedRecheck('none')).toBe('alert-failed');
    // 연결 직후 통신 전·기기 계산 → 실패 안내 없이 계속 대기
    expect(resolveUnconfirmedRecheck('unknown')).toBe('keep-waiting');
  });

  it('성공 시 취소 — 표시 대기 중인 실패 대화상자는 abort 되면 앱이 돌아와도 뜨지 않는다', () => {
    const activeListeners = new Set<() => void>();
    const queue: Array<() => void> = [];
    const deps: DialogPresentationDeps = {
      getAppState: () => 'inactive',
      onActive: (cb) => {
        activeListeners.add(cb);
        return () => activeListeners.delete(cb);
      },
      nextFrame: (cb) => queue.push(cb),
      afterInteractions: (cb) => queue.push(cb),
      delay: (_ms, cb) => queue.push(cb),
    };
    const show = jest.fn();
    const controller = new AbortController();
    scheduleDialogPresentation(show, deps, controller.signal);
    expect(activeListeners.size).toBe(1);

    controller.abort(); // 재확인 성공 → 완료 화면으로 이동 확정
    expect(activeListeners.size).toBe(0);
    [...activeListeners].forEach((cb) => cb());
    while (queue.length) queue.shift()!();
    expect(show).not.toHaveBeenCalled();

    // 이미 abort 된 signal 로는 예약하지 않는다
    scheduleDialogPresentation(show, { ...deps, getAppState: () => 'active' }, controller.signal);
    while (queue.length) queue.shift()!();
    expect(show).not.toHaveBeenCalled();
  });
});
