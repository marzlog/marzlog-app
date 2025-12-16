/**
 * App Configuration Constants
 */

// ============================================
// Environment
// ============================================
export const ENV = {
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
} as const;

// ============================================
// API Configuration
// ============================================
export const API_CONFIG = {
  // Base URL from environment variable
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',

  // Timeouts (in milliseconds)
  TIMEOUT: 30000,
  UPLOAD_TIMEOUT: 120000,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================
// Auth Configuration
// ============================================
export const AUTH_CONFIG = {
  // Token storage keys
  ACCESS_TOKEN_KEY: '@marzlog/access_token',
  REFRESH_TOKEN_KEY: '@marzlog/refresh_token',
  USER_KEY: '@marzlog/user',

  // Token expiry buffer (refresh 5 minutes before expiry)
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000,

  // OAuth
  GOOGLE_WEB_CLIENT_ID: 'YOUR_GOOGLE_WEB_CLIENT_ID',
  GOOGLE_IOS_CLIENT_ID: 'YOUR_GOOGLE_IOS_CLIENT_ID',
} as const;

// ============================================
// Storage Configuration
// ============================================
export const STORAGE_CONFIG = {
  // Cache keys
  TIMELINE_CACHE_KEY: '@marzlog/timeline_cache',
  SEARCH_HISTORY_KEY: '@marzlog/search_history',
  ALBUMS_CACHE_KEY: '@marzlog/albums_cache',

  // Cache expiry (in milliseconds)
  CACHE_EXPIRY: 5 * 60 * 1000, // 5 minutes

  // Search history
  MAX_SEARCH_HISTORY: 20,
} as const;

// ============================================
// Upload Configuration
// ============================================
export const UPLOAD_CONFIG = {
  // Max file size (in bytes)
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB

  // Supported mime types
  SUPPORTED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
  ],

  SUPPORTED_VIDEO_TYPES: [
    'video/mp4',
    'video/quicktime',
    'video/x-m4v',
  ],

  // Batch upload
  MAX_BATCH_SIZE: 10,

  // Thumbnail
  THUMBNAIL_SIZE: 300,
  THUMBNAIL_QUALITY: 0.8,
} as const;

// ============================================
// UI Configuration
// ============================================
export const UI_CONFIG = {
  // Animation durations (in milliseconds)
  ANIMATION_FAST: 150,
  ANIMATION_NORMAL: 300,
  ANIMATION_SLOW: 500,

  // Debounce delays
  SEARCH_DEBOUNCE: 300,
  SCROLL_DEBOUNCE: 100,

  // Photo grid
  PHOTO_GRID_COLUMNS: 4,
  PHOTO_GRID_GAP: 2,

  // Toast
  TOAST_DURATION: 3000,

  // Pull to refresh
  REFRESH_THRESHOLD: 80,
} as const;

// ============================================
// Feature Flags
// ============================================
export const FEATURES = {
  ENABLE_APPLE_LOGIN: true,
  ENABLE_GOOGLE_LOGIN: true,
  ENABLE_VIDEO_UPLOAD: false,
  ENABLE_FACE_RECOGNITION: false,
  ENABLE_LOCATION_TAGGING: true,
  ENABLE_ANALYTICS: !__DEV__,
  ENABLE_CRASH_REPORTING: !__DEV__,
} as const;

// ============================================
// App Info
// ============================================
export const APP_INFO = {
  NAME: 'MarZlog',
  VERSION: '1.0.0',
  BUILD_NUMBER: '1',
  BUNDLE_ID: 'com.marzlog.app',
  SUPPORT_EMAIL: 'support@marzlog.com',
  PRIVACY_URL: 'https://marzlog.com/privacy',
  TERMS_URL: 'https://marzlog.com/terms',
} as const;
