/**
 * Media API Client
 */
import { apiClient } from './client';
import type { MediaDetail, MediaAnalysis } from '../types/media';

/**
 * 미디어 상세 조회
 */
export async function getMediaDetail(mediaId: string): Promise<MediaDetail> {
  const response = await apiClient.get<any>(`/media/${mediaId}`);
  // API returns media_metadata but frontend expects metadata
  const data = response.data;
  if (data.media_metadata && !data.metadata) {
    data.metadata = data.media_metadata;
    delete data.media_metadata;
  }
  return data as MediaDetail;
}

/**
 * 미디어 분석 결과 조회 (caption, tags, OCR, scene, EXIF)
 */
export async function getMediaAnalysis(mediaId: string): Promise<MediaAnalysis> {
  const response = await apiClient.get<MediaAnalysis>(`/media/${mediaId}/analysis`);
  return response.data;
}

/**
 * 미디어 삭제
 */
export async function deleteMedia(mediaId: string): Promise<{ success: boolean }> {
  const response = await apiClient.delete(`/media/${mediaId}`);
  return response.data;
}

/**
 * 미디어 수정용 데이터 타입
 */
export interface MediaUpdateData {
  title?: string;
  content?: string;
  memo?: string;
  emotion?: string;
  intensity?: number;
}

/**
 * 미디어 정보 수정
 */
export async function updateMedia(
  mediaId: string,
  data: MediaUpdateData
): Promise<{ success: boolean; id: string; message: string }> {
  const response = await apiClient.put(`/media/${mediaId}`, data);
  return response.data;
}

export default {
  getMediaDetail,
  getMediaAnalysis,
  deleteMedia,
  updateMedia,
};
