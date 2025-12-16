/**
 * API Response Types
 */

// ============================================
// Generic API Response
// ============================================
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================
// Auth Types
// ============================================
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface AppleLoginRequest {
  idToken: string;
  authorizationCode: string;
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ============================================
// User Types
// ============================================
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'user' | 'admin';
  oauthProvider: 'google' | 'apple';
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Media Types
// ============================================
export interface Media {
  id: string;
  userId: string;
  storageKey: string;
  thumbnailUrl?: string;
  fullUrl?: string;
  sha256: string;
  metadata: MediaMetadata;
  takenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
  exif?: ExifData;
}

export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: string;
  gps?: {
    latitude?: number;
    longitude?: number;
  };
  [key: string]: unknown;
}

// ============================================
// RecallCard Types
// ============================================
export interface RecallCard {
  id: string;
  userId: string;
  mediaId?: string;
  media?: Media;
  caption?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Album Types
// ============================================
export interface Album {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coverMediaId?: string;
  coverMedia?: Media;
  mediaCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumWithMedia extends Album {
  media: Media[];
}

// ============================================
// Timeline Types
// ============================================
export interface TimelineGroup {
  date: string; // ISO date (YYYY-MM-DD)
  items: RecallCard[];
}

export interface TimelineResponse {
  groups: TimelineGroup[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

// ============================================
// Search Types
// ============================================
export interface SearchRequest {
  query: string;
  mode?: 'vector' | 'text' | 'hybrid';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  mediaId?: string;
  media?: Media;
  caption?: string;
  tags: string[];
  score: number;
  searchType?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  searchMode: string;
}

export interface SearchSuggestions {
  query: string;
  tags: string[];
  words: string[];
  total: number;
}

// ============================================
// Upload Types
// ============================================
export interface UploadPrepareRequest {
  filename: string;
  contentType: string;
  sha256: string;
}

export interface UploadPrepareResponse {
  uploadUrl: string;
  mediaId: string;
  fields?: Record<string, string>;
}

export interface UploadCompleteRequest {
  mediaId: string;
  metadata?: Partial<MediaMetadata>;
}

export interface UploadCompleteResponse {
  media: Media;
  jobId: string;
}

// ============================================
// Job Types
// ============================================
export interface Job {
  id: string;
  mediaId: string;
  mode: 'light' | 'precision';
  status: 'queued' | 'running' | 'done' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
