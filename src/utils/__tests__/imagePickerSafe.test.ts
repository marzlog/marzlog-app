/**
 * D11 · B-IMAGEPICKER-AFTER-CONFIG-CHANGE — imagePickerSafe 헬퍼.
 * 정상 결과 / 빈 결과·예외 뒤 pending 회수 / pending 오류·예외 / iOS no-op / 포커스 복귀 회수.
 */
const mockPlatform = { OS: 'android' as string };
jest.mock('react-native', () => ({ Platform: mockPlatform }));

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
const mockFocus = jest.fn((cb: () => void) => cb());
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (cb: () => void) => mockFocus(cb) }));

import {
  launchPickerSafe,
  takePendingPickerResult,
  usePendingPickerRecovery,
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

describe('usePendingPickerRecovery — 포커스 복귀 회수', () => {
  it('포커스 때 pending 이 있으면 1회 넘긴다', async () => {
    const pending = success('file://r.jpg');
    mockGetPending.mockResolvedValueOnce(pending).mockResolvedValue(null);
    const handler = jest.fn();
    usePendingPickerRecovery(handler);
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(pending);
  });

  it('pending 이 없으면 부르지 않는다', async () => {
    mockGetPending.mockResolvedValue(null);
    const handler = jest.fn();
    usePendingPickerRecovery(handler);
    await flush();
    expect(handler).not.toHaveBeenCalled();
  });

  it('회수가 끝나기 전에 언마운트되면 부르지 않는다', async () => {
    let resolvePending: (v: unknown) => void = () => {};
    mockGetPending.mockReturnValue(new Promise((r) => { resolvePending = r; }));
    const handler = jest.fn();
    usePendingPickerRecovery(handler);
    mockCleanups.forEach((c) => c()); // 언마운트
    resolvePending(success('file://late.jpg'));
    await flush();
    expect(handler).not.toHaveBeenCalled();
  });

  it('iOS 에서는 포커스 회수를 하지 않는다', async () => {
    mockPlatform.OS = 'ios';
    const handler = jest.fn();
    usePendingPickerRecovery(handler);
    await flush();
    expect(mockGetPending).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });
});
