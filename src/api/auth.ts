
import { AxiosError } from 'axios';
import apiClient from './client';
import type {
  AuthResponse,
  GoogleAuthRequest,
  User,
  UserStats,
  MessageResponse,
  VerifyResetCodeResponse,
} from '../types/auth';

// ─────────────────────────────────────────────────────────
// B-AJ Phase 3c: DELETE /auth/account typed error
// ─────────────────────────────────────────────────────────

export type AccountDeletionErrorCode =
  | 'WITHDRAWAL_CONSENT_REQUIRED'  // 412 — POST /users/me/withdrawal-consent first
  | 'ACTIVE_SUBSCRIPTION'          // 409 — cancel App/Play subscription first
  | 'USER_NOT_FOUND'               // 404 — token expired or already deleted
  | 'UNKNOWN';                     // other 4xx

export class AccountDeletionError extends Error {
  readonly code: AccountDeletionErrorCode;
  readonly statusCode: number | undefined;
  readonly details: Record<string, unknown> | undefined;
  readonly cause?: unknown;

  constructor(
    code: AccountDeletionErrorCode,
    message: string,
    statusCode?: number,
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'AccountDeletionError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.cause = cause;
  }
}

interface DeletionErrorBody {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  detail?:
    | string
    | { code?: string; message?: string; details?: Record<string, unknown> };
}

function parseDeletionError(data: unknown): {
  code: string | undefined;
  message: string | undefined;
  details: Record<string, unknown> | undefined;
} {
  if (typeof data !== 'object' || data === null) {
    return { code: undefined, message: undefined, details: undefined };
  }
  const body = data as DeletionErrorBody;
  if (typeof body.code === 'string') {
    return { code: body.code, message: body.message, details: body.details };
  }
  if (typeof body.detail === 'object' && body.detail !== null) {
    return {
      code: body.detail.code,
      message: body.detail.message,
      details: body.detail.details,
    };
  }
  if (typeof body.detail === 'string') {
    return { code: undefined, message: body.detail, details: undefined };
  }
  return { code: undefined, message: undefined, details: undefined };
}

function mapDeletionErrorCode(
  status: number,
  code: string | undefined,
): AccountDeletionErrorCode {
  if (status === 412 || code === 'WITHDRAWAL_CONSENT_REQUIRED') {
    return 'WITHDRAWAL_CONSENT_REQUIRED';
  }
  if (status === 409 || code === 'ACTIVE_SUBSCRIPTION') {
    return 'ACTIVE_SUBSCRIPTION';
  }
  if (status === 404 || code === 'USER_NOT_FOUND') {
    return 'USER_NOT_FOUND';
  }
  return 'UNKNOWN';
}

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
   * DELETE /auth/account — 계정 영구 삭제 (B-AJ).
   *
   * Backend guards (raise typed AccountDeletionError on 4xx):
   *   - 412 WITHDRAWAL_CONSENT_REQUIRED  → POST /users/me/withdrawal-consent first
   *   - 409 ACTIVE_SUBSCRIPTION          → cancel App Store / Play Store sub first
   *   - 404 USER_NOT_FOUND               → already deleted or token expired
   *
   * Signature preserved: `(): Promise<void>` — authStore.ts:214 caller unchanged.
   * Only the rejection type is enriched (AxiosError → AccountDeletionError | AxiosError).
   *
   * @throws AccountDeletionError on 4xx (caller branches on .code)
   * @throws AxiosError on network / 5xx
   */
  async deleteAccount(): Promise<void> {
    try {
      await apiClient.delete('/auth/account');
    } catch (err) {
      if (err instanceof AxiosError && err.response) {
        const status = err.response.status;
        const { code, message, details } = parseDeletionError(err.response.data);
        const mapped = mapDeletionErrorCode(status, code);
        throw new AccountDeletionError(
          mapped,
          message ?? '계정 삭제 처리 중 오류가 발생했습니다.',
          status,
          details,
          err,
        );
      }
      throw err;
    }
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
