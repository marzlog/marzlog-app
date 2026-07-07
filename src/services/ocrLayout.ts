/**
 * OCR 레이아웃 재구성 유틸 (순수 함수 — RN/네이티브 의존성 없음)
 *
 * 배경: ML Kit TextRecognition의 result.text는 블록을 "탐지 순서"로
 * 이어붙인 flat 문자열이라, 영수증/티켓/메뉴판처럼 좌우 컬럼 구조가
 * 있는 이미지에서 행이 뒤섞인다.
 *
 * 알고리즘:
 *  1. 모든 라인 수집 (block 경계 무시, line 단위)
 *  2. y축 겹침 비율 기준 같은 시각적 행(row) 그룹핑
 *  3. 행은 위→아래, 행 내부는 좌→우 정렬
 *  4. 행 내 컬럼은 COLUMN_SEPARATOR, 행 간은 ROW_SEPARATOR 연결
 *
 * v1 범위 외: 기울어진/회전 이미지 보정(cornerPoints 미사용),
 * 다단 문서 컬럼 플로우(신문형 세로 읽기) 복원.
 */

/** 같은 행 판정 임계값: 세로 겹침 / min(행 밴드 높이, 라인 높이) */
export const ROW_OVERLAP_RATIO = 0.5;
/** 행 내 컬럼 구분자 (영수증 품목-금액 사이 등) */
export const COLUMN_SEPARATOR = '  ';
/** 행 구분자 */
export const ROW_SEPARATOR = '\n';

export interface OcrFrame {
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface OcrLineLike {
  text: string;
  frame?: OcrFrame;
}

export interface OcrBlockLike {
  lines: OcrLineLike[];
}

export interface OcrResultLike {
  text: string;
  blocks: OcrBlockLike[];
}

interface PositionedLine {
  text: string;
  top: number;
  bottom: number;
  left: number;
}

interface Row {
  top: number;
  bottom: number;
  lines: PositionedLine[];
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
 * frame이 없는 라인이 하나라도 있으면 안전하게 원본(result.text)을 반환한다.
 */
export function reconstructLayout(result: OcrResultLike): string {
  const lines: PositionedLine[] = [];

  for (const block of result.blocks ?? []) {
    for (const line of block.lines ?? []) {
      const text = line.text?.trim();
      if (!text) continue;
      if (!line.frame) {
        return result.text; // 좌표 결손 → 폴백
      }
      lines.push({
        text,
        top: line.frame.top,
        bottom: line.frame.top + line.frame.height,
        left: line.frame.left,
      });
    }
  }

  if (lines.length === 0) return result.text;

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
    .map((row) =>
      row.lines
        .slice()
        .sort((a, b) => a.left - b.left)
        .map((l) => l.text)
        .join(COLUMN_SEPARATOR),
    )
    .join(ROW_SEPARATOR);
}
