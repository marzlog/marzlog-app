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
  // 그룹 관련 필드
  group_id?: string | null;
  is_primary?: string | null;  // 'true' | 'false'
  group_count?: number | null;  // 그룹 내 이미지 수
  group_dates?: string[] | null;  // 그룹 내 모든 이미지의 taken_at 목록
}

// 타임라인 아이템 (실제 API 구조)
export interface TimelineItem {
  id: string;
  user_id: string;
  media_id: string;
  caption: string | null;
  ocr_text: string | null;    // OCR 텍스트
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

// 그룹 이미지 응답 타입
export interface GroupImageItem {
  id: string;
  storage_key: string;
  download_url: string;
  thumbnail_url: string;
  is_primary: string;
  metadata?: Record<string, any>;
  taken_at?: string | null;
  created_at?: string | null;
  caption?: string | null;
  tags?: string[];
}

export interface GroupImagesResponse {
  group_id: string;
  total: number;
  primary_image: GroupImageItem | null;
  additional_images: GroupImageItem[];
  items: GroupImageItem[];
}

export const timelineApi = {
  async getTimeline(limit = 50, offset = 0, showAll = false): Promise<TimelineResponse> {
    const response = await apiClient.get<TimelineResponse>('/timeline', {
      params: { limit, offset, show_all: showAll },
    });
    return response.data;
  },

  async getStats(): Promise<TimelineStats> {
    const response = await apiClient.get<TimelineStats>('/timeline/stats');
    return response.data;
  },

  // 그룹의 모든 이미지 조회
  async getGroupImages(groupId: string): Promise<GroupImagesResponse> {
    const response = await apiClient.get<GroupImagesResponse>(`/timeline/group/${groupId}`);
    return response.data;
  },
};

export default timelineApi;
