/**
 * resumeUploads 단위 테스트 (B-UPLOAD-FAIL-AS-PENDING, 명세 paywall-spec §4·§6)
 *
 * 실제 uploadQueue(in-memory 파일시스템)로 큐 상태·사본·재시도 횟수를 확인한다.
 *
 * 불변식:
 *  - 재개 중 실패는 settleFailedJob(분류 → 큐 반영)으로만 처리한다.
 *  - single 작업은 사진별로 실패를 모아 작업 단위로 판정한다(용량 초과에서 중단).
 *    그룹·추가는 첫 실패에서 중단(현행).
 *  - 예외 기록은 작업이 보존됐을 때만. 버려지면 warning(rejected)·breadcrumb(quota)만.
 *  - 재개는 prepare 를 새로 받으므로, 그래도 S3 403 이면 재발급 후 실패(local)로 넘긴다.
 */

// ── expo-file-system/legacy in-memory mock (uploadQueue.test.ts 와 같은 형태) ──
const memFiles = new Map<string, string>();
const memDirs = new Set<string>();

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  getInfoAsync: jest.fn(async (uri: string) => ({ exists: memFiles.has(uri) || memDirs.has(uri) })),
  makeDirectoryAsync: jest.fn(async (uri: string) => {
    memDirs.add(uri);
  }),
  copyAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    memFiles.set(to, memFiles.get(from) ?? 'bytes');
  }),
  deleteAsync: jest.fn(async (uri: string) => {
    memFiles.delete(uri);
    for (const k of Array.from(memFiles.keys())) {
      if (k.startsWith(uri)) memFiles.delete(k);
    }
    memDirs.delete(uri);
  }),
  writeAsStringAsync: jest.fn(async (uri: string, contents: string) => {
    memFiles.set(uri, contents);
  }),
  readAsStringAsync: jest.fn(async (uri: string) => {
    const v = memFiles.get(uri);
    if (v === undefined) throw new Error('ENOENT');
    return v;
  }),
}));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { fetch: jest.fn() } }));
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));
jest.mock('../../api/upload', () => ({
  prepareUpload: jest.fn(),
  uploadToS3: jest.fn(),
  uploadImage: jest.fn(),
  calculateSHA256: jest.fn(async () => 'hash'),
  completeGroupUpload: jest.fn(),
  addImagesToGroup: jest.fn(),
}));
jest.mock('../../api/media', () => ({ updateMedia: jest.fn() }));
jest.mock('../../utils/sentry', () => ({ captureError: jest.fn(), captureMessage: jest.fn() }));
jest.mock('../../utils/retry', () => ({ withRetry: (fn: () => Promise<unknown>) => fn() }));
jest.mock('../../store/settingsStore', () => ({
  useSettingsStore: { getState: () => ({ aiMode: 'precise' }) },
  aiModeToBackend: () => 'precision',
}));
jest.mock('../../store/mediaUpdatesStore', () => ({
  useMediaUpdatesStore: { getState: () => ({ setUploadComplete: jest.fn() }) },
}));
jest.mock('../../store/authStore', () => ({ useAuthStore: { getState: () => ({}) } }));
jest.mock('../../store/uploadQueueStore', () => ({ useUploadQueueStore: { getState: () => ({}) } }));

import * as Sentry from '@sentry/react-native';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { addImagesToGroup, prepareUpload, uploadImage, uploadToS3 } from '../../api/upload';
import { captureError, captureMessage } from '../../utils/sentry';
import { S3UploadError, classifyUploadFailure } from '../../utils/uploadFailure';
import * as uploadQueue from '../uploadQueue';
import { resumeUploads } from '../resumeUploads';

const config = { headers: {} } as InternalAxiosRequestConfig;
function httpError(status: number, data?: unknown): AxiosError {
  const response: AxiosResponse = { data, status, statusText: '', headers: {}, config };
  return new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_RESPONSE, config, null, response);
}
const REJECTED = () => httpError(422);
const QUOTA = () => httpError(413, { detail: { error_code: 'STORAGE_QUOTA_EXCEEDED' } });
const TRANSIENT = () => new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
const LOCAL = () => new Error('No presigned URL received from server');
const OK = { media_id: 'm1' };

