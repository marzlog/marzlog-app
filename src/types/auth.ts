export interface User {
  id: string;
  email: string;
  oauth_provider: 'google' | 'apple';
  oauth_sub: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface GoogleAuthRequest {
  id_token: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UserStats {
  total_photos: number;
  total_albums: number;
  total_groups: number;
  storage_used_bytes: number;
  storage_used_formatted: string;
}
