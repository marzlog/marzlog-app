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
 * 각 job은 try/catch로 격리되며, 실패는 분류 후 큐에 반영한다(크래시 금지 — settleFailedJob):
 * 일시 실패는 attempts 유지, 로컬 원인은 attempts+1, 서버 거절(quota·rejected)은 큐에서 버림.
 * PRESIGNED_EXPIRED는 재시도가 아니라 prepare 재발급 대상 — 즉시 throw되어 해당 job만
 * 보존되고 다음 재개 사이클이 새 presigned로 흡수한다. 재개가 새로 받은 서명마저 403 이면 local.
 */
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
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
import {
  classifyUploadFailure,
  defersUntilSettled,
  markAfterReissue,
  reportsAsException,
  type JobFailureAction,
} from '../utils/uploadFailure';
import { UPLOAD_MAX_ATTEMPTS, UPLOAD_BACKOFF_BASE_MS } from '../constants/upload';
import { useSettingsStore, aiModeToBackend } from '../store/settingsStore';
import { useMediaUpdatesStore } from '../store/mediaUpdatesStore';
import { useAuthStore } from '../store/authStore';
import { useUploadQueueStore } from '../store/uploadQueueStore';
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

/**
 * single 재개의 사진별 실패 묶음 — 작업 catch 가 failures 전체를 settleFailedJob 에 넘긴다
 * (사진 여러 장인 single 작업에서 한 장의 거절이 미처리 사진까지 버리지 않게).
 */
class ResumeItemsError extends Error {
  readonly failures: unknown[];

  constructor(failures: unknown[]) {
    super(`resume single: ${failures.length} item(s) failed`);
    this.name = 'ResumeItemsError';
    this.failures = failures;
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

  try {
    await withRetry(
      () => uploadToS3(uploadUrl, qi.persistedUri, qi.mimeType),
      UPLOAD_MAX_ATTEMPTS,
      UPLOAD_BACKOFF_BASE_MS,
    );
  } catch (err) {
    // 재개는 매번 prepare 를 새로 받는다(서명 재발급) — 그래도 403 이면 만료가 아니다(local)
    throw markAfterReissue(err);
  }

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
  useMediaUpdatesStore.getState().setUploadComplete();
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
    useMediaUpdatesStore.getState().setUploadComplete();
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
    useMediaUpdatesStore.getState().setUploadComplete();
    await safeQueue(() => uploadQueue.markDone(job.jobId));
    return;
  }

  // 신규: 코어 uploadImage 재실행.
  // F-UPLOAD-DUP B: 1차 시도가 영속한 prepare 결과(qi.prepared)가 있으면 재-prepare 없이
  // 같은 storage_key로 PUT+complete → 서버 (user_id, storage_key) 멱등이 중복 Media를 흡수.
  // (구 코드는 매 재개마다 재-prepare해 새 storage_key를 받아 멱등이 무력화됐다.)
  // presigned 만료 폴백의 새 prepare 결과는 onPrepared로 구 key를 교체한다.
  // 사진별로 실패를 모아 작업 단위로 판정한다(직접 경로 startUpload 와 같음). 용량 초과에서는 중단.
  let firstMediaId: string | undefined;
  const failures: unknown[] = [];
  for (let i = 0; i < job.items.length; i++) {
    const qi = job.items[i];
    const selectedImage: SelectedImage = {
      uri: qi.persistedUri,
      filename: qi.filename,
      fileSize: qi.fileSize,
      width: qi.width,
      height: qi.height,
      mimeType: qi.mimeType,
      clientExif: qi.clientExif,
    };
    const itemIndex = i;
    try {
      const result = await uploadImage(selectedImage, undefined, undefined, job.takenAt, {
        prepared: qi.prepared,
        onPrepared: (p) =>
          safeQueue(() => uploadQueue.markItemPrepared(job.jobId, itemIndex, p)),
      });
      if (!firstMediaId && result.media_id) firstMediaId = result.media_id;
    } catch (err) {
      failures.push(err);
      if (classifyUploadFailure(err) === 'quota') break;
    }
  }
  if (failures.length > 0) throw new ResumeItemsError(failures);

