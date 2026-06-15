// @ts-nocheck
/**
 * uploadQueue 단위 테스트 (B-DN 패턴1)
 *
 * ⚠️ 실행 의존: B-DD(테스트 러너/Jest 설정). 현재 레포에는 jest가 구성돼 있지 않아
 * 이 파일은 작성만 해두고 실행은 생략한다. tsc는 상단 @ts-nocheck로 스킵된다.
 * B-DD 완료 후 아래 jest.mock 경로/매처를 그대로 사용해 활성화할 수 있다.
 *
 * 커버리지 의도:
 *  1) 상태전이: enqueue(pending) → markItemUploaded → markDone(manifest 제거 + 사본 삭제)
 *  2) markFailed: state='failed' + attempts 갱신
 *  3) 403 재발급 분기: uploadToS3가 'PRESIGNED_EXPIRED' throw → withRetry가 재시도 안 함
 *  4) manifest 영속/손상 복원: 깨진 JSON → readManifest()가 [] 반환
 *  5) single 2단계: uploadedMediaId 보존 시 재개가 재업로드 없이 메타만 재시도
 *  6) listResumable: userId 일치 + state in (pending,failed)만, 불일치 job 보존
 *  7) clearAll: QUEUE_DIR deleteAsync(idempotent)
 */

// ── expo-file-system/legacy in-memory mock ──────────────────────────────────
const memFiles = new Map<string, string>();
const memDirs = new Set<string>();

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  getInfoAsync: jest.fn(async (uri: string) => ({
    exists: memFiles.has(uri) || memDirs.has(uri),
  })),
  makeDirectoryAsync: jest.fn(async (uri: string) => {
    memDirs.add(uri);
  }),
  copyAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    memFiles.set(to, memFiles.get(from) ?? 'bytes');
  }),
  deleteAsync: jest.fn(async (uri: string) => {
    memFiles.delete(uri);
    // dir 삭제: prefix 매칭
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

import * as uploadQueue from '../uploadQueue';
import { QUEUE_MANIFEST, QUEUE_DIR } from '../../constants/upload';

const SOURCE = {
  uri: 'file:///cache/photo.jpg',
  filename: 'photo.jpg',
  mimeType: 'image/jpeg',
  fileSize: 1024,
  width: 100,
  height: 100,
};

beforeEach(() => {
  memFiles.clear();
  memDirs.clear();
});

describe('uploadQueue state transitions', () => {
  it('enqueue creates a pending job with a persisted copy', async () => {
    const job = await uploadQueue.enqueue({
      kind: 'single',
      userId: 'u1',
      items: [SOURCE],
      primaryIndex: 0,
      metadata: { title: 'hi' },
    });
    expect(job.state).toBe('pending');
    expect(job.attempts).toBe(0);
    expect(job.userId).toBe('u1');
    expect(job.items[0].persistedUri.startsWith(QUEUE_DIR)).toBe(true);

    const manifest = await uploadQueue.readManifest();
    expect(manifest).toHaveLength(1);
    expect(manifest[0].jobId).toBe(job.jobId);
  });

  it('markItemUploaded persists the uploaded result for resume', async () => {
    const job = await uploadQueue.enqueue({ kind: 'group', userId: 'u1', items: [SOURCE], primaryIndex: 0 });
    await uploadQueue.markItemUploaded(job.jobId, 0, { upload_id: 'up1', storage_key: 'k1', sha256: 's1' });
    const manifest = await uploadQueue.readManifest();
    expect(manifest[0].items[0].uploaded).toEqual({ upload_id: 'up1', storage_key: 'k1', sha256: 's1' });
  });

  it('markDone removes the job from manifest and deletes the copy', async () => {
    const job = await uploadQueue.enqueue({ kind: 'single', userId: 'u1', items: [SOURCE], primaryIndex: 0 });
    const copy = job.items[0].persistedUri;
    expect(memFiles.has(copy)).toBe(true);
    await uploadQueue.markDone(job.jobId);
    expect(await uploadQueue.readManifest()).toHaveLength(0);
    expect(memFiles.has(copy)).toBe(false);
  });

  it('markFailed flips state to failed and updates attempts', async () => {
    const job = await uploadQueue.enqueue({ kind: 'single', userId: 'u1', items: [SOURCE], primaryIndex: 0 });
    await uploadQueue.markFailed(job.jobId, 2);
    const manifest = await uploadQueue.readManifest();
    expect(manifest[0].state).toBe('failed');
    expect(manifest[0].attempts).toBe(2);
  });
});

describe('uploadQueue manifest resilience', () => {
  it('returns [] when manifest JSON is corrupted', async () => {
    memFiles.set(QUEUE_MANIFEST, '{ this is : not json');
    expect(await uploadQueue.readManifest()).toEqual([]);
  });

  it('returns [] when manifest does not exist', async () => {
    expect(await uploadQueue.readManifest()).toEqual([]);
  });
});

describe('uploadQueue listResumable (logout preservation)', () => {
  it('returns only pending/failed jobs for the matching userId', async () => {
    const a = await uploadQueue.enqueue({ kind: 'single', userId: 'u1', items: [SOURCE], primaryIndex: 0 });
    const b = await uploadQueue.enqueue({ kind: 'single', userId: 'u2', items: [SOURCE], primaryIndex: 0 });
    await uploadQueue.markFailed(a.jobId, 1);

    const resumableU1 = await uploadQueue.listResumable('u1');
    expect(resumableU1.map((j) => j.jobId)).toEqual([a.jobId]);

    // 불일치 userId job(b)은 미터치 보존
    const all = await uploadQueue.readManifest();
    expect(all.find((j) => j.jobId === b.jobId)?.userId).toBe('u2');
  });
});

describe('uploadQueue single 2-step resume', () => {
  it('markSingleUploaded stores media_id so resume skips re-upload', async () => {
    const job = await uploadQueue.enqueue({
      kind: 'single',
      userId: 'u1',
      items: [SOURCE],
      primaryIndex: 0,
      metadata: { title: 'x' },
    });
    await uploadQueue.markSingleUploaded(job.jobId, 'media-123');
    const manifest = await uploadQueue.readManifest();
    expect(manifest[0].uploadedMediaId).toBe('media-123');
    // 재개 로직(useImageUpload.resumeQueue)은 uploadedMediaId가 있으면
    // updateMedia만 재시도하고 markDone 한다. (해당 분기는 hook 통합 테스트에서 검증)
  });
});

describe('uploadQueue clearAll', () => {
  it('removes the whole queue directory (account deletion)', async () => {
    const job = await uploadQueue.enqueue({ kind: 'single', userId: 'u1', items: [SOURCE], primaryIndex: 0 });
    expect(memFiles.has(job.items[0].persistedUri)).toBe(true);
    await uploadQueue.clearAll();
    expect(memFiles.has(job.items[0].persistedUri)).toBe(false);
    expect(memFiles.has(QUEUE_MANIFEST)).toBe(false);
  });
});

// 403 재발급 분기는 uploadToS3('PRESIGNED_EXPIRED') + withRetry no-retry 동작에 대한 것으로,
// useImageUpload 통합 테스트(B-DD 이후)에서 검증한다. 여기서는 큐 영속 계층만 다룬다.
