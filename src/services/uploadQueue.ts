/**
 * uploadQueue (B-DN 패턴1: 로컬 우선 영속 업로드 큐)
 *
 * 목표: 약한 네트워크에서도 사진 무손실.
 *  - 촬영/선택 즉시 documentDirectory에 사본 보관(persistCopy)
 *  - 업로드 진행 상황을 manifest.json에 기록
 *  - 성공 → 사본/항목 제거(markDone), 실패 → 보존(markFailed)
 *  - 포그라운드 복귀/콜드스타트 시 listResumable로 재개 (services/resumeUploads.resumeUploads)
 *
 * 백엔드 무변경: 재개 시 동일 SHA256으로 prepare가 중복/skip_upload를 반환해
 * 이미 올라간 S3 바이트를 재사용한다.
 *
 * 모든 FS는 expo-file-system/legacy 사용(SDK19 legacy 표면).
 * 변형 함수(enqueue, mark 계열, write)는 실패 시 throw → 상위(useImageUpload)에서 safe 래핑.
 * readManifest는 손상 시 [] 복원, clearAll은 실패해도 swallow(계정삭제 흐름 보호).
 *
 * native 전용: web에서는 documentDirectory가 null이라 호출하면 안 된다.
 * 호출부(useImageUpload/_layout)에서 Platform.OS === 'web' 가드로 진입 차단.
 */
