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

  const rot = (x: number, y: number, deg: number): { x: number; y: number } => {
    const r = (deg * Math.PI) / 180;
    return {
      x: x * Math.cos(r) - y * Math.sin(r),
      y: x * Math.sin(r) + y * Math.cos(r),
    };
  };

  /** 텍스트 좌표계에서 x0~x1 구간의 라인을 deg만큼 기울인 cornerPoints */
  const tiltedQuad = (x0: number, x1: number, deg: number, yBase = 0, h = 20) =>
    [
      rot(x0, yBase, deg),
      rot(x1, yBase, deg),
      rot(x1, yBase + h, deg),
      rot(x0, yBase + h, deg),
    ] as const;

  it('기울어진 사진: 행 끝 꼬리 조각이 같은 행으로 병합된다', () => {
    const result: OcrResultLike = {
      text: '멜리세덱의\n반\n다음 줄',
      blocks: [
        {
          lines: [
            { text: '멜리세덱의', cornerPoints: tiltedQuad(0, 300, 10) },
            { text: '반', cornerPoints: tiltedQuad(320, 360, 10) },
            { text: '다음 줄', cornerPoints: tiltedQuad(0, 300, 10, 40) },
          ],
        },
      ],
    };
    expect(reconstructLayout(result)).toBe('멜리세덱의 반\n다음 줄');
  });

  it('좁은 간격은 단일 공백, 넓은 간격은 컬럼 구분자로 병합된다', () => {
    const result: OcrResultLike = {
      text: '',
      blocks: [
        {
          lines: [
            { text: 'A', frame: frame(0, 0, 100, 20) },
            { text: 'B', frame: frame(0, 110, 100, 20) },
            { text: 'C', frame: frame(0, 400, 100, 20) },
          ],
        },
      ],
    };
    expect(reconstructLayout(result)).toBe(`A B${COLUMN_SEPARATOR}C`);
  });

  it('cornerPoints만 있고 frame이 없어도 처리된다', () => {
    const result: OcrResultLike = {
      text: 'RAW',
      blocks: [
        { lines: [{ text: '좌표있음', cornerPoints: tiltedQuad(0, 100, 0) }] },
      ],
    };
    expect(reconstructLayout(result)).toBe('좌표있음');
  });
});
