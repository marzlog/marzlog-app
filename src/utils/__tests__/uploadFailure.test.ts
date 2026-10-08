/**
 * uploadFailure 단위 테스트 (B-UPLOAD-FAIL-AS-PENDING, 명세 paywall-spec §4)
 *
 * 불변식:
 *  - 분류는 HTTP 상태 기준. 메시지 문자열이 같아도 오류 형태가 다르면 분류가 다르다.
 *  - 413 용량 초과 본문은 FastAPI 기본 형식 {"detail":{"error_code":...}}.
 *  - 403 동의 필요 본문은 {"code":"CONSENT_REQUIRED"} (main.py 핸들러).
 */
import { AxiosError, AxiosResponse, HttpStatusCode, InternalAxiosRequestConfig } from 'axios';
import {
  S3UploadError,
  UploadOversizeError,
  UploadTimeoutError,
  classifyUploadFailure,
  decideJobFailure,
  isPresignRejected,
  markAfterReissue,
  defersUntilSettled,
  reportsAsException,
  uploadFailureStatus,
} from '../uploadFailure';

const config = { headers: {} } as InternalAxiosRequestConfig;

function httpError(status: number, data?: unknown): AxiosError {
  const response: AxiosResponse = { data, status, statusText: '', headers: {}, config };
  return new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_RESPONSE, config, null, response);
}

const QUOTA_BODY = {
  detail: {
    error_code: 'STORAGE_QUOTA_EXCEEDED',
    message: '저장 공간이 부족합니다. 플랜을 업그레이드해주세요.',
    detail: { used_bytes: 2147483648, limit_bytes: 2147483648, plan: 'free', upgrade_url: '/plans' },
  },
};

describe('classifyUploadFailure — API(axios)', () => {
  it.each<[string, unknown, string]>([
    ['응답 없음(ERR_NETWORK)', new AxiosError('Network Error', AxiosError.ERR_NETWORK, config), 'transient'],
    ['응답 없음(ECONNABORTED 시간 초과)', new AxiosError('timeout of 30000ms exceeded', AxiosError.ECONNABORTED, config), 'transient'],
    ['500', httpError(HttpStatusCode.InternalServerError), 'transient'],
    ['503', httpError(HttpStatusCode.ServiceUnavailable), 'transient'],
    ['408', httpError(HttpStatusCode.RequestTimeout), 'transient'],
    ['429', httpError(HttpStatusCode.TooManyRequests), 'transient'],
    ['401', httpError(HttpStatusCode.Unauthorized), 'auth'],
    ['403 CONSENT_REQUIRED', httpError(HttpStatusCode.Forbidden, { code: 'CONSENT_REQUIRED', detail: '...' }), 'auth'],
    ['403 기타', httpError(HttpStatusCode.Forbidden, { detail: 'Forbidden' }), 'rejected'],
    ['413 STORAGE_QUOTA_EXCEEDED', httpError(HttpStatusCode.PayloadTooLarge, QUOTA_BODY), 'quota'],
    ['413 기타(nginx 본문 등)', httpError(HttpStatusCode.PayloadTooLarge, '<html>413</html>'), 'rejected'],
    ['413 최상위 error_code(구 판별 형식)는 quota 아님', httpError(HttpStatusCode.PayloadTooLarge, { error_code: 'STORAGE_QUOTA_EXCEEDED' }), 'rejected'],
    ['400', httpError(HttpStatusCode.BadRequest), 'rejected'],
    ['404', httpError(HttpStatusCode.NotFound), 'rejected'],
    ['422', httpError(HttpStatusCode.UnprocessableEntity), 'rejected'],
  ])('%s → %s', (_label, err, expected) => {
    expect(classifyUploadFailure(err)).toBe(expected);
  });
});

