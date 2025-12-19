import apiClient from './client';
import type { AuthResponse, GoogleAuthRequest, User } from '../types/auth';

export const authApi = {
  /**
   * Google OAuth 로그인
   */
  async googleLogin(idToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/google', {
      id_token: idToken,
    } as GoogleAuthRequest);
    return response.data;
  },

  /**
   * Apple OAuth 로그인
   */
  async appleLogin(idToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/apple', {
      id_token: idToken,
    });
    return response.data;
  },

  /**
   * 토큰 갱신
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * 현재 사용자 정보 조회
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  /**
   * 로그아웃
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  /**
   * 개발용 로그인 (테스트 전용)
   */
  async devLogin(email: string = 'test@marzlog.com'): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/dev-login', { email });
    return response.data;
  },
};

export default authApi;
