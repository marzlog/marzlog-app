/**
 * 감정 시스템 상수 및 에셋 매핑
 * Figma 디자인 기반 커스텀 아이콘 사용
 *
 * ★F-MOOD-DIMENSION P3 (ADR-2026-09-02-01)
 * 키·라벨·해석 로직의 정본은 `src/constants/emotionKeys.ts` 로 분리됐다
 * (에셋 require 가 없어 jest 단위 테스트가 가능한 모듈). 이 파일은 그 위에
 * 아이콘·일러스트를 붙여 화면이 쓰는 표를 조립하는 역할만 한다.
 *
 * 서버는 감정을 **언어 중립 키**로 저장·반환한다. 표시 라벨은 nameKo/nameEn 이며
 * 저장값이 아니다 — 비교·전송은 전부 키로 한다.
 */

import { getLanguage, type SupportedLocale } from '@/src/i18n';
import {
  EMOTION_LABELS,
  DEFAULT_EMOTION_KEY,
  resolveEmotionKey,
  type EmotionKey,
  type EmotionLabels,
} from '@/src/constants/emotionKeys';

export {
  EMOTION_KEYS,
  DEFAULT_EMOTION_KEY,
  resolveEmotionKey,
  resolveEmotionLabels,
} from '@/src/constants/emotionKeys';
export type { EmotionKey } from '@/src/constants/emotionKeys';

// 감정 아이콘 상태
export type EmotionIconState = 'color' | 'gray' | 'disabled';

// 감정 데이터 인터페이스
export interface EmotionData extends EmotionLabels {
  icons: {
    color: any;
    gray: any;
    disabled: any;
  };
  illustration: any;
}

// 아이콘 이미지 import
const icons = {
  joy: {
    color: require('@/assets/images/emotions/icons/joy_color.png'),
    gray: require('@/assets/images/emotions/icons/joy_gray.png'),
    disabled: require('@/assets/images/emotions/icons/joy_disabled.png'),
  },
  calm: {
    color: require('@/assets/images/emotions/icons/calm_color.png'),
    gray: require('@/assets/images/emotions/icons/calm_gray.png'),
    disabled: require('@/assets/images/emotions/icons/calm_disabled.png'),
  },
  love: {
    color: require('@/assets/images/emotions/icons/love_color.png'),
    gray: require('@/assets/images/emotions/icons/love_gray.png'),
    disabled: require('@/assets/images/emotions/icons/love_disabled.png'),
  },
  gratitude: {
    color: require('@/assets/images/emotions/icons/gratitude_color.png'),
    gray: require('@/assets/images/emotions/icons/gratitude_gray.png'),
    disabled: require('@/assets/images/emotions/icons/gratitude_disabled.png'),
  },
  surprise: {
    color: require('@/assets/images/emotions/icons/surprise_color.png'),
    gray: require('@/assets/images/emotions/icons/surprise_gray.png'),
    disabled: require('@/assets/images/emotions/icons/surprise_disabled.png'),
  },
  anxiety: {
    color: require('@/assets/images/emotions/icons/anxiety_color.png'),
    gray: require('@/assets/images/emotions/icons/anxiety_gray.png'),
    disabled: require('@/assets/images/emotions/icons/anxiety_disabled.png'),
  },
  sadness: {
    color: require('@/assets/images/emotions/icons/sadness_color.png'),
    gray: require('@/assets/images/emotions/icons/sadness_gray.png'),
    disabled: require('@/assets/images/emotions/icons/sadness_disabled.png'),
  },
  focus: {
    color: require('@/assets/images/emotions/icons/focus_color.png'),
    gray: require('@/assets/images/emotions/icons/focus_gray.png'),
    disabled: require('@/assets/images/emotions/icons/focus_disabled.png'),
  },
  anger: {
    color: require('@/assets/images/emotions/icons/anger_color.png'),
    gray: require('@/assets/images/emotions/icons/anger_gray.png'),
    disabled: require('@/assets/images/emotions/icons/anger_disabled.png'),
  },
  // ★키는 thought, 파일명은 thoughtful_* 유지 (에셋 리네임은 별건)
  thought: {
    color: require('@/assets/images/emotions/icons/thoughtful_color.png'),
    gray: require('@/assets/images/emotions/icons/thoughtful_gray.png'),
    disabled: require('@/assets/images/emotions/icons/thoughtful_disabled.png'),
  },
  tired: {
    color: require('@/assets/images/emotions/icons/tired_color.png'),
    gray: require('@/assets/images/emotions/icons/tired_gray.png'),
    disabled: require('@/assets/images/emotions/icons/tired_disabled.png'),
  },
  // ★키는 pain, 파일명은 hurt_* 유지 (에셋 리네임은 별건)
  pain: {
    color: require('@/assets/images/emotions/icons/hurt_color.png'),
    gray: require('@/assets/images/emotions/icons/hurt_gray.png'),
    disabled: require('@/assets/images/emotions/icons/hurt_disabled.png'),
  },
};

