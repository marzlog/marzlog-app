/**
 * Card Types — 타임라인 카드 API 응답/요청 타입
 */

// TimelineListItem — /timeline/day 응답의 items 배열 원소
export interface TimelineListItem {
  id: string;
  media_id: string | null;
  title: string;
  taken_at: string | null;
  activity_category: string | null;
  thumbnail_url: string | null;
  tags: string[];
}

// TimelineDayResponse — /timeline/day 전체 응답
export interface TimelineDayResponse {
  date: string;
  items: TimelineListItem[];
  total: number;
}

// CardMediaInfo — 카드 상세의 media 필드
export interface CardMediaInfo {
  taken_at: string | null;
  latitude: number | null;
  longitude: number | null;
  device: string | null;
  image_url: string | null;
}

// CardDetail — /cards/{id} 응답
export interface CardDetail {
  id: string;
  media_id: string | null;
  title: string | null;
  caption: string | null;
  story: string | null;
  tags: string[];
  activity_category: string | null;
  location_name: string | null;
  weather: string | null;
  media: CardMediaInfo | null;
  created_at: string;
  updated_at: string;
}

// AdjacentCards — /cards/{id}/adjacent 응답
export interface AdjacentCards {
  prev_id: string | null;
  prev_taken_at: string | null;
  next_id: string | null;
  next_taken_at: string | null;
}

// CardUpdatePayload — PATCH /cards/{id} 요청
export interface CardUpdatePayload {
  story?: string;
  location_name?: string;
  weather?: string;
  tags?: string[];
}
