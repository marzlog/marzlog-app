/**
 * Media API Client
 */
import { apiClient } from './client';
import type { MediaDetail, MediaAnalysis } from '../types/media';

/**
 * 미디어 상세 조회
 */
export async function getMediaDetail(mediaId: string): Promise<MediaDetail> {
  const response = await apiClient.get<MediaDetail>(`/media/${mediaId}`);
  return response.data;
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

export default {
  getMediaDetail,
  getMediaAnalysis,
  deleteMedia,
};
