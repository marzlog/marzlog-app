import apiClient from './client';

// Media 정보 (중첩 객체)
export interface MediaInfo {
  id: string;
  user_id: string;
  storage_key: string;
  sha256: string;
  download_url: string;
  thumbnail_url: string;
  metadata: {
    exif?: {
      gps?: { latitude: number; longitude: number } | null;
      width: number;
      height: number;
      taken_at?: string | null;
      camera_make?: string | null;
      camera_model?: string | null;
    };
    size: number;
    content_type: string;
    original_filename: string;
  };
  taken_at: string;
  created_at: string;
}

// 타임라인 아이템 (실제 API 구조)
export interface TimelineItem {
  id: string;
  user_id: string;
  media_id: string;
  caption: string | null;
  embedding: number[] | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  media: MediaInfo;           // ← media 객체!
  additional_images: null;
}

// 타임라인 응답
export interface TimelineResponse {
  total: number;
  items: TimelineItem[];
  // has_more 없음!
}

export interface TimelineStats {
  total_photos: number;
  total_albums: number;
  storage_used: string;
}

export const timelineApi = {
  async getTimeline(limit = 50, offset = 0): Promise<TimelineResponse> {
    const response = await apiClient.get<TimelineResponse>('/timeline', {
      params: { limit, offset },
    });
    return response.data;
  },

  async getStats(): Promise<TimelineStats> {
    const response = await apiClient.get<TimelineStats>('/timeline/stats');
    return response.data;
  },
};

export default timelineApi;
