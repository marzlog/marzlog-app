/**
 * resumeUploads (B-DN 패턴1: 영속 업로드 큐 재개 — 화면 state 분리)
 *
 * useImageUpload 훅(화면 state: items/updateItem/setIsUploading)에 의존하지 않는 순수 함수.
 * uploadQueue + api/upload 코어 + api/media 만 사용한다. _layout이 훅 전체를 인스턴스화하던
 * 경계 위반을 제거하기 위해 분리되었다.
 *
 * 백엔드 멱등화 전제: complete_upload / group-complete / add-images 는 (user_id, storage_key)
 * 기준으로 멱등(중복 재호출 시 기존 Media 반환, Redis 만료도 fallback). 따라서 재개가
 * complete를 재호출해도 서버가 중복 Media 생성을 막는다 — 프론트의 과방어는 불필요하다.
 *
 * 각 job은 try/catch로 격리되며, 실패는 markFailed(attempts+1)로 보존(크래시 금지).
 * PRESIGNED_EXPIRED는 재시도가 아니라 prepare 재발급 대상 — 즉시 throw되어 해당 job만
 * markFailed되고 다음 재개 사이클이 새 presigned로 흡수한다.
 */
import { Platform } from 'react-native';
import {
  prepareUpload,
  uploadToS3,
  uploadImage,
  calculateSHA256,
  completeGroupUpload,
  addImagesToGroup,
} from '../api/upload';
import { updateMedia } from '../api/media';
import type { SelectedImage, GroupUploadItem } from '../types/upload';
import { captureError } from './../utils/sentry';
import { withRetry } from '../utils/retry';
import { UPLOAD_MAX_ATTEMPTS, UPLOAD_BACKOFF_BASE_MS } from '../constants/upload';
import { useSettingsStore, aiModeToBackend } from '../store/settingsStore';
import * as uploadQueue from './uploadQueue';

const QUEUE_DISABLED = Platform.OS === 'web';

/** 큐 변형 호출 래퍼 — 큐 실패가 재개 흐름을 깨뜨리지 않도록 swallow + 보고 */
async function safeQueue(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { context: 'resumeUploads.queue' });
  }
}

