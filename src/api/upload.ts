/**
 * Upload API Client
 * - Presigned URL 발급
 * - S3 직접 업로드
 * - 업로드 완료 콜백
 */
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type {
  GroupUploadCompleteRequest,
  GroupUploadCompleteResponse,
  PreparedUploadInfo,
  SelectedImage,
  UploadCompleteRequest,
  UploadCompleteResponse,
  UploadPrepareRequest,
  UploadPrepareResponse,
} from '../types/upload';
import { apiClient } from './client';
import { useSettingsStore, aiModeToBackend } from '../store/settingsStore';
import { UPLOAD_PUT_TIMEOUT_MS } from '../constants/upload';

function getCurrentAnalysisMode(): 'light' | 'precision' {
  return aiModeToBackend(useSettingsStore.getState().aiMode);
}

/** 약한 네트워크에서 uploadAsync가 hang하는 것을 차단 — 타임아웃 시 'UPLOAD_TIMEOUT' reject */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('UPLOAD_TIMEOUT')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * 파일의 SHA256 해시 계산
 */
export async function calculateSHA256(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    // Web: fetch blob and use SubtleCrypto
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Native: use expo-crypto
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      uri,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return hash;
  }
}

/**
 * Presigned URL 발급
 */
export async function prepareUpload(
  request: UploadPrepareRequest
): Promise<UploadPrepareResponse> {
  const response = await apiClient.post<UploadPrepareResponse>(
    '/media/upload/prepare',
    request
  );
  return response.data;
}

/**
 * 업로드 완료 콜백 (AI 분석 트리거)
 */
export async function completeUpload(
  request: UploadCompleteRequest
): Promise<UploadCompleteResponse> {
  const response = await apiClient.post<UploadCompleteResponse>(
    '/media/upload/complete',
    request
  );
  return response.data;
}

/**
 * S3에 파일 업로드 (Presigned PUT URL 사용)
 */
export async function uploadToS3(
  presignedUrl: string,
  fileUri: string,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (Platform.OS === 'web') {
    // Web: Use XMLHttpRequest for progress tracking
    const response = await fetch(fileUri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else if (xhr.status === 403) {
          // presigned URL 만료/서명 무효 — 상위에서 prepare 재발급 분기
          reject(new Error('PRESIGNED_EXPIRED'));
        } else {
          reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during S3 upload')));
      xhr.timeout = 120000; // 2분 타임아웃
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send(blob);
    });
  } else {
    // Native: Use legacy uploadAsync to avoid Hermes Blob limitation
    // Dynamic require to prevent web bundle from including this module
    const LegacyFS = require('expo-file-system/legacy');
    // 약한 네트워크 hang 방지: UPLOAD_PUT_TIMEOUT_MS 초과 시 'UPLOAD_TIMEOUT' reject
    // LegacyFS는 동적 require(any)라 결과 형태를 명시한다.
    const result = await withTimeout<{ status: number }>(
      LegacyFS.uploadAsync(presignedUrl, fileUri, {
        httpMethod: 'PUT',
        uploadType: LegacyFS.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': contentType,
        },
      }),
      UPLOAD_PUT_TIMEOUT_MS,
    );

    if (result.status === 403) {
      // presigned URL 만료/서명 무효 — 상위에서 prepare 재발급 분기
      throw new Error('PRESIGNED_EXPIRED');
    }

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`S3 upload failed: ${result.status}`);
    }

    onProgress?.(100);
  }
}

/**
 * 파일 크기 가져오기 (웹에서는 blob size 사용)
 */
async function getFileSize(uri: string, providedSize: number): Promise<number> {
  if (providedSize > 0) {
    return providedSize;
  }

  // 웹: fetch로 blob 크기 확인
  if (Platform.OS === 'web') {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } catch (err) {
      return 1024 * 1024; // fallback 1MB
    }
  }

  return providedSize || 1024 * 1024; // fallback 1MB
}

/**
 * F-UPLOAD-DUP B: prepare 결과 재사용 옵션.
 * - prepared: 이전 prepare의 영속 스냅샷 — 있으면 재-prepare 없이 같은 storage_key로
 *   PUT+complete (서버 (user_id, storage_key) 멱등이 재개發 중복 Media를 흡수).
 *   presigned 만료(PRESIGNED_EXPIRED)일 때만 아래 신규 prepare 경로로 폴백.
 * - onPrepared: 신규 prepare 성공 시(PUT 전) 결과 영속 콜백 — 만료 폴백의 새 값이
 *   manifest의 구 storage_key를 교체한다(고아 key 방지).
 */
export interface UploadReuseOptions {
  prepared?: PreparedUploadInfo;
  onPrepared?: (prepared: PreparedUploadInfo) => void | Promise<void>;
}

/**
 * 전체 업로드 프로세스
 * 1. SHA256 해시 계산 (중복 체크용)
 * 2. Presigned URL 발급
 * 3. S3 직접 업로드
 * 4. 완료 콜백 → AI 분석 트리거
 */
