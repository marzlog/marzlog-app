/**
 * 기기 OCR 쓰레기 텍스트 판정 — F-OCR-GARBAGE-FILTER (14차)
 *
 * 기울어진 디자인 서체에서 ML Kit 이 `IIIIIIIW` 같은 무의미 문자열을 돌려주고, 그것이 그대로
 * 저장돼 상세 화면에 "사진 속 텍스트"로 노출됐다(실물 DB `8cca18b2`).
 *
 * ★신뢰도 기반이 아니다 — `@react-native-ml-kit/text-recognition` 은 confidence 를 노출하지 않는다
 *   (패키지 전체 grep 0건). 그래서 문자열 휴리스틱으로 판정한다.
 * ★임계는 보수적이다 — 과차단(정상 텍스트를 삼키는 것)이 더 나쁜 회귀다. 따라서 저다양성 규칙은
 *   **공백 없는 단일 토큰**에만 적용하고, 여러 토큰·여러 줄 텍스트(영수증·문서 등)는 통과시킨다.
 * ★임계 상수는 판정 함수와 분리한다 — 조정이 함수 수정 없이 끝나야 한다.
 */

export const OCR_GARBAGE_THRESHOLDS = {
  /** 공백 제거 후 이 길이 미만이면 의미 없는 인식으로 본다 */
  minChars: 2,
  /** 단일 토큰에 저다양성 규칙을 적용하기 시작하는 길이 */
  singleTokenMinLength: 5,
  /** 한 글자가 이 비율 이상 반복되면 쓰레기 (예: IIIIIIIW = 0.875) */
  maxRepeatRatio: 0.6,
  /** 서로 다른 글자 비율이 이 값 이하면 쓰레기 (예: IIIIIIIW = 0.25) */
  minDistinctRatio: 0.34,
} as const;

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** 쓰레기로 판정되면 true — 호출부는 `no_text` 로 전송한다. */
export function isGarbageOcrText(text: string | null | undefined): boolean {
  const raw = typeof text === 'string' ? text : '';
  const chars = Array.from(raw.replace(/\s+/g, ''));

  if (chars.length < OCR_GARBAGE_THRESHOLDS.minChars) return true;
  // 문자·숫자가 하나도 없으면(기호·괘선만) 의미 있는 텍스트가 아니다
  if (!chars.some((c) => LETTER_OR_DIGIT.test(c))) return true;

  // 다토큰(공백·개행 포함)은 통과 — 과차단 방지의 핵심 가드
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  if (tokens.length > 1) return false;

  if (chars.length < OCR_GARBAGE_THRESHOLDS.singleTokenMinLength) return false;

  const counts = new Map<string, number>();
  for (const c of chars) counts.set(c, (counts.get(c) ?? 0) + 1);
  const maxRepeatRatio = Math.max(...counts.values()) / chars.length;
  const distinctRatio = counts.size / chars.length;

  return (
    maxRepeatRatio >= OCR_GARBAGE_THRESHOLDS.maxRepeatRatio ||
    distinctRatio <= OCR_GARBAGE_THRESHOLDS.minDistinctRatio
  );
}

export default isGarbageOcrText;
