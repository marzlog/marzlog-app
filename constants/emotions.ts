/**
 * 감정 시스템 상수 및 에셋 매핑
 * Figma 디자인 기반 커스텀 아이콘 사용
 */

// 감정 키 타입
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
  | 'thoughtful'
  | 'tired'
  | 'hurt';

// 감정 아이콘 상태
export type EmotionIconState = 'color' | 'gray' | 'disabled';

// 감정 데이터 인터페이스
export interface EmotionData {
  key: EmotionKey;
  nameKo: string;
  nameEn: string;
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
  thoughtful: {
    color: require('@/assets/images/emotions/icons/thoughtful_color.png'),
    gray: require('@/assets/images/emotions/icons/thoughtful_gray.png'),
    disabled: require('@/assets/images/emotions/icons/thoughtful_disabled.png'),
  },
  tired: {
    color: require('@/assets/images/emotions/icons/tired_color.png'),
    gray: require('@/assets/images/emotions/icons/tired_gray.png'),
    disabled: require('@/assets/images/emotions/icons/tired_disabled.png'),
  },
  hurt: {
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
  thoughtful: require('@/assets/images/emotions/illustrations/thoughtful.png'),
  tired: require('@/assets/images/emotions/illustrations/tired.png'),
  hurt: require('@/assets/images/emotions/illustrations/hurt.png'),
};

// 감정 목록 (순서 유지)
export const EMOTIONS: EmotionData[] = [
  {
    key: 'joy',
    nameKo: '기쁨',
    nameEn: 'Joy',
    icons: icons.joy,
    illustration: illustrations.joy,
  },
  {
    key: 'calm',
    nameKo: '평온',
    nameEn: 'Calm',
    icons: icons.calm,
    illustration: illustrations.calm,
  },
  {
    key: 'love',
    nameKo: '사랑',
    nameEn: 'Love',
    icons: icons.love,
    illustration: illustrations.love,
  },
  {
    key: 'gratitude',
    nameKo: '감사',
    nameEn: 'Gratitude',
    icons: icons.gratitude,
    illustration: illustrations.gratitude,
  },
  {
    key: 'surprise',
    nameKo: '놀람',
    nameEn: 'Surprise',
    icons: icons.surprise,
    illustration: illustrations.surprise,
  },
  {
    key: 'anxiety',
    nameKo: '불안',
    nameEn: 'Anxiety',
    icons: icons.anxiety,
    illustration: illustrations.anxiety,
  },
  {
    key: 'sadness',
    nameKo: '슬픔',
    nameEn: 'Sadness',
    icons: icons.sadness,
    illustration: illustrations.sadness,
  },
  {
    key: 'focus',
    nameKo: '몰입',
    nameEn: 'Focus',
    icons: icons.focus,
    illustration: illustrations.focus,
  },
  {
    key: 'anger',
    nameKo: '분노',
    nameEn: 'Anger',
    icons: icons.anger,
    illustration: illustrations.anger,
  },
  {
    key: 'thoughtful',
    nameKo: '생각',
    nameEn: 'Thoughtful',
    icons: icons.thoughtful,
    illustration: illustrations.thoughtful,
  },
  {
    key: 'tired',
    nameKo: '피곤',
    nameEn: 'Tired',
    icons: icons.tired,
    illustration: illustrations.tired,
  },
  {
    key: 'hurt',
    nameKo: '아픔',
    nameEn: 'Hurt',
    icons: icons.hurt,
    illustration: illustrations.hurt,
  },
];

// 한글 이름 → 감정 키 매핑
export const EMOTION_NAME_TO_KEY: Record<string, EmotionKey> = {
  '기쁨': 'joy',
  '평온': 'calm',
  '사랑': 'love',
  '감사': 'gratitude',
  '놀람': 'surprise',
  '불안': 'anxiety',
  '슬픔': 'sadness',
  '몰입': 'focus',
  '분노': 'anger',
  '생각': 'thoughtful',
  '피곤': 'tired',
  '아픔': 'hurt',
};

// 감정 키 → 한글 이름 매핑
export const EMOTION_KEY_TO_NAME: Record<EmotionKey, string> = {
  joy: '기쁨',
  calm: '평온',
  love: '사랑',
  gratitude: '감사',
  surprise: '놀람',
  anxiety: '불안',
  sadness: '슬픔',
  focus: '몰입',
  anger: '분노',
  thoughtful: '생각',
  tired: '피곤',
  hurt: '아픔',
};

// 헬퍼 함수: 감정 이름(한글)으로 감정 데이터 찾기
export function getEmotionByName(name: string): EmotionData | undefined {
  const key = EMOTION_NAME_TO_KEY[name];
  if (!key) return undefined;
  return EMOTIONS.find((e) => e.key === key);
}

// 헬퍼 함수: 감정 키로 감정 데이터 찾기
export function getEmotionByKey(key: EmotionKey): EmotionData | undefined {
  return EMOTIONS.find((e) => e.key === key);
}

// 헬퍼 함수: 감정 아이콘 가져오기
export function getEmotionIcon(
  nameOrKey: string,
  state: EmotionIconState = 'color'
): any {
  const key = EMOTION_NAME_TO_KEY[nameOrKey] || (nameOrKey as EmotionKey);
  const emotion = EMOTIONS.find((e) => e.key === key);
  return emotion?.icons[state] || null;
}

// 헬퍼 함수: 감정 일러스트 가져오기
export function getEmotionIllustration(nameOrKey: string): any {
  const key = EMOTION_NAME_TO_KEY[nameOrKey] || (nameOrKey as EmotionKey);
  const emotion = EMOTIONS.find((e) => e.key === key);
  return emotion?.illustration || null;
}
