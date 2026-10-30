/**
 * D11 · B-IMAGEPICKER-AFTER-CONFIG-CHANGE — imagePickerSafe 헬퍼.
 * 정상 결과 / 빈 결과·예외 뒤 pending 회수 / pending 오류·예외 / iOS no-op / 포커스 복귀 회수.
 */
(global as any).__DEV__ = true;

const mockPlatform = { OS: 'android' as string };
const mockAppStateListeners = new Set<(state: string) => void>();
jest.mock('react-native', () => ({
  Platform: mockPlatform,
  AppState: {
    addEventListener: (_event: string, cb: (state: string) => void) => {
      mockAppStateListeners.add(cb);
      return { remove: () => mockAppStateListeners.delete(cb) };
    },
  },
}));

const mockGetPending = jest.fn();
jest.mock('expo-image-picker', () => ({ getPendingResultAsync: () => mockGetPending() }));

const mockBreadcrumb = jest.fn();
jest.mock('../sentry', () => ({
  addBreadcrumb: (...args: unknown[]) => mockBreadcrumb(...args),
}));

// 훅은 렌더 없이 검증한다 — 포커스 콜백은 즉시 실행, effect 는 즉시 실행(정리 함수 보관)
const mockCleanups: Array<() => void> = [];
jest.mock('react', () => ({
  useRef: (value: unknown) => ({ current: value }),
  useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => void | (() => void)) => {
    const cleanup = fn();
    if (cleanup) mockCleanups.push(cleanup);
  },
}));
// 포커스: 콜백 즉시 실행, 반환된 정리 함수(블러 시 호출) 보관
const mockBlurs: Array<() => void> = [];
const mockFocus = jest.fn((cb: () => void | (() => void)) => {
  const cleanup = cb();
  if (cleanup) mockBlurs.push(cleanup);
});
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (cb: () => void) => mockFocus(cb) }));

import {
  launchPickerSafe,
  takePendingPickerResult,
  usePendingPickerRecovery,
  PENDING_RECOVERY_DELAYS_MS,
  PICKER_BREADCRUMB_CATEGORY,
} from '../imagePickerSafe';

const asset = (uri: string) => ({ uri, width: 1, height: 1 }) as any;
const success = (...uris: string[]) => ({ canceled: false as const, assets: uris.map(asset) });
const canceled = { canceled: true as const, assets: null };
const flush = () => new Promise((resolve) => setImmediate(resolve));

const crumbs = () => mockBreadcrumb.mock.calls.map((c) => c[1]);

