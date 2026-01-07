/**
 * Upload Types - Backend 스키마와 일치
 */

export interface UploadPrepareRequest {
  filename: string;
  content_type: string;
  size: number;
  sha256: string;
  metadata?: Record<string, any>;
}

export interface UploadPrepareResponse {
  upload_url?: string;
  upload_fields?: Record<string, string>;
  upload_id?: string;
  storage_key?: string;
  expires_at?: string;
  duplicate: boolean;
  existing_media_id?: string;
  presigned_put_url?: string;
}

export interface UploadCompleteRequest {
  upload_id: string;
  storage_key: string;
  analysis_mode?: 'light' | 'precision';
  taken_at?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
}

export interface UploadCompleteResponse {
  media_id: string;
  job_id?: string;
  status: string;
  message: string;
}

export interface SelectedImage {
  uri: string;
  filename: string;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
  base64?: string;
}

export type UploadStatus = 'idle' | 'hashing' | 'preparing' | 'uploading' | 'completing' | 'done' | 'error';

export interface UploadItem {
  id: string;
  uri: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  width: number;
  height: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  mediaId?: string;
}

// ========== Group Upload Types ==========

export interface GroupUploadItem {
  upload_id: string;
  storage_key: string;
  sha256: string;
}

export interface GroupUploadCompleteRequest {
  items: GroupUploadItem[];
  primary_index?: number;
  analysis_mode?: 'light' | 'precision';
}

export interface GroupUploadCompleteResponse {
  group_id: string;
  primary_media_id: string;
  total_images: number;
  images: Array<{
    media_id: string;
    storage_key: string;
    is_primary: string;
  }>;
  analysis_job_id?: string;
  status: string;
  message: string;
}