  // 업로드 완료된 media_id 보존 → updateMedia 실패해도 다음 재개는 메타만 재시도
  if (firstMediaId) {
    const mediaId = firstMediaId;
    await safeQueue(() => uploadQueue.markSingleUploaded(job.jobId, mediaId));
    if (meta) {
      await withRetry(() => updateMedia(mediaId, meta), UPLOAD_MAX_ATTEMPTS, UPLOAD_BACKOFF_BASE_MS);
    }
    useMediaUpdatesStore.getState().setUploadComplete();
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
    // F-UPLOAD-DUP C: 직접 업로드(useImageUpload)가 지금 처리 중인 job은 건너뜀 —
    // 1차 업로드와 재개가 같은 job을 병렬 처리해 중복 Media를 만드는 race 차단
    if (uploadQueue.isJobActive(job.jobId)) continue;
    try {
      if (job.kind === 'group') {
        await resumeGroup(job);
      } else if (job.kind === 'add') {
        await resumeAdd(job);
      } else {
        await resumeSingle(job);
      }
    } catch (e) {
      // transient·auth: attempts 유지 / local: attempts+1(MAX_RESUME_ATTEMPTS 도달 시 자동재시도 중단·보존)
      // 백그라운드 재개의 413 은 안내 시트를 띄우지 않고 큐 정리만 한다(명세 §3.4).
      const failures = e instanceof ResumeItemsError ? e.failures : [e];
      const outcome: { action?: JobFailureAction } = {};
      await safeQueue(async () => {
        outcome.action = await uploadQueue.settleFailedJob(job.jobId, job.attempts, failures, {
          path: job.kind,
          source: 'resume',
        });
      });
      // 예외 기록은 작업이 보존됐을 때만(직접 경로와 같은 규칙) — 버려지면 settleFailedJob 의 warning·breadcrumb 만
      if (outcome.action?.type !== 'discard') {
        for (const f of failures) {
          if (reportsAsException(f, true) || defersUntilSettled(f, true)) {
            captureError(f instanceof Error ? f : new Error(String(f)), {
              context: 'resumeUploads.job',
              jobId: job.jobId,
            });
          }
        }
      }
    }
  }
}

// F-UPLOAD-RESUME-UX: _layout 로컬 함수였던 재개 트리거를 모듈 공개로 이동 —
// 홈 배너 수동 재시도와 트리거 4곳(콜드스타트/AppState/NetInfo/주기 tick)이 공유.
// 외부 상태는 전부 getState()/모듈 변수로 읽으므로 stale closure 무해.
let resumeInFlight = false;

export async function triggerResume(): Promise<void> {
  if (QUEUE_DISABLED) return;
  // F-UPLOAD-DUP A: TOCTOU 차단 — 진입 체크와 세팅 사이 await 0줄(동기 연속).
  // 구 구현은 세팅이 refreshPendingCount/NetInfo.fetch 두 await 뒤라, 근접 동시
  // 트리거(포그라운드 복귀 시 AppState+NetInfo 등)가 모두 가드를 통과했다.
  if (resumeInFlight) return;
  resumeInFlight = true;
  try {
    const { isAuthenticated: loggedIn, user } = useAuthStore.getState();
    const uid = user?.id;
    if (!loggedIn || !uid) return;
    // 배너/주기 tick 게이팅용 카운트 동기화 — 오프라인 early-return보다 먼저
    // (콜드스타트가 오프라인이어도 대기 건수는 배너에 노출돼야 함)
    await useUploadQueueStore.getState().refreshPendingCount(uid);
    // B-DN 대응1: 오프라인이면 재개 시도 안 함(헛된 attempts 소모/실패 방지)
    try {
      const net = await NetInfo.fetch();
      const online =
        net.isConnected === true &&
        (net.isInternetReachable === true || net.isInternetReachable === null);
      if (!online) return;
    } catch {
      // NetInfo.fetch 실패 시 보수적으로 진행(막아서 영영 재개 안 되는 것보다 시도가 나음)
    }
    try {
      await resumeUploads(uid);
    } catch {
      // resumeUploads 내부에서 job별 보존 처리됨 — 여기서는 크래시만 방지
    } finally {
      await useUploadQueueStore.getState().refreshPendingCount(uid);
    }
  } finally {
    // 미로그인/오프라인 조기 return 포함 모든 경로에서 해제(영구 잠김 방지)
    resumeInFlight = false;
  }
}
