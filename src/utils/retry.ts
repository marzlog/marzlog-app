/**
 * 업로드 재시도 공용 유틸 (B-DN).
 * useImageUpload(최초 업로드)과 resumeUploads(재개) 양쪽에서 공유 — 중복 구현 제거.
 */

/** ms 만큼 대기 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 일시적 실패에 한해 지수 백오프 재시도.
 * 'PRESIGNED_EXPIRED'는 재시도 대상이 아님 — 즉시 throw(상위에서 prepare 재발급/job failed 처리).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  backoffBaseMs: number,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof Error && err.message === 'PRESIGNED_EXPIRED') throw err;
      lastErr = err;
      if (attempt < maxAttempts) await sleep(backoffBaseMs * attempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** 네트워크성/일시적 업로드 실패 판별 — attempts 소모 면제 대상.
 *  에러는 전부 new Error(문자열) 형태라 message 매칭으로 분류(구조화 code 없음). */
export function isTransientUploadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg === 'UPLOAD_TIMEOUT' ||
    msg === 'PRESIGNED_EXPIRED' ||
    msg.includes('Network error') ||   // S3 xhr 끊김('Network error during S3 upload')
    msg.includes('Network Error') ||   // axios 네트워크
    msg.includes('ECONNABORTED') ||
    msg.includes('ERR_NETWORK') ||
    msg.includes('timeout')
  );
}