export async function uploadImage(
  image: SelectedImage,
  onProgress?: (progress: number) => void,
  onStatusChange?: (status: string) => void,
  takenAt?: string,  // 캘린더에서 선택한 날짜 (ISO 형식)
  reuse?: UploadReuseOptions,
): Promise<UploadCompleteResponse> {
  // F-UPLOAD-DUP B: 저장된 prepare 결과가 있으면 해시/prepare 생략 — 같은 storage_key로
  // PUT+complete. 만료(PRESIGNED_EXPIRED)만 신규 prepare로 계속, 그 외 에러는 그대로 throw.
  if (reuse?.prepared) {
    const p = reuse.prepared;
    try {
      onStatusChange?.('업로드 중...');
      onProgress?.(15);
      await uploadToS3(p.presigned_put_url, image.uri, image.mimeType, (s3Progress) => {
        onProgress?.(15 + Math.round(s3Progress * 0.75));
      });
      onProgress?.(90);
      onStatusChange?.('분석 요청 중...');
      const result = await completeUpload({
        upload_id: p.upload_id,
        storage_key: p.storage_key,
        analysis_mode: getCurrentAnalysisMode(),
        taken_at: takenAt,
      });
      onProgress?.(100);
      onStatusChange?.('완료!');
      return result;
    } catch (err) {
      if (!(err instanceof Error && err.message === 'PRESIGNED_EXPIRED')) {
        throw err;
      }
    }
  }

  // 0. 파일 크기 확인
  const fileSize = await getFileSize(image.uri, image.fileSize);

  // 1. SHA256 해시 계산 (0-10%)
  onStatusChange?.('해시 계산 중...');
  onProgress?.(5);

  let sha256: string;
  try {
    sha256 = await calculateSHA256(image.uri);
  } catch (err) {
    // 해시 실패 시 랜덤 값 사용 (중복 체크 안됨)
    sha256 = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  onProgress?.(10);

  // 2. Presigned URL 발급 (10-15%)
  onStatusChange?.('업로드 준비 중...');
  const prepareResponse = await prepareUpload({
    filename: image.filename,
    content_type: image.mimeType,
    size: fileSize,
    sha256,
    metadata: {
      width: image.width,
      height: image.height,
      ...(image.clientExif ? { client_exif: image.clientExif } : {}),
    },
  });
  onProgress?.(15);

  // 중복 파일 체크 - skip_upload이면 S3 건너뛰고 새 레코드 생성
  if (prepareResponse.duplicate && prepareResponse.skip_upload && prepareResponse.upload_id) {
    onStatusChange?.('분석 요청 중...');
    onProgress?.(90);

    const requestBody = {
      upload_id: prepareResponse.upload_id,
      storage_key: prepareResponse.storage_key!,
      analysis_mode: getCurrentAnalysisMode(),
      taken_at: takenAt,
    };

    const result = await completeUpload(requestBody);
    onProgress?.(100);
    onStatusChange?.('완료!');
    return { ...result, status: 'reused' };
  }

  // 3. S3 직접 업로드 (15-90%)
  onStatusChange?.('업로드 중...');
  const uploadUrl = prepareResponse.presigned_put_url || prepareResponse.upload_url;

  if (!uploadUrl) {
    throw new Error('No presigned URL received from server');
  }

  // F-UPLOAD-DUP B: PUT 전에 prepare 결과 영속 — 이후 중단돼도 재개가 같은 key 재사용
  if (reuse?.onPrepared && prepareResponse.upload_id && prepareResponse.storage_key) {
    await reuse.onPrepared({
      upload_id: prepareResponse.upload_id,
      storage_key: prepareResponse.storage_key,
      sha256,
      presigned_put_url: uploadUrl,
    });
  }

  await uploadToS3(uploadUrl, image.uri, image.mimeType, (s3Progress) => {
    onProgress?.(15 + Math.round(s3Progress * 0.75));
  });
  onProgress?.(90);

  // 4. 완료 콜백 - AI 분석 트리거 (90-100%)
  onStatusChange?.('분석 요청 중...');

  if (!prepareResponse.upload_id || !prepareResponse.storage_key) {
    throw new Error('Missing upload_id or storage_key from prepare response');
  }

  const requestBody = {
    upload_id: prepareResponse.upload_id,
    storage_key: prepareResponse.storage_key,
    analysis_mode: getCurrentAnalysisMode(),
    taken_at: takenAt,  // 캘린더에서 선택한 날짜
  };

  const result = await completeUpload(requestBody);

  onProgress?.(100);
  onStatusChange?.('완료!');

  return result;
}

/**
 * 그룹 업로드 완료 콜백
 * 여러 이미지를 하나의 그룹으로 묶어서 완료 처리
 */
export async function completeGroupUpload(
  request: GroupUploadCompleteRequest
): Promise<GroupUploadCompleteResponse> {
  const response = await apiClient.post<GroupUploadCompleteResponse>(
    '/media/upload/group-complete',
    request
  );
  return response.data;
}

/**
 * 기존 그룹에 이미지 추가
 */
export interface AddToGroupItem {
  upload_id: string;
  storage_key: string;
  sha256: string;
}

export interface AddToGroupRequest {
  items: AddToGroupItem[];
}

export interface AddToGroupResponse {
  group_id: string;
  added_images: number;
  total_images: number;
  images: { media_id: string; storage_key: string; is_primary: boolean }[];
  status: string;
  message: string;
}

export async function addImagesToGroup(
  groupId: string,
  request: AddToGroupRequest
): Promise<AddToGroupResponse> {
  const response = await apiClient.post<AddToGroupResponse>(
    `/media/${groupId}/add-images`,
    request
  );
  return response.data;
}

export default {
  prepareUpload,
  completeUpload,
  completeGroupUpload,
  uploadToS3,
  uploadImage,
  calculateSHA256,
};
