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

/**
 * AI 분석 결과(caption, tags) 수정
 */
export interface UpdateAnalysisData {
  caption?: string;
  tags?: string[];
}

export async function updateMediaAnalysis(
  mediaId: string,
  data: UpdateAnalysisData
): Promise<{ success: boolean; media_id: string; caption: string; tags: string[] }> {
  const response = await apiClient.put(`/media/${mediaId}/analysis`, data);
  return response.data;
}

/**
 * 대표 이미지 변경
 */
export async function setPrimaryImage(
  groupId: string,
  mediaId: string
): Promise<{ success: boolean; message: string; primary_media_id: string }> {
  const response = await apiClient.put(`/media/${groupId}/primary/${mediaId}`);
  return response.data;
}

/**
 * AI 일기 생성/재생성 요청
 */
export async function generateDiary(
  mediaId: string
): Promise<{ success: boolean; job_id: string | null; message: string }> {
  const response = await apiClient.post(`/media/${mediaId}/generate-diary`);
  return response.data;
}

/**
 * 개별 캡션 수정 (한글 캡션)
 */
export async function updateCaption(
  mediaId: string,
  captionKo: string
): Promise<{ success: boolean; caption: string; caption_ko: string }> {
  const response = await apiClient.put(`/media/${mediaId}/analysis`, { caption_ko: captionKo });
  return response.data;
}

/**
 * 일기 수정 (제목/내용/분위기)
 */
export async function updateDiary(
  mediaId: string,
  diary: {
    title?: string;
    content?: string;
    mood?: string;
  }
): Promise<{
  success: boolean;
  title: string;
  content: string;
  mood: string;
}> {
  const response = await apiClient.patch(`/media/${mediaId}/diary`, diary);
  return response.data;
}

/**
 * 감정/강도 수정 (각 이미지별)
 */
export async function updateMediaEmotion(
  mediaId: string,
  data: { emotion?: string; intensity?: number }
): Promise<{ success: boolean; emotion: string; intensity: number }> {
  const response = await apiClient.patch(`/media/${mediaId}/emotion`, data);
  return response.data;
}

export default {
  getMediaDetail,
  getMediaAnalysis,
  deleteMedia,
  updateMedia,
  updateMediaAnalysis,
  setPrimaryImage,
  generateDiary,
  updateCaption,
  updateDiary,
  updateMediaEmotion,
};