import {
  copyAsync,
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { QUEUE_DIR, QUEUE_MANIFEST, MAX_RESUME_ATTEMPTS } from '../constants/upload';
import type { GroupUploadItem, PreparedUploadInfo } from '../types/upload';

export type QueueJobKind = 'single' | 'group' | 'add';
export type QueueJobState = 'pending' | 'failed' | 'done';

/** updateMedia에 전달되는 메타데이터(MediaUpdateData와 구조적으로 호환) */
export interface QueueMetadata {
  title?: string;
  content?: string;
  memo?: string;
  emotion?: string;
  intensity?: number;
}

/** manifest에 저장되는 단일 항목(영속 사본 경로 + 업로드 결과) */
export interface QueueItem {
  /** QUEUE_DIR 내 영속 사본 경로 (원본 캐시 소거돼도 재개 가능) */
  persistedUri: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  clientExif?: Record<string, unknown>;
  /** S3 업로드(또는 dup-skip) 성공 시 채워짐 → 재개 시 재업로드 생략 */
  uploaded?: GroupUploadItem;
  /**
   * F-UPLOAD-DUP B: prepare 성공 시 채워짐(single) → 재개 시 재-prepare 없이
   * 같은 storage_key로 PUT+complete (서버 (user_id, storage_key) 멱등이 흡수).
   * presigned 만료(PRESIGNED_EXPIRED) 재-prepare 시 새 값으로 교체된다.
   */
  prepared?: PreparedUploadInfo;
}

/** enqueue 입력(원본 uri 기준; 내부에서 사본 복사) */
export interface QueueSourceItem {
  uri: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  clientExif?: Record<string, unknown>;
}

export interface EnqueueInput {
  kind: QueueJobKind;
  userId: string;
  items: QueueSourceItem[];
  primaryIndex: number;
  takenAt?: string;
  metadata?: QueueMetadata;
  /** kind === 'add' 일 때 대상 그룹 */
  groupId?: string;
}

export interface QueueJob {
  jobId: string;
  kind: QueueJobKind;
  items: QueueItem[];
  primaryIndex: number;
  takenAt?: string;
  metadata?: QueueMetadata;
  groupId?: string;
  /** single: 업로드 완료(media 생성)됐으나 메타 갱신 대기일 때 보존 → 재개 시 재업로드 생략 */
  uploadedMediaId?: string;
  state: QueueJobState;
  attempts: number;
  createdAt: string;
  userId: string;
}

function genId(): string {
  // app 런타임 — Date.now/Math.random 사용 가능. 기존 id 생성 스타일과 동일.
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** QUEUE_DIR idempotent 생성 (getInfoAsync 선확인) */
async function ensureDir(): Promise<void> {
  const info = await getInfoAsync(QUEUE_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(QUEUE_DIR, { intermediates: true });
  }
}

/** 원본 localUri를 QUEUE_DIR/{uuid}.jpg 로 복사 → 새 경로 반환 */
async function persistCopy(localUri: string): Promise<string> {
  await ensureDir();
  const dest = `${QUEUE_DIR}${genId()}.jpg`;
  await copyAsync({ from: localUri, to: dest });
  return dest;
}

/** manifest 읽기. 없으면 [], 손상 시 [] 복원(throw 안 함) */
export async function readManifest(): Promise<QueueJob[]> {
  try {
    const info = await getInfoAsync(QUEUE_MANIFEST);
    if (!info.exists) return [];
    const raw = await readAsStringAsync(QUEUE_MANIFEST);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as QueueJob[];
  } catch {
    return [];
  }
}

async function writeManifest(jobs: QueueJob[]): Promise<void> {
  await ensureDir();
  await writeAsStringAsync(QUEUE_MANIFEST, JSON.stringify(jobs));
}

/** 사본 복사 + manifest append → 생성된 job 반환 */
export async function enqueue(input: EnqueueInput): Promise<QueueJob> {
  await ensureDir();

  const items: QueueItem[] = [];
  for (const src of input.items) {
    const persistedUri = await persistCopy(src.uri);
    items.push({
      persistedUri,
      filename: src.filename,
      mimeType: src.mimeType,
      fileSize: src.fileSize,
      width: src.width,
      height: src.height,
      clientExif: src.clientExif,
    });
  }

  const job: QueueJob = {
    jobId: genId(),
    kind: input.kind,
    items,
    primaryIndex: input.primaryIndex,
    takenAt: input.takenAt,
    metadata: input.metadata,
    groupId: input.groupId,
    state: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
    userId: input.userId,
  };

  const jobs = await readManifest();
  jobs.push(job);
  await writeManifest(jobs);
  return job;
}

/** manifest에서 제거 + 사본 deleteAsync(idempotent) */
export async function markDone(jobId: string): Promise<void> {
  const jobs = await readManifest();
  const job = jobs.find((j) => j.jobId === jobId);
  const remaining = jobs.filter((j) => j.jobId !== jobId);
  await writeManifest(remaining);
  if (job) {
    for (const it of job.items) {
      try {
        await deleteAsync(it.persistedUri, { idempotent: true });
      } catch {
        // 사본 삭제 실패는 무시(다음 clearAll/markDone에서 정리)
      }
    }
  }
}

/** state='failed' + attempts 갱신 */
export async function markFailed(jobId: string, attempts: number): Promise<void> {
  const jobs = await readManifest();
  const idx = jobs.findIndex((j) => j.jobId === jobId);
  if (idx < 0) return;
  jobs[idx] = { ...jobs[idx], state: 'failed', attempts };
  await writeManifest(jobs);
}

/** group/add: 해당 index 항목의 업로드 결과 영속(재개 시 재업로드 생략) */
export async function markItemUploaded(
  jobId: string,
  index: number,
  uploaded: GroupUploadItem,
): Promise<void> {
  const jobs = await readManifest();
  const job = jobs.find((j) => j.jobId === jobId);
  if (!job || !job.items[index]) return;
  job.items[index] = { ...job.items[index], uploaded };
  await writeManifest(jobs);
}

/**
 * F-UPLOAD-DUP B: 해당 index 항목의 prepare 결과 영속(markItemUploaded 동형).
 * 만료 재-prepare 시 같은 index에 새 값을 덮어써 구 storage_key를 교체한다(고아 key 방지).
 */
export async function markItemPrepared(
  jobId: string,
  index: number,
  prepared: PreparedUploadInfo,
): Promise<void> {
  const jobs = await readManifest();
  const job = jobs.find((j) => j.jobId === jobId);
  if (!job || !job.items[index]) return;
  job.items[index] = { ...job.items[index], prepared };
  await writeManifest(jobs);
}

/** single: 업로드 완료된 media_id 보존(메타 갱신 대기 상태) */
export async function markSingleUploaded(jobId: string, mediaId: string): Promise<void> {
  const jobs = await readManifest();
  const job = jobs.find((j) => j.jobId === jobId);
  if (!job) return;
  job.uploadedMediaId = mediaId;
  await writeManifest(jobs);
}

/**
 * 재개 대상: state in (pending,failed) && userId 일치 && attempts < MAX_RESUME_ATTEMPTS.
 * - userId 불일치 job은 미터치 보존(로그아웃 보존 정책).
 * - attempts 상한 초과 job은 재개에서 제외(보존 — 'dead' 상태 추가 없이 자동재시도만 중단).
 */
export async function listResumable(userId: string): Promise<QueueJob[]> {
  const jobs = await readManifest();
  return jobs.filter(
    (j) =>
      (j.state === 'pending' || j.state === 'failed') &&
      j.userId === userId &&
      j.attempts < MAX_RESUME_ATTEMPTS,
  );
}

/**
 * F-UPLOAD-DUP C: 직접 업로드(useImageUpload 3경로)가 현재 처리 중인 job 집합.
 * 재개 루프(resumeUploads)가 같은 job을 병렬 처리하는 1차-vs-재개 race를 차단한다.
 * 모듈 메모리(비영속): 직접 업로드는 프로세스 생존을 전제하므로, 프로세스 재시작 후에는
 * Set이 비어 재개가 정상 동작한다. useImageUpload/resumeUploads 양쪽이 이미 이 모듈을
 * import하므로 순환 import 없음 (여기에 두는 이유).
 */
const activeJobIds = new Set<string>();

export function markJobActive(jobId: string): void {
  activeJobIds.add(jobId);
}

export function markJobInactive(jobId: string): void {
  activeJobIds.delete(jobId);
}

export function isJobActive(jobId: string): boolean {
  return activeJobIds.has(jobId);
}

/** QUEUE_DIR 통째 삭제(계정삭제 전용). 실패해도 swallow */
export async function clearAll(): Promise<void> {
  try {
    await deleteAsync(QUEUE_DIR, { idempotent: true });
  } catch {
    // 계정삭제 흐름은 큐 정리 실패와 무관하게 진행돼야 한다
  }
}
