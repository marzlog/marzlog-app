export interface User {
  id: string;
  email: string;
  name?: string;
  nickname?: string | null;
  profile_image?: string | null;
  oauth_provider?: 'google' | 'apple' | null;
  oauth_sub?: string | null;
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

export interface EmailRegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface EmailLoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface MessageResponse {
  message: string;
}

export interface VerifyResetCodeResponse {
  reset_token: string;
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
