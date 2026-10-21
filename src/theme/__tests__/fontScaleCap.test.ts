/**
 * 글자 크기 확대 상한 적용 검사 (B-SHEET-FONT-SCALE)
 *
 * jest 는 node 환경(RN 렌더 테스트 없음)이라 소스 검사로 대신한다: 결제 관련 화면 5곳의 모든 <Text 가
 * maxFontSizeMultiplier={fontScaleCap.title|body} 를 쓰는지(숫자 하드코딩 없음).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fontScaleCap } from '../typography';

const ROOT = resolve(__dirname, '../../..');
const FILES = [
  'src/components/plus/PlusUpsellSheet.tsx',
  'src/components/plus/PlusCta.tsx',
  'app/paywall.tsx',
  'app/plus-success.tsx',
  'app/subscription.tsx',
];

describe('fontScaleCap', () => {
  it('제목 1.3·본문 1.5, 결제 관련 화면의 모든 Text 가 공용 상수로 상한을 건다', () => {
    expect(fontScaleCap).toEqual({ title: 1.3, body: 1.5 });
    for (const file of FILES) {
      const src = readFileSync(resolve(ROOT, file), 'utf8');
      const tags = src.match(/<Text[\s>][^\n]*/g) ?? [];
      expect(tags.length).toBeGreaterThan(0);
      const uncapped = tags.filter((tag) => !/maxFontSizeMultiplier=\{fontScaleCap\.(title|body)\}/.test(tag));
      expect({ file, uncapped }).toEqual({ file, uncapped: [] });
      expect(src).not.toMatch(/maxFontSizeMultiplier=\{\d/);
    }
  });
});
