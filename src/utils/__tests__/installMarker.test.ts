/**
 * installMarker 단위 테스트 (D1 1단계)
 * 불변식: 표식은 최초 1회만 기록되고, 실패해도 예외가 새지 않는다(부트 비차단).
 */

const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockStore[k] = v;
    }),
  },
}));
jest.mock('../sentry', () => ({ captureError: jest.fn() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureError } from '../sentry';
import { INSTALL_MARKER_KEY, ensureInstallMarker } from '../installMarker';

const setItem = AsyncStorage.setItem as jest.Mock;
const getItem = AsyncStorage.getItem as jest.Mock;
const captureErrorMock = captureError as jest.Mock;

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  setItem.mockClear();
  getItem.mockClear();
  captureErrorMock.mockClear();
});

describe('ensureInstallMarker', () => {
  it('(1) 표식 없음 → 최초 기록 시각(ISO) 저장', async () => {
    await ensureInstallMarker();

    expect(setItem).toHaveBeenCalledTimes(1);
    const saved = mockStore[INSTALL_MARKER_KEY];
    expect(new Date(saved).toISOString()).toBe(saved);
  });

  it('(2) 표식 있음 → 덮어쓰지 않음', async () => {
    mockStore[INSTALL_MARKER_KEY] = '2026-01-01T00:00:00.000Z';

    await ensureInstallMarker();

    expect(setItem).not.toHaveBeenCalled();
    expect(mockStore[INSTALL_MARKER_KEY]).toBe('2026-01-01T00:00:00.000Z');
  });

  it('(3) 저장 실패 → 예외 전파 없음 + 계측', async () => {
    setItem.mockRejectedValueOnce(new Error('disk full'));

    await expect(ensureInstallMarker()).resolves.toBeUndefined();
    expect(captureErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ scope: 'installMarker.ensure' })
    );
  });

  it('(3-b) 읽기 실패 → 예외 전파 없음, 쓰기 시도 안 함', async () => {
    getItem.mockRejectedValueOnce(new Error('read failed'));

    await expect(ensureInstallMarker()).resolves.toBeUndefined();
    expect(setItem).not.toHaveBeenCalled();
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
  });
});