const SOURCE = {
  uri: 'file:///cache/photo.jpg',
  filename: 'photo.jpg',
  mimeType: 'image/jpeg',
  fileSize: 1024,
  width: 10,
  height: 10,
};

const uploadImageMock = uploadImage as jest.Mock;
const captureErrorMock = captureError as jest.Mock;
const captureMessageMock = captureMessage as jest.Mock;
const addBreadcrumbMock = Sentry.addBreadcrumb as jest.Mock;

async function enqueue(kind: 'single' | 'group' | 'add', count: number, groupId?: string) {
  return uploadQueue.enqueue({
    kind,
    userId: 'u1',
    items: Array.from({ length: count }, () => SOURCE),
    primaryIndex: 0,
    groupId,
  });
}

/** uploadImage 를 사진 순서대로 성공/실패시킨다 */
function uploadSequence(...outcomes: Array<unknown>) {
  for (const o of outcomes) {
    if (o === OK) uploadImageMock.mockResolvedValueOnce(OK);
    else uploadImageMock.mockRejectedValueOnce(o);
  }
}

async function jobsInManifest() {
  return uploadQueue.readManifest();
}

beforeEach(() => {
  memFiles.clear();
  memDirs.clear();
  memFiles.set(SOURCE.uri, 'bytes');
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('resumeSingle — 사진별 실패 수집(사진 여러 장)', () => {
  it('[rejected, 성공, 성공] → 3장 모두 시도, 작업 discard, warning 1회, 예외 0회', async () => {
    await enqueue('single', 3);
    uploadSequence(REJECTED(), OK, OK);

    await resumeUploads('u1');

    expect(uploadImageMock).toHaveBeenCalledTimes(3);
    expect(await jobsInManifest()).toEqual([]);
    expect(captureMessageMock).toHaveBeenCalledTimes(1);
    expect(captureMessageMock.mock.calls[0][2]).toEqual(
      expect.objectContaining({ fingerprint: ['upload-rejected'], tags: { status: '422', path: 'single', source: 'resume' } }),
    );
    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('[rejected, transient] → 2장 모두 시도, 작업 보존·횟수 불변, 사본 유지', async () => {
    const job = await enqueue('single', 2);
    uploadSequence(REJECTED(), TRANSIENT());

    await resumeUploads('u1');

    expect(uploadImageMock).toHaveBeenCalledTimes(2);
    const [kept] = await uploadQueue.listResumable('u1');
    expect(kept.jobId).toBe(job.jobId);
    expect(kept.attempts).toBe(0);
    for (const it of job.items) expect(memFiles.has(it.persistedUri)).toBe(true);
    // 보존됐으므로 warning 없음 — transient 와 미뤄 둔 rejected 를 예외로 남긴다
    expect(captureMessageMock).not.toHaveBeenCalled();
    expect(captureErrorMock).toHaveBeenCalledTimes(2);
  });

  it('[transient, 성공] → 보존·횟수 불변', async () => {
    await enqueue('single', 2);
    uploadSequence(TRANSIENT(), OK);

    await resumeUploads('u1');

    expect(uploadImageMock).toHaveBeenCalledTimes(2);
    const [kept] = await uploadQueue.listResumable('u1');
    expect(kept.attempts).toBe(0);
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
  });

  it('[local, rejected] → 보존·횟수 +1', async () => {
    await enqueue('single', 2);
    uploadSequence(LOCAL(), REJECTED());

    await resumeUploads('u1');

    expect(uploadImageMock).toHaveBeenCalledTimes(2);
    const [kept] = await uploadQueue.listResumable('u1');
    expect(kept.attempts).toBe(1);
    expect(captureMessageMock).not.toHaveBeenCalled();
    expect(captureErrorMock).toHaveBeenCalledTimes(2);
  });

  it('[성공, quota, (미시도)] → quota 에서 중단, 작업 discard, breadcrumb 만', async () => {
    await enqueue('single', 3);
    uploadSequence(OK, QUOTA());

    await resumeUploads('u1');

    expect(uploadImageMock).toHaveBeenCalledTimes(2);
    expect(await jobsInManifest()).toEqual([]);
    expect(addBreadcrumbMock).toHaveBeenCalledTimes(1);
    expect(addBreadcrumbMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ message: 'upload job discarded: quota', data: { path: 'single', source: 'resume' } }),
    );
    expect(captureMessageMock).not.toHaveBeenCalled();
    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('전부 성공 → markDone(manifest 제거 + 사본 삭제) 회귀 없음', async () => {
    const job = await enqueue('single', 2);
    uploadSequence(OK, OK);

    await resumeUploads('u1');

    expect(uploadImageMock).toHaveBeenCalledTimes(2);
    expect(await jobsInManifest()).toEqual([]);
    for (const it of job.items) expect(memFiles.has(it.persistedUri)).toBe(false);
    expect(captureErrorMock).not.toHaveBeenCalled();
    expect(captureMessageMock).not.toHaveBeenCalled();
    expect(addBreadcrumbMock).not.toHaveBeenCalled();
  });
});

describe('resumeUploads — 1장 작업·그룹·추가', () => {
  it('single 1장 413 → discard, breadcrumb 만, 예외 0회', async () => {
    await enqueue('single', 1);
    uploadSequence(QUOTA());

    await resumeUploads('u1');

    expect(await jobsInManifest()).toEqual([]);
    expect(addBreadcrumbMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('single 1장 응답 없음 → 보존·횟수 불변, 예외 1회(현행)', async () => {
    await enqueue('single', 1);
    uploadSequence(TRANSIENT());

    await resumeUploads('u1');

    expect((await uploadQueue.listResumable('u1'))[0].attempts).toBe(0);
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
  });

  it('재개(그룹)에서 새로 받은 서명으로도 S3 403 → 재발급 후 실패(local)로 넘긴다', async () => {
    const settle = jest.spyOn(uploadQueue, 'settleFailedJob');
    await enqueue('group', 1);
    (prepareUpload as jest.Mock).mockResolvedValue({
      presigned_put_url: 'https://s3/put',
      upload_id: 'up1',
      storage_key: 'k1',
    });
    (uploadToS3 as jest.Mock).mockRejectedValue(new S3UploadError(403, 'PRESIGNED_EXPIRED'));

    await resumeUploads('u1');

    const [, , failures, ctx] = settle.mock.calls[0] as [string, number, any[], unknown];
    expect(ctx).toEqual({ path: 'group', source: 'resume' });
    expect(failures[0]).toBeInstanceOf(S3UploadError);
    expect(failures[0].afterReissue).toBe(true);
    expect(failures[0].message).toBe('PRESIGNED_EXPIRED');
    expect(classifyUploadFailure(failures[0])).toBe('local');
    expect((await uploadQueue.listResumable('u1'))[0].attempts).toBe(1);
  });

  it('그룹 추가(add) 413 → discard, path=add, 예외 0회', async () => {
    await enqueue('add', 1, 'g1');
    (prepareUpload as jest.Mock).mockResolvedValue({
      presigned_put_url: 'https://s3/put',
      upload_id: 'up1',
      storage_key: 'k1',
    });
    (uploadToS3 as jest.Mock).mockResolvedValue(undefined);
    (addImagesToGroup as jest.Mock).mockRejectedValue(QUOTA());

    await resumeUploads('u1');

    expect(await jobsInManifest()).toEqual([]);
    expect(addBreadcrumbMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ data: { path: 'add', source: 'resume' } }),
    );
    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('groupId 없는 add 작업은 현행 유지(markFailed +1, settleFailedJob 미호출)', async () => {
    const settle = jest.spyOn(uploadQueue, 'settleFailedJob');
    await enqueue('add', 1);

    await resumeUploads('u1');

    expect((await uploadQueue.listResumable('u1'))[0].attempts).toBe(1);
    expect(settle).not.toHaveBeenCalled();
  });
});
