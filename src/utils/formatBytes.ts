/**
 * 바이트 → 표시 문자열(KB·MB·GB, 소수 1자리). 저장 공간 카드(더보기)와 마이페이지가 같은 표기를 쓴다(D6-3).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