beforeEach(() => {
  mockPlatform.OS = 'android';
  mockGetPending.mockReset();
  mockBreadcrumb.mockReset();
  mockFocus.mockClear();
  mockCleanups.length = 0;
  mockBlurs.length = 0;
  mockAppStateListeners.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('launchPickerSafe — 정상', () => {
  it('결과가 있으면 그대로 돌려주고 pending 을 보지 않는다', async () => {
    const result = success('file://a.jpg');
    await expect(launchPickerSafe(async () => result, 'gallery')).resolves.toBe(result);
    expect(mockGetPending).not.toHaveBeenCalled();
    expect(mockBreadcrumb).not.toHaveBeenCalled();
  });

  it('진짜 취소(pending 없음)면 취소 결과를 그대로', async () => {
    mockGetPending.mockResolvedValue(null);
    await expect(launchPickerSafe(async () => canceled, 'gallery')).resolves.toBe(canceled);
    expect(mockGetPending).toHaveBeenCalledTimes(1);
  });
});

describe('launchPickerSafe — pending 회수', () => {
  it('빈 결과 뒤 pending 에 사진이 있으면 그것을 돌려준다', async () => {
    const pending = success('file://p1.jpg', 'file://p2.jpg');
    mockGetPending.mockResolvedValue(pending);
    await expect(launchPickerSafe(async () => canceled, 'gallery')).resolves.toBe(pending);
    expect(mockBreadcrumb).toHaveBeenCalledWith(PICKER_BREADCRUMB_CATEGORY, 'pending-recovered', {
      source: 'gallery',
      count: 2,
    });
  });

  it('예외("unregistered ActivityResultLauncher") 뒤 pending 이 있으면 회수, 예외는 breadcrumb 만', async () => {
    const pending = success('file://cam.jpg');
    mockGetPending.mockResolvedValue(pending);
    const launch = async () => {
      throw new Error('Attempting to launch an unregistered ActivityResultLauncher');
    };
    await expect(launchPickerSafe(launch, 'camera')).resolves.toBe(pending);
    expect(crumbs()).toEqual(['launch-failed', 'pending-recovered']);
    expect(mockBreadcrumb.mock.calls[0][0]).toBe('image-picker');
  });

  it('예외 뒤 회수할 것이 없으면 원래 예외를 다시 던진다 (기존 오류 토스트 유지)', async () => {
    mockGetPending.mockResolvedValue(null);
    const boom = new Error('boom');
    await expect(launchPickerSafe(async () => { throw boom; }, 'gallery')).rejects.toBe(boom);
    expect(crumbs()).toEqual(['launch-failed']);
  });
});

describe('takePendingPickerResult — 실패 격리', () => {
  it('pending 이 오류 결과(code)면 null + pending-error', async () => {
    mockGetPending.mockResolvedValue({ code: 'ERR_X', message: 'x' });
    await expect(takePendingPickerResult('focus')).resolves.toBeNull();
    expect(mockBreadcrumb).toHaveBeenCalledWith(PICKER_BREADCRUMB_CATEGORY, 'pending-error', {
      source: 'focus',
      code: 'ERR_X',
    });
  });

  it('getPendingResultAsync 가 던지면 null + pending-failed, throw 하지 않는다', async () => {
    mockGetPending.mockRejectedValue(new Error('native gone'));
    await expect(takePendingPickerResult('focus')).resolves.toBeNull();
    expect(crumbs()).toEqual(['pending-failed']);
  });

  it('pending 이 취소·빈 결과면 null', async () => {
    mockGetPending.mockResolvedValue(canceled);
    await expect(takePendingPickerResult('focus')).resolves.toBeNull();
    mockGetPending.mockResolvedValue({ canceled: false, assets: [] });
    await expect(takePendingPickerResult('focus')).resolves.toBeNull();
    expect(mockBreadcrumb).not.toHaveBeenCalled();
  });

  it.each(['ios', 'web'])('%s 에서는 pending 을 보지 않는다', async (os) => {
    mockPlatform.OS = os;
    await expect(takePendingPickerResult('focus')).resolves.toBeNull();
    await expect(launchPickerSafe(async () => canceled, 'gallery')).resolves.toBe(canceled);
    expect(mockGetPending).not.toHaveBeenCalled();
  });
});

describe('usePendingPickerRecovery — 포커스 3회 + AppState (D11-b)', () => {
  const attempts = () =>
    mockBreadcrumb.mock.calls.filter((c) => c[1] === 'recovery-attempt').map((c) => c[2]);
  const appStateActive = async () => {
    mockAppStateListeners.forEach((cb) => cb('active'));
    await jest.advanceTimersByTimeAsync(0);
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('시도 시각은 0ms·1500ms·4000ms', () => {
    expect(PENDING_RECOVERY_DELAYS_MS).toEqual([0, 1500, 4000]);
  });

  it('결과가 없으면 3회 시도하고 매번 진단 breadcrumb·dev 로그를 남긴다', async () => {
    mockGetPending.mockResolvedValue(null);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const handler = jest.fn();
    usePendingPickerRecovery(handler);
    await jest.advanceTimersByTimeAsync(4000);
    expect(mockGetPending).toHaveBeenCalledTimes(3);
    expect(attempts()).toEqual([
      { attempt: '1', hasResult: false, assetsCount: 0, errorMessage: null },
      { attempt: '2', hasResult: false, assetsCount: 0, errorMessage: null },
      { attempt: '3', hasResult: false, assetsCount: 0, errorMessage: null },
    ]);
    expect(log).toHaveBeenCalledWith('[picker-recovery]', '1', false, 0, null);
    expect(handler).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('두 번째 시도(1500ms)에 결과가 오면 1회만 넘기고 세 번째는 하지 않는다', async () => {
    const pending = success('file://late.jpg');
    mockGetPending.mockResolvedValueOnce(null).mockResolvedValueOnce(pending).mockResolvedValue(null);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const handler = jest.fn();
    usePendingPickerRecovery(handler);
    await jest.advanceTimersByTimeAsync(10000);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(pending);
    expect(mockGetPending).toHaveBeenCalledTimes(2);
    expect(attempts().map((a) => [a.attempt, a.hasResult, a.assetsCount])).toEqual([
      ['1', false, 0],
      ['2', true, 1],
    ]);
  });

  it('포커스 중 AppState active 전환에서도 1회 시도한다', async () => {
    mockGetPending.mockResolvedValue(null);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const handler = jest.fn();
    usePendingPickerRecovery(handler);
    await jest.advanceTimersByTimeAsync(4000);
    const pending = success('file://after-recreate.jpg');
    mockGetPending.mockResolvedValueOnce(pending);
    await appStateActive();
    expect(handler).toHaveBeenCalledWith(pending);
    expect(attempts().pop()).toEqual({
      attempt: 'appstate', hasResult: true, assetsCount: 1, errorMessage: null,
    });
  });

  it('한 번 회수한 뒤에도 같은 포커스 동안 다음 AppState 전환에서 또 회수한다', async () => {
    const first = success('file://first.jpg');
    const second = success('file://second.jpg');
    mockGetPending.mockResolvedValueOnce(first).mockResolvedValue(null);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const handler = jest.fn();
    usePendingPickerRecovery(handler);
    await jest.advanceTimersByTimeAsync(10000);
    expect(mockGetPending).toHaveBeenCalledTimes(1); // 성공 뒤 남은 타이머 취소
    mockGetPending.mockResolvedValueOnce(second);
    await appStateActive();
    expect(handler.mock.calls.map((c) => c[0])).toEqual([first, second]);
  });

  it('getPendingResultAsync 오류도 시도 로그에 문구로 남는다', async () => {
    mockGetPending.mockRejectedValue(new Error('native gone'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    usePendingPickerRecovery(jest.fn());
    await jest.advanceTimersByTimeAsync(0);
    expect(attempts()[0]).toEqual({
      attempt: '1', hasResult: false, assetsCount: 0, errorMessage: 'native gone',
    });
  });

  it('블러되면 남은 시도와 AppState 구독을 정리한다 (다른 화면이 가져가지 않게)', async () => {
    mockGetPending.mockResolvedValue(null);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    usePendingPickerRecovery(jest.fn());
    await jest.advanceTimersByTimeAsync(0);
    mockBlurs.forEach((b) => b());
    expect(mockAppStateListeners.size).toBe(0);
    await jest.advanceTimersByTimeAsync(10000);
    expect(mockGetPending).toHaveBeenCalledTimes(1);
  });

  it('결과가 도착하기 전에 언마운트되면 넘기지 않는다', async () => {
    let resolvePending: (v: unknown) => void = () => {};
    mockGetPending.mockReturnValue(new Promise((r) => { resolvePending = r; }));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const handler = jest.fn();
    usePendingPickerRecovery(handler);
    await jest.advanceTimersByTimeAsync(0);
    mockCleanups.forEach((c) => c()); // 언마운트
    resolvePending(success('file://late.jpg'));
    await jest.advanceTimersByTimeAsync(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('iOS 에서는 시도·구독하지 않는다', async () => {
    mockPlatform.OS = 'ios';
    const handler = jest.fn();
    usePendingPickerRecovery(handler);
    await jest.advanceTimersByTimeAsync(10000);
    expect(mockGetPending).not.toHaveBeenCalled();
    expect(mockAppStateListeners.size).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });
});
