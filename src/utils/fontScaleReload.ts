/**
 * 글자 크기 변경 시 리로드 (D11-c · B-FONT-SCALE-STALE-LAYOUT)
 *
 * 앱이 떠 있는 동안 시스템 글자 크기를 바꾸고 돌아오면 버튼·배지·캘린더 셀 글자만 옛 배율로
 * 남는 혼합 상태가 된다(콜드 스타트로 해소). 기동 시 fontScale 과 다르면 JS 를 리로드한다.
 *
 * 리로드하면 expo-image-picker 의 pending 결과(네이티브 모듈 인스턴스 메모리)가 사라지므로,
 * 리로드 직전에 1회 회수해 AsyncStorage 'picker:pending' 에 넘기고 리로드 뒤 루트가 꺼내
 * 업로드 화면으로 전달한다. 이 파일은 판정·저장만 맡는다(리로드·라우팅은 app/_layout.tsx).
 */
import type { ImagePickerAsset } from 'expo-image-picker';

export const PENDING_PICKER_STORAGE_KEY = 'picker:pending';
/** 부동소수 오차 허용 — 이보다 작게 다르면 같은 배율로 본다 */
export const FONT_SCALE_EPSILON = 0.01;

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** 기동 시 배율과 지금 배율이 다른가. 어느 쪽이든 값이 없으면 false(판정 불가 → 리로드 안 함). */
export function fontScaleChanged(boot: number | undefined | null, current: number | undefined | null): boolean {
  if (typeof boot !== 'number' || typeof current !== 'number') return false;
  if (!Number.isFinite(boot) || !Number.isFinite(current) || boot <= 0 || current <= 0) return false;
  return Math.abs(boot - current) > FONT_SCALE_EPSILON;
}

/**
 * 리로드 직전 pending 피커 결과를 넘겨 둔다. 넘긴 사진 수(없으면 0)를 돌려준다.
 * 회수·저장 실패는 0 — 리로드는 그대로 진행한다(선택 유실은 수용, B-PICKER-OPEN-DURING-FONT-CHANGE).
 */
export async function handOffPendingPicker(
  takePending: () => Promise<{ assets: ImagePickerAsset[] } | null>,
  storage: KeyValueStorage,
): Promise<number> {
  try {
    const pending = await takePending();
    if (!pending?.assets?.length) return 0;
    await storage.setItem(PENDING_PICKER_STORAGE_KEY, JSON.stringify(pending.assets));
    return pending.assets.length;
  } catch {
    return 0;
  }
}

/** 넘겨 둔 사진을 1회 꺼낸다(읽으면 지운다). 없거나 깨졌으면 null. */
export async function takeHandedOffPicker(storage: KeyValueStorage): Promise<ImagePickerAsset[] | null> {
  let raw: string | null = null;
  try {
    raw = await storage.getItem(PENDING_PICKER_STORAGE_KEY);
    if (raw !== null) await storage.removeItem(PENDING_PICKER_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const assets = JSON.parse(raw);
    if (!Array.isArray(assets)) return null;
    const valid = assets.filter((a) => a && typeof a.uri === 'string' && a.uri.length > 0);
    return valid.length ? (valid as ImagePickerAsset[]) : null;
  } catch {
    return null;
  }
}