/** SHA256 계산 실패 시 fallback (중복 체크 무력화 — 서버 멱등이 최종 방어) */
function randomHex(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 그룹/추가용 단일 아이템 업로드(영속 사본 기준): prepare → (중복이면 skip) → uploadToS3(withRetry).
 * 반환은 group-complete/add-images에 넣을 GroupUploadItem.
 */
async function uploadOneItem(qi: uploadQueue.QueueItem): Promise<GroupUploadItem> {
  let sha256: string;
  try {
    sha256 = await calculateSHA256(qi.persistedUri);
  } catch {
    sha256 = randomHex();
  }

  const prepareResponse = await prepareUpload({
    filename: qi.filename,
    content_type: qi.mimeType,
    size: qi.fileSize || 1024 * 1024,
    sha256,
    metadata: {
      width: qi.width,
      height: qi.height,
      ...(qi.clientExif ? { client_exif: qi.clientExif } : {}),
    },
  });

  // 중복(skip_upload): S3 업로드 없이 그룹에 포함
  if (prepareResponse.duplicate && prepareResponse.skip_upload) {
    if (prepareResponse.upload_id && prepareResponse.storage_key) {
      return {
        upload_id: prepareResponse.upload_id,
        storage_key: prepareResponse.storage_key,
        sha256,
      };
    }
    throw new Error('Duplicate prepare missing upload_id/storage_key');
  }

  const uploadUrl = prepareResponse.presigned_put_url || prepareResponse.upload_url;
  if (!uploadUrl) {
    throw new Error('No presigned URL received');
  }

  await withRetry(
    () => uploadToS3(uploadUrl, qi.persistedUri, qi.mimeType),
    UPLOAD_MAX_ATTEMPTS,
    UPLOAD_BACKOFF_BASE_MS,
  );

  if (!prepareResponse.upload_id || !prepareResponse.storage_key) {
    throw new Error('Missing upload_id/storage_key');
  }
  return {
    upload_id: prepareResponse.upload_id,
    storage_key: prepareResponse.storage_key,
    sha256,
  };
}

/** group/add 공통: index별 uploaded 재사용 + 신규 업로드 → markItemUploaded */
async function collectGroupItems(job: uploadQueue.QueueJob): Promise<GroupUploadItem[]> {
  const uploadedItems: GroupUploadItem[] = [];
  for (let i = 0; i < job.items.length; i++) {
    const qi = job.items[i];
    if (qi.uploaded) {
      uploadedItems.push(qi.uploaded);
      continue;
    }
    const uploaded = await uploadOneItem(qi);
    uploadedItems.push(uploaded);
    await safeQueue(() => uploadQueue.markItemUploaded(job.jobId, i, uploaded));
  }
  return uploadedItems;
}

async function resumeGroup(job: uploadQueue.QueueJob): Promise<void> {
  const uploadedItems = await collectGroupItems(job);
  if (uploadedItems.length === 0) {
    await safeQueue(() => uploadQueue.markDone(job.jobId));
    return;
  }
  const primaryIndex = Math.min(job.primaryIndex, uploadedItems.length - 1);
  await completeGroupUpload({
    items: uploadedItems,
    primary_index: primaryIndex,
    analysis_mode: aiModeToBackend(useSettingsStore.getState().aiMode),
    taken_at: job.takenAt,
    ...job.metadata,
  });
  await safeQueue(() => uploadQueue.markDone(job.jobId));
}

async function resumeAdd(job: uploadQueue.QueueJob): Promise<void> {
  if (!job.groupId) {
    // groupId 없는 add job은 재개 불가 — 보존
    await safeQueue(() => uploadQueue.markFailed(job.jobId, job.attempts + 1));
    return;
  }
  const uploadedItems = await collectGroupItems(job);
  if (uploadedItems.length > 0) {
    await addImagesToGroup(job.groupId, { items: uploadedItems });
  }
  await safeQueue(() => uploadQueue.markDone(job.jobId));
}

async function resumeSingle(job: uploadQueue.QueueJob): Promise<void> {
  const meta = job.metadata;

  // 업로드는 이미 완료 — 메타만 재시도(중복 업로드 방지). 서버 멱등이 최종 방어.
  if (job.uploadedMediaId) {
    const mediaId = job.uploadedMediaId;
    if (meta) {
      await withRetry(() => updateMedia(mediaId, meta), UPLOAD_MAX_ATTEMPTS, UPLOAD_BACKOFF_BASE_MS);
    }
    await safeQueue(() => uploadQueue.markDone(job.jobId));
    return;
  }

  // 신규: 코어 uploadImage 재실행(서버 멱등이 중복 Media를 막음)
  let firstMediaId: string | undefined;
  for (const qi of job.items) {
    const selectedImage: SelectedImage = {
      uri: qi.persistedUri,
      filename: qi.filename,
      fileSize: qi.fileSize,
      width: qi.width,
      height: qi.height,
      mimeType: qi.mimeType,
      clientExif: qi.clientExif,
    };
    const result = await uploadImage(selectedImage, undefined, undefined, job.takenAt);
    if (!firstMediaId && result.media_id) firstMediaId = result.media_id;
  }

  // 업로드 완료된 media_id 보존 → updateMedia 실패해도 다음 재개는 메타만 재시도
  if (firstMediaId) {
    const mediaId = firstMediaId;
    await safeQueue(() => uploadQueue.markSingleUploaded(job.jobId, mediaId));
    if (meta) {
      await withRetry(() => updateMedia(mediaId, meta), UPLOAD_MAX_ATTEMPTS, UPLOAD_BACKOFF_BASE_MS);
    }
  }
  await safeQueue(() => uploadQueue.markDone(job.jobId));
}

/**
 * 영속 큐 재개. listResumable(userId) 순회하며 kind별 재실행.
 * userId 불일치/attempts 초과 job은 listResumable에서 제외되어 미터치 보존.
 * 개별 job 실패는 markFailed로 보존(다음 재개/로그인 때 재시도) — 전체 크래시 금지.
 */
export async function resumeUploads(userId: string): Promise<void> {
  if (QUEUE_DISABLED) return;

  let jobs: uploadQueue.QueueJob[];
  try {
    jobs = await uploadQueue.listResumable(userId);
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { context: 'resumeUploads.list' });
    return;
  }

  for (const job of jobs) {
    try {
      if (job.kind === 'group') {
        await resumeGroup(job);
      } else if (job.kind === 'add') {
        await resumeAdd(job);
      } else {
        await resumeSingle(job);
      }
    } catch (e) {
      // 재개 중 401(refresh 만료)/PRESIGNED_EXPIRED 등 — markFailed로 보존, 크래시 금지
      captureError(e instanceof Error ? e : new Error(String(e)), {
        context: 'resumeUploads.job',
        jobId: job.jobId,
      });
      await safeQueue(() => uploadQueue.markFailed(job.jobId, job.attempts + 1));
    }
  }
}
