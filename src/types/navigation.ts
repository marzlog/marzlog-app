/**
 * Navigation Type Definitions for Expo Router
 *
 * Expo Router uses file-based routing, so types are simpler
 */

// ============================================
// Route Parameters
// ============================================

/**
 * Photo detail screen params
 */
export type PhotoDetailParams = {
  id: string;
};

/**
 * Album detail screen params
 */
export type AlbumDetailParams = {
  id: string;
};

/**
 * Search screen params
 */
export type SearchParams = {
  query?: string;
};

// ============================================
// Route Paths (for type-safe navigation)
// ============================================

export type AppRoutes =
  | '/'
  | '/(auth)/onboarding'
  | '/(auth)/login'
  | '/(main)/timeline'
  | '/(main)/search'
  | '/(main)/albums'
  | '/(main)/profile'
  | `/photo/${string}`
  | `/album/${string}`;

// ============================================
// Navigation Helper Types
// ============================================

/**
 * Type-safe href for router.push/replace
 */
export type Href =
  | AppRoutes
  | { pathname: AppRoutes; params?: Record<string, string> };

// ============================================
// Screen Component Props
// ============================================

export interface PhotoDetailScreenProps {
  id: string;
}

export interface AlbumDetailScreenProps {
  id: string;
}

// ============================================
// Re-export Expo Router types
// ============================================
export type { Href as ExpoHref } from 'expo-router';
