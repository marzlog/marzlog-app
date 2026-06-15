/**
 * Upload constants (B-DN 패턴1: 영속 업로드 큐)
 * - 약한 네트워크에서 hang/소실 방지를 위한 타임아웃·재시도·백오프 상수
 * - 영속 사본/매니페스트 경로 (documentDirectory 하위 — 앱 삭제 전까지 보존)
 */
import { documentDirectory } from 'expo-file-system/legacy';

/** S3 presigned PUT 1회 시도 최대 대기 (약한 네트워크 hang 차단) */
export const UPLOAD_PUT_TIMEOUT_MS = 60_000;

/** 단일 아이템 업로드 최대 시도 횟수 (최초 1 + 재시도 1) */
export const UPLOAD_MAX_ATTEMPTS = 2;

/** 재시도 지수 백오프 기준 (attempt n → BASE * n ms) */
export const UPLOAD_BACKOFF_BASE_MS = 2_000;

/**
 * 자동 재개 최대 시도 횟수. job.attempts가 이 값 이상이면 listResumable에서 제외되어
 * 자동 재시도가 중단된다(보존만 — 영구 실패 job이 매 포그라운드마다 무한 재시도되는 것 방지).
 */
export const MAX_RESUME_ATTEMPTS = 5;

/**
 * 업로드 큐 영속 디렉터리.
 * web에서는 documentDirectory가 null이라 'nullupload_queue/'가 되지만,
 * 큐는 native(Platform.OS !== 'web')에서만 사용하므로 무해하다.
 */
export const QUEUE_DIR = `${documentDirectory}upload_queue/`;

/** 큐 매니페스트 (대기/실패 job 목록 JSON) */
export const QUEUE_MANIFEST = `${QUEUE_DIR}manifest.json`;
