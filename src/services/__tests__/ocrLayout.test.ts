import { reconstructLayout, COLUMN_SEPARATOR } from '../ocrLayout';
import type { OcrResultLike } from '../ocrLayout';

const frame = (top: number, left: number, width = 100, height = 20) => ({
  top,
  left,
  width,
  height,
});

describe('reconstructLayout', () => {
  it('영수증: 좌측 품목/우측 금액이 같은 행으로 병합된다', () => {
    const result: OcrResultLike = {
      text: '아메리카노\n라떼\n4,500\n5,000',
      blocks: [
        {
          lines: [
            { text: '아메리카노', frame: frame(0, 0) },
            { text: '라떼', frame: frame(30, 0) },
          ],
        },
        {
          lines: [
            { text: '4,500', frame: frame(2, 200) },
            { text: '5,000', frame: frame(31, 200) },
          ],
        },
      ],
    };
    expect(reconstructLayout(result)).toBe(
      `아메리카노${COLUMN_SEPARATOR}4,500\n라떼${COLUMN_SEPARATOR}5,000`,
    );
  });

  it('단일 컬럼 문서는 순서가 보존된다', () => {
    const result: OcrResultLike = {
      text: '첫째 줄\n둘째 줄',
      blocks: [
        {
          lines: [
            { text: '첫째 줄', frame: frame(0, 0) },
            { text: '둘째 줄', frame: frame(30, 0) },
          ],
        },
      ],
    };
    expect(reconstructLayout(result)).toBe('첫째 줄\n둘째 줄');
  });

  it('frame 없는 라인이 있으면 원본 텍스트로 폴백한다', () => {
    const result: OcrResultLike = {
      text: 'RAW_ORIGINAL',
      blocks: [{ lines: [{ text: '좌표 없음' }] }],
    };
    expect(reconstructLayout(result)).toBe('RAW_ORIGINAL');
  });

  it('빈 결과는 원본을 반환한다', () => {
    expect(reconstructLayout({ text: '', blocks: [] })).toBe('');
  });

  it('겹침이 임계값 미만이면 다른 행으로 분리된다', () => {
    const result: OcrResultLike = {
      text: '',
      blocks: [
        {
          lines: [
            { text: 'A', frame: frame(0, 0, 100, 20) },
            { text: 'B', frame: frame(15, 200, 100, 20) },
          ],
        },
      ],
    };
    expect(reconstructLayout(result)).toBe('A\nB');
  });
});
