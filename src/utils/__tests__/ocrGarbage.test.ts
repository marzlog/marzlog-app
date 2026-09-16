/**
 * 기기 OCR 쓰레기 텍스트 판정 계약 — F-OCR-GARBAGE-FILTER (14차).
 *
 * 테스터 실보고: 기울어진 디자인 서체에서 `IIIIIIIW` 가 저장됐다(DB `8cca18b2`, ocr_status='done').
 * ML Kit 래퍼는 confidence 를 노출하지 않으므로(패키지 grep 0건) 문자열 휴리스틱으로 판정한다.
 *
 * ★임계는 보수적이다 — 과차단(정상 텍스트를 삼키는 것)이 3차 회귀 패턴이므로,
 *   저다양성 규칙은 **공백 없는 단일 토큰**에만 적용한다. 여러 줄·여러 토큰 텍스트는 통과시킨다.
 */
import { OCR_GARBAGE_THRESHOLDS, isGarbageOcrText } from '../ocrGarbage';

describe('쓰레기로 판정한다', () => {
  it('실물 케이스 IIIIIIIW (단일 토큰 · 반복 문자 7/8)', () => {
    expect(isGarbageOcrText('IIIIIIIW')).toBe(true);
  });

  it.each([
    ['한 글자', 'I'],
    ['기호만', '|||||'],
    ['공백뿐', '   \n  '],
    ['빈 문자열', ''],
    ['같은 글자 반복(한글)', 'ㅁㅁㅁㅁㅁㅁ'],
    ['같은 글자 반복(영문)', 'llllllll'],
  ])('%s', (_label, text) => {
    expect(isGarbageOcrText(text)).toBe(true);
  });
});

describe('정상 텍스트는 통과시킨다 (과차단 금지)', () => {
  const receipt = ['영수증', '아메리카노 2 4,000원', '카페라떼 1 3,500원', '합계 7,500원'].join('\n');

  it.each([
    ['영수증형 다행 텍스트', receipt],
    ['한국어 홍보 문구', 'MarZlog 사진 한 장으로 오늘을 기록하세요. AI가 평범한 순간을 나의 이야기로 남깁니다'],
    ['영문+숫자 혼합', 'Runtime 1.0.2 (android, ios) Commit 2efd2a829c38af1e4d5df860'],
    ['짧은 정상 단어', 'OPEN'],
    ['단일 토큰이지만 다양성 높음', 'MarZlog'],
    ['다토큰 짧은 텍스트', 'MER RRY 1'],
    ['URL', 'https://marzlog.com/terms'],
  ])('%s', (_label, text) => {
    expect(isGarbageOcrText(text)).toBe(false);
  });
});

describe('임계 상수는 판정 함수와 분리돼 있다', () => {
  it('상수가 공개되고 보수적 값이다', () => {
    expect(OCR_GARBAGE_THRESHOLDS.minChars).toBeLessThanOrEqual(2);
    expect(OCR_GARBAGE_THRESHOLDS.singleTokenMinLength).toBeGreaterThanOrEqual(5);
    expect(OCR_GARBAGE_THRESHOLDS.maxRepeatRatio).toBeGreaterThanOrEqual(0.6);
    expect(OCR_GARBAGE_THRESHOLDS.minDistinctRatio).toBeLessThanOrEqual(0.4);
  });
});
