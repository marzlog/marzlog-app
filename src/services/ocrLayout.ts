/**
 * OCR 레이아웃 재구성 유틸 v2 (순수 함수 — RN/네이티브 의존성 없음)
 *
 * v1: y겹침 기반 행 그룹핑 (frame만 사용)
 * v2 추가:
 *  - cornerPoints 기반 기울기(skew) 보정 — 기울어진/회전된 사진에서
 *    행 그룹핑이 붕괴하는 문제 해결 (중앙값 각도 역회전)
 *  - 행 내 구분자 적응형 선택 — 좁은 간격은 단일 공백(문장 이어붙임),
 *    넓은 간격은 COLUMN_SEPARATOR(영수증 품목-금액 등)
 *
 * v2 범위 외: 다단 문서 컬럼 플로우(신문형 세로 읽기) 복원,
 * 오인식 문자 교정(레이아웃만 다룸).
 */

/** 같은 행 판정 임계값: 세로 겹침 / min(행 밴드 높이, 라인 높이) */
export const ROW_OVERLAP_RATIO = 0.5;
/** 행 내 컬럼 구분자 (영수증 품목-금액 사이 등) */
export const COLUMN_SEPARATOR = '  ';
/** 행 구분자 */
export const ROW_SEPARATOR = '\n';
/** 행 내 가로 간격이 (행 높이 × 이 배수) 초과 시 컬럼으로 간주 */
export const COLUMN_GAP_RATIO = 2.0;
/** 이 각도(도) 이하의 기울기는 보정 생략 */
export const SKEW_EPSILON_DEG = 0.5;

export interface OcrPoint {
  x: number;
  y: number;
}

/** ML Kit cornerPoints: [0]=top-left, [1]=top-right 가정 (실기기 검증 대상) */
export type OcrCornerPoints = readonly [OcrPoint, OcrPoint, OcrPoint, OcrPoint];

export interface OcrFrame {
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface OcrLineLike {
  text: string;
  frame?: OcrFrame;
  cornerPoints?: OcrCornerPoints;
}

export interface OcrBlockLike {
  lines: OcrLineLike[];
}

export interface OcrResultLike {
  text: string;
  blocks: OcrBlockLike[];
}

interface Quad {
  text: string;
  points: OcrPoint[];
  /** 상변 기울기 각도(rad). frame 유래 quad는 기울기 정보 없음 → null */
  angle: number | null;
}

interface PositionedLine {
  text: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface Row {
  top: number;
  bottom: number;
  lines: PositionedLine[];
}

function quadFromLine(line: OcrLineLike): Quad | null {
  if (line.cornerPoints && line.cornerPoints.length === 4) {
    const [tl, tr] = line.cornerPoints;
    return {
      text: line.text,
      points: [...line.cornerPoints],
      angle: Math.atan2(tr.y - tl.y, tr.x - tl.x),
    };
  }
  if (line.frame) {
    const { top, left, width, height } = line.frame;
    return {
      text: line.text,
      points: [
        { x: left, y: top },
        { x: left + width, y: top },
        { x: left + width, y: top + height },
        { x: left, y: top + height },
      ],
      angle: null,
    };
  }
  return null;
}

function medianAngle(quads: Quad[]): number {
  const angles = quads
    .map((q) => q.angle)
    .filter((a): a is number => a !== null)
    .sort((a, b) => a - b);
  if (angles.length === 0) return 0;
  return angles[Math.floor(angles.length / 2)];
}

function isSameRow(row: Row, line: PositionedLine): boolean {
  const overlap =
    Math.min(row.bottom, line.bottom) - Math.max(row.top, line.top);
  if (overlap <= 0) return false;

  const minHeight = Math.min(row.bottom - row.top, line.bottom - line.top);
  if (minHeight <= 0) return false;

  return overlap / minHeight >= ROW_OVERLAP_RATIO;
}

/**
 * OCR 결과에서 읽기 순서를 복원한 텍스트를 반환한다.
 * 좌표(cornerPoints도 frame도) 없는 라인이 있으면 원본(result.text) 폴백.
 */
export function reconstructLayout(result: OcrResultLike): string {
  const quads: Quad[] = [];

  for (const block of result.blocks ?? []) {
    for (const line of block.lines ?? []) {
      const text = line.text?.trim();
      if (!text) continue;
      const quad = quadFromLine({ ...line, text });
      if (!quad) return result.text; // 좌표 결손 → 폴백
      quads.push(quad);
    }
  }

  if (quads.length === 0) return result.text;

  // 기울기 보정: 중앙값 각도만큼 전체 좌표 역회전
  const angle = medianAngle(quads);
  const skew =
    Math.abs(angle) > (SKEW_EPSILON_DEG * Math.PI) / 180 ? angle : 0;
  const cos = Math.cos(skew);
  const sin = Math.sin(skew);

  const lines: PositionedLine[] = quads.map((q) => {
    const xs = q.points.map((p) => p.x * cos + p.y * sin);
    const ys = q.points.map((p) => -p.x * sin + p.y * cos);
    return {
      text: q.text,
      top: Math.min(...ys),
      bottom: Math.max(...ys),
      left: Math.min(...xs),
      right: Math.max(...xs),
    };
  });

  lines.sort((a, b) => a.top - b.top || a.left - b.left);

  const rows: Row[] = [];
  for (const line of lines) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && isSameRow(lastRow, line)) {
      lastRow.lines.push(line);
      lastRow.top = Math.min(lastRow.top, line.top);
      lastRow.bottom = Math.max(lastRow.bottom, line.bottom);
    } else {
      rows.push({ top: line.top, bottom: line.bottom, lines: [line] });
    }
  }

  return rows
    .map((row) => {
      const sorted = row.lines.slice().sort((a, b) => a.left - b.left);
      const rowHeight = row.bottom - row.top;
      let out = sorted[0].text;
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i].left - sorted[i - 1].right;
        const sep =
          gap > COLUMN_GAP_RATIO * rowHeight ? COLUMN_SEPARATOR : ' ';
        out += sep + sorted[i].text;
      }
      return out;
    })
    .join(ROW_SEPARATOR);
}