describe('classifyUploadFailure — S3 PUT·로컬', () => {
  it.each<[string, unknown, string]>([
    ['S3 응답 없음(오프라인 확인)', new S3UploadError(null, 'Network error during S3 upload'), 'transient'],
    ['S3 403(서명 만료 — 재발급 대상)', new S3UploadError(403, 'PRESIGNED_EXPIRED'), 'transient'],
    ['S3 403 재발급 후에도', new S3UploadError(403, 'PRESIGNED_EXPIRED', true), 'local'],
    ['S3 500', new S3UploadError(500, 'S3 upload failed: 500'), 'transient'],
    ['S3 503', new S3UploadError(503, 'S3 upload failed: 503'), 'transient'],
    ['S3 400', new S3UploadError(400, 'S3 upload failed: 400'), 'rejected'],
    ['로컬 타이머 시간 초과', new UploadTimeoutError(), 'transient'],
    ['HTTP 응답이 아닌 실패(사본 없음 등)', new Error('File does not exist'), 'local'],
    ['응답 형식 오류', new Error('No presigned URL received'), 'local'],
    ['크기 사전 검사 초과', new UploadOversizeError(), 'oversize'],
    ['크기 사전 검사 초과(화면 문구 메시지)', new UploadOversizeError('a.jpg 파일이 너무 커요'), 'oversize'],
    ['오류 객체가 아닌 값', 'file_too_large', 'local'],
  ])('%s → %s', (_label, err, expected) => {
    expect(classifyUploadFailure(err)).toBe(expected);
  });

  it('메시지 문자열은 분류에 쓰지 않는다 — 같은 메시지의 일반 Error 는 local', () => {
    expect(classifyUploadFailure(new Error('PRESIGNED_EXPIRED'))).toBe('local');
    expect(classifyUploadFailure(new Error('UPLOAD_TIMEOUT'))).toBe('local');
    expect(classifyUploadFailure(new Error('Network error during S3 upload'))).toBe('local');
  });

  it('오류 클래스는 기존 메시지 문자열을 유지한다', () => {
    expect(new S3UploadError(403, 'PRESIGNED_EXPIRED').message).toBe('PRESIGNED_EXPIRED');
    expect(new UploadTimeoutError().message).toBe('UPLOAD_TIMEOUT');
  });
});

describe('isPresignRejected / markAfterReissue', () => {
  it('S3 403 만 서명 거절로 본다', () => {
    expect(isPresignRejected(new S3UploadError(403, 'PRESIGNED_EXPIRED'))).toBe(true);
    expect(isPresignRejected(new S3UploadError(500, 'S3 upload failed: 500'))).toBe(false);
    expect(isPresignRejected(httpError(HttpStatusCode.Forbidden))).toBe(false);
    expect(isPresignRejected(new Error('PRESIGNED_EXPIRED'))).toBe(false);
  });

  it('S3 403 에 재발급 표시를 붙이고 메시지는 유지한다', () => {
    const marked = markAfterReissue(new S3UploadError(403, 'PRESIGNED_EXPIRED'));
    expect(marked).toBeInstanceOf(S3UploadError);
    expect((marked as S3UploadError).afterReissue).toBe(true);
    expect((marked as S3UploadError).message).toBe('PRESIGNED_EXPIRED');
    expect(classifyUploadFailure(marked)).toBe('local');
  });

  it('S3 403 이 아니면 그대로 돌려준다', () => {
    const e500 = new S3UploadError(500, 'S3 upload failed: 500');
    const local = new Error('boom');
    expect(markAfterReissue(e500)).toBe(e500);
    expect(markAfterReissue(local)).toBe(local);
  });
});

describe('uploadFailureStatus', () => {
  it('상태 코드만 꺼낸다(없으면 null)', () => {
    expect(uploadFailureStatus(httpError(HttpStatusCode.BadRequest))).toBe(400);
    expect(uploadFailureStatus(new S3UploadError(403, 'PRESIGNED_EXPIRED'))).toBe(403);
    expect(uploadFailureStatus(new S3UploadError(null, 'Network error during S3 upload'))).toBeNull();
    expect(uploadFailureStatus(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config))).toBeNull();
    expect(uploadFailureStatus(new Error('x'))).toBeNull();
  });
});

