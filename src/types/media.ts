/**
 * Media Types - 백엔드 API 응답과 일치
 */

export interface MediaAnalysis {
  card_id: string | null;
  caption: string | null;
  tags: string[];
  ocr_text: string | null;
  scene_type: string | null;
  scene_scores: Record<string, number> | null;
  analyzed_at: string | null;
  taken_at: string | null;
  exif: {
    camera_make: string | null;
    camera_model: string | null;
    has_gps: boolean;
    gps: { latitude: number; longitude: number } | null;
    width: number | null;
    height: number | null;
  } | null;
}

export interface MediaDetail {
  id: string;
  storage_key: string;
  sha256: string;
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
  taken_at: string | null;
  created_at: string;
  updated_at: string;
  download_url: string;
  thumbnail_url: string | null;
  analysis_status: string | null;
}
