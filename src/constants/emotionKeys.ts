/**
 * 감정 정본 — 언어 중립 키 12종 (F-MOOD-DIMENSION P3, ADR-2026-09-02-01)
 *
 * ★이 파일에 에셋(require) 참조가 없는 이유
 * ------------------------------------------
 * `constants/emotions.ts` 는 아이콘 PNG 를 `require()` 하므로 순수 TS 로 실행되는
 * jest 환경(jest.config.js: preset ts-jest / testEnvironment node)에서 import 할 수
 * 없다. 매칭 로직만 따로 떼어 두면 단위 테스트가 가능해진다.
 * 아이콘·일러스트가 붙은 표는 `constants/emotions.ts` 가 이 파일을 읽어 조립한다.
 *
 * ★백엔드와의 계약
 * ----------------
 * 서버(RDS 마이그레이션 024 적용 완료)는 `media.emotion` 에 **중립 키**를 저장하고
 * 그대로 반환한다. 앱은 키로 비교·표시하고, PATCH 전송값도 키다.
 * 정본: marzlog-backend `apps/api/app/core/emotions.py`
 *
 * ⚠️ 키 표기 — `thought` / `pain`
 * -------------------------------
 * 이 앱은 P3 이전까지 `thoughtful` / `hurt` 를 썼다. 백엔드 ADR 표기가 정본이므로
 * `thought` / `pain` 으로 맞춘다. **아이콘 파일명은 그대로**(thoughtful_*.png,
 * hurt_*.png) — 에셋 리네임은 캐시·번들 영향이 있어 별건으로 둔다.
 * 구 표기로 저장된 값이 들어와도 `resolveEmotionKey` 가 흡수한다.
 */

export type EmotionKey =
  | 'joy'
  | 'calm'
  | 'love'
  | 'gratitude'
  | 'surprise'
  | 'anxiety'
  | 'sadness'
  | 'focus'
  | 'anger'
  | 'thought'
  | 'tired'
  | 'pain';

export interface EmotionLabels {
  key: EmotionKey;
  nameKo: string;
  nameEn: string;
}

/** 순서 = 백엔드 EMOTIONS 배열 순서(대조가 쉬워진다) = 선택기 표시 순서 */
export const EMOTION_LABELS: readonly EmotionLabels[] = [
  { key: 'joy', nameKo: '기쁨', nameEn: 'Joy' },
  { key: 'calm', nameKo: '평온', nameEn: 'Calm' },
  { key: 'love', nameKo: '사랑', nameEn: 'Love' },
  { key: 'gratitude', nameKo: '감사', nameEn: 'Gratitude' },
  { key: 'surprise', nameKo: '놀람', nameEn: 'Surprise' },
  { key: 'anxiety', nameKo: '불안', nameEn: 'Anxiety' },
  { key: 'sadness', nameKo: '슬픔', nameEn: 'Sadness' },
  { key: 'focus', nameKo: '몰입', nameEn: 'Focus' },
  { key: 'anger', nameKo: '분노', nameEn: 'Anger' },
  { key: 'thought', nameKo: '생각', nameEn: 'Thoughtful' },
  { key: 'tired', nameKo: '피곤', nameEn: 'Tired' },
  { key: 'pain', nameKo: '아픔', nameEn: 'Hurt' },
] as const;

export const EMOTION_KEYS: readonly EmotionKey[] = EMOTION_LABELS.map((e) => e.key);

/** 기본 감정 — 서버 DEFAULT_EMOTION 과 동일 */
export const DEFAULT_EMOTION_KEY: EmotionKey = 'calm';

const BY_KEY: Record<string, EmotionLabels> = Object.fromEntries(
  EMOTION_LABELS.map((e) => [e.key, e]),
);

/** 한국어 라벨 → 키. 마이그레이션 024 이전 저장값·구 캐시 폴백용. */
const BY_NAME_KO: Record<string, EmotionLabels> = Object.fromEntries(
  EMOTION_LABELS.map((e) => [e.nameKo, e]),
);

/** 구 앱 키 표기 → 정본 키. P3 이전 로컬 캐시/큐에 남아 있을 수 있다. */
const LEGACY_KEY_ALIASES: Record<string, EmotionKey> = {
  thoughtful: 'thought',
  hurt: 'pain',
};

/**
 * 감정 값을 정본 키로 해석한다. 해석 불가면 null.
 *
 * 받는 것 3가지 (우선순위 순):
 *   ① 정본 키        'joy'        → 'joy'      ← 서버 정본
 *   ② 구 앱 키 표기  'thoughtful' → 'thought'
 *   ③ 한국어 라벨    '기쁨'        → 'joy'      ← 과도기 데이터/구 캐시
 *
 * null 을 돌려주는 값(mood 어휘 '행복', 빈 문자열, 임의 문자열)은 **화면에 원문을
 * 그대로 노출하지 않는다** — 실기에서 상세 카드에 'thought' 가 그대로 찍힌 버그가
 * 이 구분이 없어서 났다.
 */
export function resolveEmotionKey(value: string | null | undefined): EmotionKey | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  const lowered = raw.toLowerCase();
  if (BY_KEY[lowered]) return BY_KEY[lowered].key;
  if (LEGACY_KEY_ALIASES[lowered]) return LEGACY_KEY_ALIASES[lowered];
  if (BY_NAME_KO[raw]) return BY_NAME_KO[raw].key;
  return null;
}

/** 키(또는 해석 가능한 값) → 라벨 쌍. 해석 불가면 null. */
export function resolveEmotionLabels(
  value: string | null | undefined,
): EmotionLabels | null {
  const key = resolveEmotionKey(value);
  return key ? BY_KEY[key] : null;
}