describe('decideJobFailure (명세 §4 작업 단위 규칙)', () => {
  it('① quota 가 하나라도 있으면 버린다', () => {
    expect(decideJobFailure(['quota'])).toEqual({ type: 'discard', reason: 'quota' });
    expect(decideJobFailure(['transient', 'quota'])).toEqual({ type: 'discard', reason: 'quota' });
    expect(decideJobFailure(['local', 'rejected', 'quota'])).toEqual({ type: 'discard', reason: 'quota' });
  });

  it('② transient·auth 만 남으면 보존, 재시도 횟수 유지', () => {
    expect(decideJobFailure(['transient'])).toEqual({ type: 'keep', incrementAttempts: false });
    expect(decideJobFailure(['auth'])).toEqual({ type: 'keep', incrementAttempts: false });
    expect(decideJobFailure(['rejected', 'transient'])).toEqual({ type: 'keep', incrementAttempts: false });
  });

  it('② local 이 있으면 보존, 재시도 횟수 +1', () => {
    expect(decideJobFailure(['local'])).toEqual({ type: 'keep', incrementAttempts: true });
    expect(decideJobFailure(['transient', 'local'])).toEqual({ type: 'keep', incrementAttempts: true });
    expect(decideJobFailure(['rejected', 'local'])).toEqual({ type: 'keep', incrementAttempts: true });
  });

  it('③ 남은 실패가 전부 rejected 일 때만 버린다', () => {
    expect(decideJobFailure(['rejected'])).toEqual({ type: 'discard', reason: 'rejected' });
    expect(decideJobFailure(['rejected', 'rejected'])).toEqual({ type: 'discard', reason: 'rejected' });
  });

  it('③ oversize 는 rejected 와 같은 묶음 취급 — 전부 oversize 면 reason=oversize', () => {
    expect(decideJobFailure(['oversize'])).toEqual({ type: 'discard', reason: 'oversize' });
    expect(decideJobFailure(['oversize', 'oversize'])).toEqual({ type: 'discard', reason: 'oversize' });
    expect(decideJobFailure(['oversize', 'rejected'])).toEqual({ type: 'discard', reason: 'rejected' });
    expect(decideJobFailure(['oversize', 'transient'])).toEqual({ type: 'keep', incrementAttempts: false });
    expect(decideJobFailure(['oversize', 'local'])).toEqual({ type: 'keep', incrementAttempts: true });
    expect(decideJobFailure(['oversize', 'quota'])).toEqual({ type: 'discard', reason: 'quota' });
  });

  it('실패 목록이 비면 보존(+1) — 분류 근거 없이 버리지 않는다', () => {
    expect(decideJobFailure([])).toEqual({ type: 'keep', incrementAttempts: true });
  });
});

describe('reportsAsException (명세 §6 — 직접 업로드·재개의 예외 이벤트)', () => {
  it('rejected: 큐에 올라간 작업이면 생략(warning 1건만), 큐가 없으면 예외로 남긴다', () => {
    expect(reportsAsException(httpError(HttpStatusCode.UnprocessableEntity), true)).toBe(false);
    expect(reportsAsException(httpError(HttpStatusCode.UnprocessableEntity), false)).toBe(true);
    expect(reportsAsException(new S3UploadError(400, 'S3 upload failed: 400'), true)).toBe(false);
  });

  it('quota·oversize: 예외 없음(breadcrumb 만)', () => {
    expect(reportsAsException(httpError(HttpStatusCode.PayloadTooLarge, QUOTA_BODY), true)).toBe(false);
    expect(reportsAsException(new UploadOversizeError(), true)).toBe(false);
    expect(reportsAsException(new UploadOversizeError(), false)).toBe(false);
  });

  it('transient·auth·local: 현행대로 예외를 남긴다', () => {
    expect(reportsAsException(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config), true)).toBe(true);
    expect(reportsAsException(httpError(HttpStatusCode.ServiceUnavailable), true)).toBe(true);
    expect(reportsAsException(httpError(HttpStatusCode.Unauthorized), true)).toBe(true);
    expect(reportsAsException(new Error('File does not exist'), true)).toBe(true);
    expect(reportsAsException(new S3UploadError(403, 'PRESIGNED_EXPIRED', true), true)).toBe(true);
  });
});

describe('defersUntilSettled (단일 경로 사진별 예외 기록 미룸)', () => {
  it('quota → 미루지 않음, rejected → 미룸(큐에 올라간 작업만)', () => {
    expect(defersUntilSettled(httpError(HttpStatusCode.PayloadTooLarge, QUOTA_BODY), true)).toBe(false);
    expect(defersUntilSettled(httpError(HttpStatusCode.UnprocessableEntity), true)).toBe(true);
    expect(defersUntilSettled(new S3UploadError(400, 'S3 upload failed: 400'), true)).toBe(true);
    expect(defersUntilSettled(new UploadOversizeError(), true)).toBe(false);
    expect(defersUntilSettled(httpError(HttpStatusCode.UnprocessableEntity), false)).toBe(false);
    expect(defersUntilSettled(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config), true)).toBe(false);
  });
});
