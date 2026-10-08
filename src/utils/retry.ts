/**
 * 업로드 재시도 공용 유틸 (B-DN).
 * useImageUpload(최초 업로드)과 resumeUploads(재개) 양쪽에서 공유 — 중복 구현 제거.
 * 실패 분류(재시도 횟수 소모 여부)는 utils/uploadFailure.classifyUploadFailure 가 담당한다.
 */
import { isPresignRejected } from './uploadFailure';

/** ms 만큼 대기 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 일시적 실패에 한해 지수 백오프 재시도.
 * S3 서명 거절(403, 'PRESIGNED_EXPIRED')은 재시도 대상이 아님 — 즉시 throw(상위에서 prepare 재발급/job failed 처리).
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
      if (isPresignRejected(err)) throw err;
      lastErr = err;
      if (attempt < maxAttempts) await sleep(backoffBaseMs * attempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
