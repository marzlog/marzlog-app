/**
 * resolveEmotionKey / EMOTION_LABELS 계약 (F-MOOD-DIMENSION P3, ADR-2026-09-02-01).
 *
 * 3계열을 고정한다:
 *   ① 키        — 서버 정본. 그대로 통과
 *   ② nameKo    — 마이그레이션 024 이전 데이터·구 캐시 폴백
 *   ③ 미해석    — null. 호출부는 원문을 화면에 노출하지 않는다
 *                 (실기에서 'thought' 가 그대로 찍힌 버그의 회귀 가드)
 */
import {
  DEFAULT_EMOTION_KEY,
  EMOTION_KEYS,
  EMOTION_LABELS,
  resolveEmotionKey,
  resolveEmotionLabels,
  type EmotionKey,
} from '../emotionKeys';

// 백엔드 apps/api/app/core/emotions.py 의 12키 (별도로 적어 두어야 드리프트가 잡힌다)
const BACKEND_KEYS = [
  'joy', 'calm', 'love', 'gratitude', 'surprise', 'anxiety',
  'sadness', 'focus', 'anger', 'thought', 'tired', 'pain',
];

describe('정본 세트', () => {
  it('백엔드 12키와 정확히 일치한다(순서 포함)', () => {
    expect([...EMOTION_KEYS]).toEqual(BACKEND_KEYS);
  });

  it('키가 중복되지 않는다', () => {
    expect(new Set(EMOTION_KEYS).size).toBe(12);
  });

  it('nameKo 가 12개 모두 서로 다르다', () => {
    expect(new Set(EMOTION_LABELS.map((e) => e.nameKo)).size).toBe(12);
  });

  it('기본 감정은 유효한 키다', () => {
    expect(EMOTION_KEYS).toContain(DEFAULT_EMOTION_KEY);
    expect(DEFAULT_EMOTION_KEY).toBe('calm'); // 서버 DEFAULT_EMOTION 과 동일
  });

  it('모든 항목이 ko/en 라벨을 갖는다', () => {
    for (const e of EMOTION_LABELS) {
      expect(e.nameKo.trim().length).toBeGreaterThan(0);
      expect(e.nameEn.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('① 키 계열', () => {
  it.each(BACKEND_KEYS)('%s 는 그대로 해석된다', (key) => {
    expect(resolveEmotionKey(key)).toBe(key);
  });

  it.each(BACKEND_KEYS)('%s 는 대문자·공백을 흡수한다', (key) => {
    expect(resolveEmotionKey(`  ${key.toUpperCase()}  `)).toBe(key);
  });

  it('구 앱 키 표기를 정본 키로 흡수한다', () => {
    // P3 이전 앱은 thoughtful/hurt 를 썼다 — 로컬 캐시·업로드 큐에 남아 있을 수 있다
    expect(resolveEmotionKey('thoughtful')).toBe('thought');
    expect(resolveEmotionKey('hurt')).toBe('pain');
  });
});

describe('② nameKo 계열', () => {
  it.each(EMOTION_LABELS.map((e) => [e.nameKo, e.key] as [string, EmotionKey]))(
    '%s → %s',
    (nameKo, key) => {
      expect(resolveEmotionKey(nameKo)).toBe(key);
    },
  );
});

describe('③ 미해석 계열 → null', () => {
  it.each([
    ['빈 문자열', ''],
    ['공백만', '   '],
    ['임의 문자열', 'zzz'],
    ['영문 라벨(표시용, 저장값 아님)', 'Joy!'],
  ])('%s', (_label, value) => {
    expect(resolveEmotionKey(value)).toBeNull();
  });

  it.each(['행복', '평화', '설렘', '그리움', '활기', '편안', 'peaceful', 'wistful', 'lively'])(
    '폐기된 mood 어휘 %s 는 감정이 아니다',
    (mood) => {
      expect(resolveEmotionKey(mood)).toBeNull();
    },
  );

  it('null/undefined/비문자열도 null', () => {
    expect(resolveEmotionKey(null)).toBeNull();
    expect(resolveEmotionKey(undefined)).toBeNull();
    expect(resolveEmotionKey(123 as unknown as string)).toBeNull();
    expect(resolveEmotionKey({} as unknown as string)).toBeNull();
  });
});

describe('resolveEmotionLabels', () => {
  it('키로 라벨 쌍을 돌려준다', () => {
    expect(resolveEmotionLabels('gratitude')).toEqual({
      key: 'gratitude', nameKo: '감사', nameEn: 'Gratitude',
    });
  });

  it('nameKo 로도 같은 결과', () => {
    expect(resolveEmotionLabels('감사')).toEqual(resolveEmotionLabels('gratitude'));
  });

  it('미해석이면 null', () => {
    expect(resolveEmotionLabels('행복')).toBeNull();
  });

  it('구 표기 thoughtful 의 라벨은 생각/Thoughtful', () => {
    expect(resolveEmotionLabels('thoughtful')).toEqual({
      key: 'thought', nameKo: '생각', nameEn: 'Thoughtful',
    });
  });
});
