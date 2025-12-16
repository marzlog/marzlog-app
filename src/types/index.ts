/**
 * Type Definitions - Unified Export
 */

export * from './api';
export * from './navigation';

// ============================================
// Common Utility Types
// ============================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Omit properties from a type
 */
export type OmitFields<T, K extends keyof T> = Omit<T, K>;

/**
 * Extract the type from an array
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Make properties nullable
 */
export type Nullable<T> = { [K in keyof T]: T[K] | null };

/**
 * Value of object type
 */
export type ValueOf<T> = T[keyof T];

// ============================================
// Component Props Types
// ============================================

/**
 * Common component props
 */
export interface BaseComponentProps {
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Style prop type
 */
export type StyleProp<T> = T | T[] | undefined | null | false;

// ============================================
// Form Types
// ============================================

export interface FormFieldState<T> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

export interface FormState<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
}

// ============================================
// Async State Types
// ============================================

export type AsyncState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: T | null; error: Error };

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
}
