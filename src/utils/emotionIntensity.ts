/**
 * 감정 강도 칩·배지 규약 (F-EMOTION-REVAMP ⓒ·2-5, JJ 2026-09-16)
 *
 * 슬라이더(1~10)를 "{감정}" / "매우 {감정}" 칩 2개로 바꾼다.
 * - 칩 기록값: 보통 6 / 매우 9. 서버 계약(1~10 정수)은 그대로다(ⓕ — 컬럼·계약·기존값 보존).
 * - "매우" 판정 임계 8 — 백엔드 `constants/emotions.py` INTENSE_THRESHOLD 와 같다(검색 구간과 일치).
 * - 기존 값(1~10)은 바꾸지 않고 **읽을 때만** 접는다. 이미 선택된 칩을 다시 눌러도 값이 바뀌지 않는다.
 *
 * 라벨은 조합하지 않는다 — 12종 × {기본, Intense} 를 i18n 명시 키로 둔다(`emotions.<key>` / `emotions.<key>Intense`).
 *
 * ★jest(ts-jest, node)에서 실행되므로 `@/` 별칭·RN 모듈 없이 상대 경로만 쓴다.
 */
import { resolveEmotionKey } from '../constants/emotionKeys';

export const INTENSITY_NORMAL = 6;
export const INTENSITY_VERY = 9;
export const INTENSE_THRESHOLD = 8;

/** intensity 가 "매우" 구간인가. null·범위 밖 잡값은 false. */
export function isIntense(intensity: number | null | undefined): boolean {
  return typeof intensity === 'number' && Number.isFinite(intensity) && intensity >= INTENSE_THRESHOLD;
}

/** 감정 값 → 라벨 i18n 키. 해석 불가면 null(원문 노출 금지 — emotionKeys 규약). */
export function emotionLabelKey(value: string | null | undefined, intense = false): string | null {
  const key = resolveEmotionKey(value);
  if (!key) return null;
  return intense ? `emotions.${key}Intense` : `emotions.${key}`;
}

/**
 * 상세 배지 라벨 키.
 * 사용자가 고른 감정('user')만 강도를 반영한다. 'ai'·'default'·출처 없음(구 기록)은 감정어만 —
 * AI 추정은 강도를 기록하지 않고(ⓓ), 구 업로드 기본값 6 이 "매우"로 새지 않게 한다.
 */
export function emotionBadgeKey(
  emotion: string | null | undefined,
  intensity: number | null | undefined,
  source: string | null | undefined,
): string | null {
  return emotionLabelKey(emotion, source === 'user' && isIntense(intensity));
}

/** 감정 그리드 탭 — 같은 감정을 다시 누르면 선택 해제(null). */
export function toggleEmotion(current: string | null | undefined, tapped: string): string | null {
  return current === tapped ? null : tapped;
}

/** 편집 진입 시 칩 상태의 원값. 기존 값(1~10)은 그대로 두고, 없거나 잡값이면 보통(6). */
export function initialIntensity(intensity: number | null | undefined): number {
  return typeof intensity === 'number' && Number.isInteger(intensity) && intensity >= 1 && intensity <= 10
    ? intensity
    : INTENSITY_NORMAL;
}
