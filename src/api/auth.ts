
import apiClient from './client';
import type {
  AuthResponse,
  GoogleAuthRequest,
  User,
  UserStats,
  MessageResponse,
  VerifyResetCodeResponse,
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
   * Kakao OAuth 로그인
   */
  async kakaoLogin(accessToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/kakao', {
      access_token: accessToken,
    });
    return response.data;
  },

  /**
   * Apple OAuth 로그인
   */
  async appleLogin(
    identityToken: string,
    nonce: string,
    fullName?: { firstName?: string; lastName?: string },
  ): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/apple', {
      identity_token: identityToken,
      nonce,
      full_name: fullName
        ? `${fullName.firstName || ''} ${fullName.lastName || ''}`.trim() || undefined
        : undefined,
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
   * 인증코드 검증
   */
  async verifyResetCode(email: string, code: string): Promise<VerifyResetCodeResponse> {
    const response = await apiClient.post<VerifyResetCodeResponse>('/auth/verify-reset-code', {
      email,
      code,
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
   * 계정 삭제
   */
  async deleteAccount(): Promise<void> {
    await apiClient.delete('/auth/account');
  },

  /**
   * 사용자 통계 조회
   */
  async getUserStats(): Promise<UserStats> {
    const response = await apiClient.get<UserStats>('/auth/me/stats');
    return response.data;
  },

  /**
   * 프로필 수정
   */
  async updateProfile(data: { nickname?: string }): Promise<User> {
    const response = await apiClient.patch<User>('/auth/me/profile', data);
    return response.data;
  },

  /**
   * 사용자 설정 변경
   */
  async updateSettings(data: { analysis_mode?: string }): Promise<{ status: string; analysis_mode: string }> {
    const response = await apiClient.patch<{ status: string; analysis_mode: string }>('/auth/me/settings', data);
    return response.data;
  },

  /**
   * 비밀번호 변경
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<MessageResponse> {
    const response = await apiClient.patch<MessageResponse>('/auth/me/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * 아바타 업로드 (Presigned URL 방식)
   */
  async uploadAvatar(fileUri: string, mimeType: string = 'image/jpeg'): Promise<{ avatar_url: string; user: User }> {
    // 1. Presigned URL 발급
    const prepareRes = await apiClient.post<{
      presigned_put_url: string;
      upload_id: string;
      storage_key: string;
    }>('/auth/me/avatar/prepare', { content_type: mimeType });
    const { presigned_put_url, storage_key } = prepareRes.data;

    // 2. S3 PUT 업로드
    const { uploadToS3 } = require('./upload');
    await uploadToS3(presigned_put_url, fileUri, mimeType);

    // 3. 완료 콜백
    const completeRes = await apiClient.post<{ avatar_url: string; user: User }>(
      '/auth/me/avatar/complete',
      { storage_key },
    );
    return completeRes.data;
  },

  /**
   * 아바타 삭제
   */
  async deleteAvatar(): Promise<{ message: string; user: User }> {
    const response = await apiClient.delete('/auth/me/avatar');
    return response.data;
  },
};

export default authApi;
