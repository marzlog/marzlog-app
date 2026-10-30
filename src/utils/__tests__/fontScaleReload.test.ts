/**
 * D11-c · B-FONT-SCALE-STALE-LAYOUT — 리로드 판정과 피커 결과 인계(AsyncStorage 'picker:pending').
 */
import {
  FONT_SCALE_EPSILON,
  PENDING_PICKER_STORAGE_KEY,
  fontScaleChanged,
  handOffPendingPicker,
  takeHandedOffPicker,
  type KeyValueStorage,
} from '../fontScaleReload';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: KeyValueStorage & { data: Map<string, string> } = {
    data,
    getItem: async (k) => (data.has(k) ? data.get(k)! : null),
    setItem: async (k, v) => {
      data.set(k, v);
    },
    removeItem: async (k) => {
      data.delete(k);
    },
  };
  return storage;
}

const asset = (uri: string) => ({ uri, width: 10, height: 10, fileName: 'a.jpg' }) as any;

describe('fontScaleChanged — 리로드 판정', () => {
  it.each([
    [1, 1.3, true],
    [1.3, 1, true],
    [1, 1, false],
    [1, 1 + FONT_SCALE_EPSILON / 2, false], // 부동소수 오차는 같은 배율
    [1, 1 + FONT_SCALE_EPSILON * 2, true],
  ])('boot=%p current=%p → %p', (boot, current, expected) => {
    expect(fontScaleChanged(boot, current)).toBe(expected);
  });

  it.each([
    [undefined, 1.3],
    [1, undefined],
    [null, 1.3],
    [Number.NaN, 1],
    [0, 1.3],
    [1, -1],
  ])('판정 불가 값이면 리로드하지 않는다 (%p, %p)', (boot, current) => {
    expect(fontScaleChanged(boot as any, current as any)).toBe(false);
  });
});

describe('handOffPendingPicker — 리로드 전 인계', () => {
  it('pending 사진이 있으면 picker:pending 에 저장하고 장수를 돌려준다', async () => {
    const storage = memoryStorage();
    const n = await handOffPendingPicker(async () => ({ assets: [asset('file://a.jpg'), asset('file://b.jpg')] }), storage);
    expect(n).toBe(2);
    expect(JSON.parse(storage.data.get(PENDING_PICKER_STORAGE_KEY)!)).toHaveLength(2);
    expect(PENDING_PICKER_STORAGE_KEY).toBe('picker:pending');
  });

  it('pending 이 없으면 아무것도 저장하지 않는다', async () => {
    const storage = memoryStorage();
    expect(await handOffPendingPicker(async () => null, storage)).toBe(0);
    expect(await handOffPendingPicker(async () => ({ assets: [] }), storage)).toBe(0);
    expect(storage.data.size).toBe(0);
  });

  it('회수·저장이 실패해도 throw 하지 않는다 (리로드는 진행)', async () => {
    const storage = memoryStorage();
    storage.setItem = async () => {
      throw new Error('disk full');
    };
    await expect(handOffPendingPicker(async () => ({ assets: [asset('file://a.jpg')] }), storage)).resolves.toBe(0);
    await expect(
      handOffPendingPicker(async () => {
        throw new Error('native gone');
      }, memoryStorage()),
    ).resolves.toBe(0);
  });
});

describe('takeHandedOffPicker — 리로드 후 1회 꺼내기', () => {
  it('넘겨 둔 사진을 돌려주고 키를 지운다 (두 번째는 null)', async () => {
    const storage = memoryStorage({
      [PENDING_PICKER_STORAGE_KEY]: JSON.stringify([asset('file://a.jpg')]),
    });
    const first = await takeHandedOffPicker(storage);
    expect(first?.map((a) => a.uri)).toEqual(['file://a.jpg']);
    expect(storage.data.has(PENDING_PICKER_STORAGE_KEY)).toBe(false);
    expect(await takeHandedOffPicker(storage)).toBeNull();
  });

  it('없으면 null', async () => {
    expect(await takeHandedOffPicker(memoryStorage())).toBeNull();
  });

  it.each(['not-json', '{"uri":"x"}', '[]', '[{"uri":""},{"nope":1}]'])(
    '깨졌거나 쓸 수 없는 값은 null 이고 키는 지운다 (%p)',
    async (raw) => {
      const storage = memoryStorage({ [PENDING_PICKER_STORAGE_KEY]: raw });
      expect(await takeHandedOffPicker(storage)).toBeNull();
      expect(storage.data.has(PENDING_PICKER_STORAGE_KEY)).toBe(false);
    },
  );

  it('uri 가 있는 항목만 남긴다', async () => {
    const storage = memoryStorage({
      [PENDING_PICKER_STORAGE_KEY]: JSON.stringify([asset('file://ok.jpg'), { uri: '' }, null]),
    });
    expect((await takeHandedOffPicker(storage))?.map((a) => a.uri)).toEqual(['file://ok.jpg']);
  });

  it('저장소 읽기 실패면 null (throw 하지 않음)', async () => {
    const storage = memoryStorage();
    storage.getItem = async () => {
      throw new Error('locked');
    };
    await expect(takeHandedOffPicker(storage)).resolves.toBeNull();
  });
});
