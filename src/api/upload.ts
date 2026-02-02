/**
 * Upload API Client
 * - Presigned URL 발급
 * - S3 직접 업로드
 * - 업로드 완료 콜백
 */
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import type {
  GroupUploadCompleteRequest,
  GroupUploadCompleteResponse,
  SelectedImage,
  UploadCompleteRequest,
  UploadCompleteResponse,
  UploadPrepareRequest,
  UploadPrepareResponse,
} from '../types/upload';
import { apiClient } from './client';

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
    // Native: Use expo-file-system File class
    const file = new FileSystem.File(fileUri);
    const exists = file.exists;
    if (!exists) {
      throw new Error('File not found');
    }

    // Read file as base64 and upload
    const base64 = await file.base64();

    // Convert base64 to blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });

    // Upload using fetch
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: blob,
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.status}`);
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
      console.warn('[Upload] Failed to get file size:', err);
      return 1024 * 1024; // fallback 1MB
    }
  }

  return providedSize || 1024 * 1024; // fallback 1MB
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
  takenAt?: string  // 캘린더에서 선택한 날짜 (ISO 형식)
): Promise<UploadCompleteResponse> {
  // 0. 파일 크기 확인
  const fileSize = await getFileSize(image.uri, image.fileSize);
  console.log('[Upload] File size:', fileSize, 'bytes');

  // 1. SHA256 해시 계산 (0-10%)
  onStatusChange?.('해시 계산 중...');
  onProgress?.(5);

  let sha256: string;
  try {
    sha256 = await calculateSHA256(image.uri);
    console.log('[Upload] SHA256:', sha256.substring(0, 16) + '...');
  } catch (err) {
    // 해시 실패 시 랜덤 값 사용 (중복 체크 안됨)
    console.warn('[Upload] SHA256 calculation failed, using random hash');
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
    },
  });
  onProgress?.(15);

  // 중복 파일 체크 - skip_upload이면 S3 건너뛰고 새 레코드 생성
  if (prepareResponse.duplicate && prepareResponse.skip_upload && prepareResponse.upload_id) {
    console.log('[Upload] Duplicate reuse: skip S3, create new record with existing storage_key');
    onStatusChange?.('분석 요청 중...');
    onProgress?.(90);

    const requestBody = {
      upload_id: prepareResponse.upload_id,
      storage_key: prepareResponse.storage_key!,
      analysis_mode: 'light' as const,
      taken_at: takenAt,
    };

    console.log('=== completeUpload (duplicate reuse) ===');
    console.log('request body:', JSON.stringify(requestBody, null, 2));

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
    analysis_mode: 'light' as const,
    taken_at: takenAt,  // 캘린더에서 선택한 날짜
  };

  console.log('=== completeUpload Request ===');
  console.log('takenAt param:', takenAt);
  console.log('request body:', JSON.stringify(requestBody, null, 2));

  const result = await completeUpload(requestBody);

  onProgress?.(100);
  onStatusChange?.('완료!');

  console.log('[Upload] Complete:', result.media_id, 'Job:', result.job_id);
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
