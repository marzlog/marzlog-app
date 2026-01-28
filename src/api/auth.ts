import apiClient from './client';
import type {
  AuthResponse,
  GoogleAuthRequest,
  User,
  UserStats,
  MessageResponse,
} from '../types/auth';

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
   * 이메일 회원가입
   */
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  },

  /**
   * 이메일 로그인
   */
  async emailLogin(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/email-login', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * 비밀번호 찾기 (리셋 토큰 요청)
   */
  async forgotPassword(email: string): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>('/auth/forgot-password', {
      email,
    });
    return response.data;
  },

  /**
   * 비밀번호 재설정
   */
  async resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * 이메일 중복 확인
   */
  async checkEmail(email: string): Promise<{ available: boolean }> {
    const response = await apiClient.get<{ available: boolean }>('/auth/check-email', {
      params: { email },
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

  /**
   * 사용자 통계 조회
   */
  async getUserStats(): Promise<UserStats> {
    const response = await apiClient.get<UserStats>('/auth/me/stats');
    return response.data;
  },
};

export default authApi;
