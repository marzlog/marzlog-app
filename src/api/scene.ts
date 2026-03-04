/**
 * Scene Classification API Client
 */
import { apiClient } from './client';

export interface SceneCategory {
  scene_type: string;
  count: number;
  thumbnail_url: string | null;
}

export interface SceneSummary {
  categories: SceneCategory[];
  total: number;
  unclassified: number;
}

export interface ScenePhoto {
  id: string;
  media_id: string;
  caption: string | null;
  caption_ko: string | null;
  thumbnail_url: string | null;
  taken_at: string | null;
  created_at: string | null;
  scene_scores: Record<string, number> | null;
}

export interface ScenePhotosResponse {
  scene_type: string;
  items: ScenePhoto[];
  total: number;
  has_more: boolean;
}

export async function getSceneSummary(): Promise<SceneSummary> {
  const response = await apiClient.get<SceneSummary>('/media/scenes/summary');
  return response.data;
}

export async function getScenePhotos(
  sceneType: string,
  limit = 20,
  offset = 0,
): Promise<ScenePhotosResponse> {
  const response = await apiClient.get<ScenePhotosResponse>(
    `/media/scenes/${sceneType}`,
    { params: { limit, offset } },
  );
  return response.data;
}
