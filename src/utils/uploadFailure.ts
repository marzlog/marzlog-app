/**
 * 업로드 실패 분류 (B-UPLOAD-FAIL-AS-PENDING, 명세 paywall-spec §4).
 *
 * HTTP 상태 기준으로만 분류한다 — 오류 메시지 문자열은 보지 않는다.
 * S3 PUT 은 axios 를 거치지 않으므로 상태 코드를 담은 오류 클래스(S3UploadError)로 던진다
 * (src/api/upload.ts). 메시지 문자열은 기존 값을 그대로 유지한다.
 *
 * RN·Expo 모듈에 의존하지 않는 순수 모듈(axios 판별만 사용).
 */
import { isAxiosError } from 'axios';

/** S3 PUT 실패. status=null 은 응답 없이 끝났고 오프라인이 확인된 경우(src/api/upload.ts). */
export class S3UploadError extends Error {
  readonly status: number | null;
  /** 같은 요청 흐름에서 서명(presigned URL)을 재발급한 뒤의 실패인지 */
  readonly afterReissue: boolean;

  constructor(status: number | null, message: string, afterReissue = false) {
    super(message);
    this.name = 'S3UploadError';
    this.status = status;
    this.afterReissue = afterReissue;
  }
}

/** 로컬 타이머 시간 초과(약한 네트워크에서 PUT hang 차단). */
export class UploadTimeoutError extends Error {
  constructor() {
    super('UPLOAD_TIMEOUT');
    this.name = 'UploadTimeoutError';
  }
}

/** 크기 사전 검사 초과(MAX_FILE_SIZE) — 업로드 전 로컬 판정. 메시지는 화면 문구 그대로. */
export class UploadOversizeError extends Error {
  constructor(message = 'file_too_large') {
    super(message);
    this.name = 'UploadOversizeError';
  }
}

/** S3 가 서명을 거절(403) — 만료로 보고 prepare 재발급 대상 */
export function isPresignRejected(err: unknown): err is S3UploadError {
  return err instanceof S3UploadError && err.status === 403;
}

/** 재발급한 서명으로도 403 이면 만료가 아니므로 표시해 둔다(분류: local). 메시지는 유지. */
export function markAfterReissue(err: unknown): unknown {
  if (isPresignRejected(err) && !err.afterReissue) {
    return new S3UploadError(err.status, err.message, true);
  }
  return err;
}

export type UploadFailureClass = 'transient' | 'auth' | 'quota' | 'rejected' | 'oversize' | 'local';

const STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED';
const CONSENT_REQUIRED = 'CONSENT_REQUIRED';

function isTransientStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

/** 413 본문: FastAPI 기본 형식 {"detail":{"error_code":...}} (routers/media.py) */
function isQuotaBody(data: unknown): boolean {
  const detail = (data as { detail?: { error_code?: unknown } } | undefined)?.detail;
  return detail?.error_code === STORAGE_QUOTA_EXCEEDED;
}

/** 403 동의 필요 본문: {"code":"CONSENT_REQUIRED",...} (main.py 핸들러, api/client.ts 와 같은 판별) */
function isConsentBody(data: unknown): boolean {
  return (data as { code?: unknown } | undefined)?.code === CONSENT_REQUIRED;
}

export function classifyUploadFailure(err: unknown): UploadFailureClass {
  if (err instanceof UploadTimeoutError) return 'transient';
  if (err instanceof UploadOversizeError) return 'oversize';

  if (err instanceof S3UploadError) {
    if (err.status === null) return 'transient';
    if (err.status === 403) return err.afterReissue ? 'local' : 'transient';
    if (isTransientStatus(err.status)) return 'transient';
    if (err.status >= 400 && err.status < 500) return 'rejected';
    return 'local';
  }

  if (isAxiosError(err)) {
    const status = err.response?.status;
    if (status === undefined) return 'transient';
    const data = err.response?.data;
    if (status === 401) return 'auth';
    if (status === 403 && isConsentBody(data)) return 'auth';
    if (status === 413 && isQuotaBody(data)) return 'quota';
    if (isTransientStatus(status)) return 'transient';
    if (status >= 400 && status < 500) return 'rejected';
    return 'local';
  }

  return 'local';
}

/** 관측용 상태 코드(없으면 null). 메시지·본문은 싣지 않는다. */
export function uploadFailureStatus(err: unknown): number | null {
  if (err instanceof S3UploadError) return err.status;
  if (isAxiosError(err)) return err.response?.status ?? null;
  return null;
}

export type JobFailureAction =
  | { type: 'discard'; reason: 'quota' | 'rejected' | 'oversize' }
  | { type: 'keep'; incrementAttempts: boolean };

/**
 * 작업(사진 여러 장일 수 있음) 단위 결정 — 명세 §4:
 *  ① quota 가 하나라도 있으면 작업 전체를 버린다
 *  ② 남은 실패에 transient·auth·local 이 있으면 보존한다(local 이 있으면 재시도 횟수 +1)
 *  ③ 남은 실패가 전부 rejected·oversize 일 때만 버린다(rejected 가 섞이면 reason=rejected — warning 대상)
 */
export function decideJobFailure(classes: UploadFailureClass[]): JobFailureAction {
  if (classes.includes('quota')) return { type: 'discard', reason: 'quota' };
  const kept = classes.filter((c) => c !== 'rejected' && c !== 'oversize');
  if (classes.length === 0 || kept.length > 0) {
    return { type: 'keep', incrementAttempts: classes.length === 0 || kept.includes('local') };
  }
  return { type: 'discard', reason: classes.includes('rejected') ? 'rejected' : 'oversize' };
}

/**
 * 이 실패를 예외 이벤트(captureError)로도 남길지 — 명세 §6.
 *  - quota·oversize: 정상 거절 — 예외 없음(버릴 때 breadcrumb 만)
 *  - rejected: 큐에 올라간 작업이면 settleFailedJob 이 warning 1건을 남기므로 생략.
 *    큐가 없으면(web·등록 실패) warning 이 없으니 예외로 남긴다.
 *  - 그 외: 현행대로 남긴다
 */
export function reportsAsException(err: unknown, queued: boolean): boolean {
  const failureClass = classifyUploadFailure(err);
  if (failureClass === 'quota' || failureClass === 'oversize') return false;
  if (failureClass === 'rejected') return !queued;
  return true;
}

/**
 * 예외 기록을 작업 결정 뒤로 미룰지 — 큐에 올라간 작업의 rejected 만.
 * 작업이 버려지면 warning 1건으로 끝나고, 보존되면 그때 예외로 남긴다.
 * quota·oversize 는 어떤 경우에도 예외 대상이 아니므로 미루지 않는다.
 */
export function defersUntilSettled(err: unknown, queued: boolean): boolean {
  return queued && classifyUploadFailure(err) === 'rejected';
}