// 일러스트레이션 이미지 import
const illustrations = {
  joy: require('@/assets/images/emotions/illustrations/joy.png'),
  calm: require('@/assets/images/emotions/illustrations/calm.png'),
  love: require('@/assets/images/emotions/illustrations/love.png'),
  gratitude: require('@/assets/images/emotions/illustrations/gratitude.png'),
  surprise: require('@/assets/images/emotions/illustrations/surprise.png'),
  anxiety: require('@/assets/images/emotions/illustrations/anxiety.png'),
  sadness: require('@/assets/images/emotions/illustrations/sadness.png'),
  focus: require('@/assets/images/emotions/illustrations/focus.png'),
  anger: require('@/assets/images/emotions/illustrations/anger.png'),
  thought: require('@/assets/images/emotions/illustrations/thoughtful.png'),
  tired: require('@/assets/images/emotions/illustrations/tired.png'),
  pain: require('@/assets/images/emotions/illustrations/hurt.png'),
};

// 감정 목록 — 정본(EMOTION_LABELS)에 에셋을 붙여 조립. 순서도 정본을 따른다.
export const EMOTIONS: EmotionData[] = EMOTION_LABELS.map((e) => ({
  ...e,
  icons: icons[e.key],
  illustration: illustrations[e.key],
}));

const BY_KEY: Record<EmotionKey, EmotionData> = Object.fromEntries(
  EMOTIONS.map((e) => [e.key, e]),
) as Record<EmotionKey, EmotionData>;

/** 키 → 감정 데이터(아이콘 포함) 룩업. */
export const EMOTION_BY_KEY: Readonly<Record<EmotionKey, EmotionData>> = BY_KEY;

/**
 * 화면이 쓰는 단일 해석 지점 — 서버 값/구 캐시/한국어 라벨을 모두 받아 EmotionData 로.
 * 해석 불가면 null → 호출부는 **아이콘 자리를 비우고 원문을 노출하지 않는다**.
 */
export function resolveEmotion(value: string | null | undefined): EmotionData | null {
  const key = resolveEmotionKey(value);
  return key ? BY_KEY[key] : null;
}

/** 기본 감정 데이터 (업로드 초기값 등). */
export const DEFAULT_EMOTION: EmotionData = BY_KEY[DEFAULT_EMOTION_KEY];

// 헬퍼: 감정 아이콘. 해석 불가면 null.
export function getEmotionIcon(
  value: string | null | undefined,
  state: EmotionIconState = 'color'
): any {
  return resolveEmotion(value)?.icons[state] ?? null;
}

// 헬퍼: 감정 일러스트. 해석 불가면 null.
export function getEmotionIllustration(value: string | null | undefined): any {
  return resolveEmotion(value)?.illustration ?? null;
}

/**
 * 현재 언어에 맞는 표시 라벨. 해석 불가면 null(원문 노출 금지).
 *
 * ko 는 nameKo, 그 외(en/vi/th)는 nameEn 폴백이다.
 * TODO(F-EMOTION-VI-LABELS): vi/th 실번역이 들어오면 여기서 분기를 늘린다.
 * 백엔드 `app/core/emotions.py` 의 name_vi/name_th 도 현재 en 임시값이라 양쪽을
 * 함께 교체해야 한다.
 */
export function emotionLabel(
  value: EmotionData | string | null | undefined,
  lang: SupportedLocale = getLanguage()
): string | null {
  const data = typeof value === 'string' || value == null ? resolveEmotion(value) : value;
  if (!data) return null;
  return lang === 'ko' ? data.nameKo : data.nameEn || data.nameKo;
}
