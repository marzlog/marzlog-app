/**
 * 감정 강도 칩·배지 계약 (F-EMOTION-REVAMP, 11차).
 *
 * - 칩 값 6/9, 임계 8(백엔드 INTENSE_THRESHOLD 와 동일)
 * - 배지: 'user' 만 강도 반영 / 'ai'·'default'·출처 없음은 감정어만
 * - 재탭 해제, 편집 진입 시 기존 값 보존
 * - i18n: 12종 × {기본, Intense} 키가 4언어에 모두 있고, 폐기 키는 없다
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  INTENSE_THRESHOLD,
  INTENSITY_NORMAL,
  INTENSITY_VERY,
  emotionBadgeKey,
  emotionLabelKey,
  initialIntensity,
  isIntense,
  toggleEmotion,
} from '../emotionIntensity';
import { EMOTION_KEYS } from '../../constants/emotionKeys';

describe('칩 값·임계', () => {
  it('보통 6 / 매우 9 / 임계 8', () => {
    expect([INTENSITY_NORMAL, INTENSITY_VERY, INTENSE_THRESHOLD]).toEqual([6, 9, 8]);
  });

  it('칩 값이 각자의 구간에 떨어진다', () => {
    expect(isIntense(INTENSITY_NORMAL)).toBe(false);
    expect(isIntense(INTENSITY_VERY)).toBe(true);
  });

  it.each([[7, false], [8, true], [10, true], [null, false], [undefined, false], [NaN, false]])(
    'isIntense(%s) = %s',
    (v, expected) => {
      expect(isIntense(v as number | null | undefined)).toBe(expected);
    },
  );
});

describe('배지 라벨 키', () => {
  it("'user' + 8 이상이면 Intense", () => {
    expect(emotionBadgeKey('joy', 9, 'user')).toBe('emotions.joyIntense');
    expect(emotionBadgeKey('joy', 8, 'user')).toBe('emotions.joyIntense');
  });

  it("'user' + 8 미만이면 감정어만", () => {
    expect(emotionBadgeKey('joy', 6, 'user')).toBe('emotions.joy');
  });

  it.each(['ai', 'default', null, undefined])("출처 %s 는 강도를 무시한다(방치 6·AI 무강도)", (source) => {
    expect(emotionBadgeKey('calm', 10, source as string | null | undefined)).toBe('emotions.calm');
  });

  it('감정이 없거나 해석 불가면 null', () => {
    expect(emotionBadgeKey(null, 9, 'user')).toBeNull();
    expect(emotionBadgeKey('행복', 9, 'user')).toBeNull();
  });

  it('구 표기·한국어 라벨도 정본 키로 해석한다', () => {
    expect(emotionLabelKey('thoughtful')).toBe('emotions.thought');
    expect(emotionLabelKey('기쁨', true)).toBe('emotions.joyIntense');
  });
});

describe('선택 토글·편집 진입값', () => {
  it('같은 감정 재탭은 해제, 다른 감정은 교체', () => {
    expect(toggleEmotion('joy', 'joy')).toBeNull();
    expect(toggleEmotion('joy', 'calm')).toBe('calm');
    expect(toggleEmotion(null, 'calm')).toBe('calm');
  });

  it('기존 값은 그대로, 없거나 잡값이면 보통(6)', () => {
    expect(initialIntensity(7)).toBe(7);
    expect(initialIntensity(3)).toBe(3);
    expect(initialIntensity(null)).toBe(6);
    expect(initialIntensity(0)).toBe(6);
    expect(initialIntensity(11)).toBe(6);
  });
});

describe('i18n 감정 라벨 키 (4언어)', () => {
  const LOCALES = ['ko', 'en', 'vi', 'th'];
  const load = (lang: string) =>
    JSON.parse(fs.readFileSync(path.join(__dirname, '../../i18n/locales', `${lang}.json`), 'utf8'));

  it.each(LOCALES)('%s: 12종 × {기본, Intense} 가 비어 있지 않다', (lang) => {
    const { emotions } = load(lang);
    for (const key of EMOTION_KEYS) {
      expect(typeof emotions[key]).toBe('string');
      expect(emotions[key].trim().length).toBeGreaterThan(0);
      expect(typeof emotions[`${key}Intense`]).toBe('string');
      expect(emotions[`${key}Intense`]).not.toBe(emotions[key]);
    }
    expect(Object.keys(emotions)).toHaveLength(24);
  });

  it.each(LOCALES)('%s: 슬라이더 폐기 키가 남아 있지 않다', (lang) => {
    const { mediaDetail } = load(lang);
    for (const dead of ['intensityLabel', 'intensitySlight', 'intensityALittle', 'intensityQuite', 'intensityVery']) {
      expect(mediaDetail).not.toHaveProperty(dead);
    }
  });

  it.each(LOCALES)('%s: 미선택 AI 추정 안내 키가 있다', (lang) => {
    expect(load(lang).upload.emotionAiHint.trim().length).toBeGreaterThan(0);
  });
});
