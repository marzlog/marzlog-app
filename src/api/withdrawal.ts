// src/api/withdrawal.ts
/**
 * B-AJ Phase 3b: Withdrawal consent recording API client.
 *
 * Mirrors src/api/consent.ts shape (default import, bundled object, default export).
 * Adds a typed error class (intentional divergence from consent.ts) because
 * withdraw.tsx Phase 3d branches on 412/409/400 codes for distinct UI flows.
 *
 * POST /users/me/withdrawal-consent sets user.withdrawal_consent_version,
 * which gates DELETE /auth/account (412 if NULL).
 */
import { AxiosError } from 'axios';
import apiClient from './client';

/**
 * Current withdrawal-terms.html version.
 * MUST match backend settings.CURRENT_WITHDRAWAL_TERMS_VERSION.
 * Bump in lockstep with backend config + EC2 nginx terms file.
 */
export const CURRENT_WITHDRAWAL_TERMS_VERSION = '2026-05-19';

export interface WithdrawalConsentRequest {
  withdrawal_terms_version: string;
  confirm_data_loss: boolean;
  confirm_irreversible: boolean;
}

export type WithdrawalConsentErrorCode =
  | 'TERMS_VERSION_MISMATCH'
  | 'CONFIRM_DATA_LOSS_REQUIRED'
  | 'CONFIRM_IRREVERSIBLE_REQUIRED'
  | 'USER_NOT_FOUND'
  | 'UNKNOWN';

export class WithdrawalConsentError extends Error {
  readonly code: WithdrawalConsentErrorCode;
  readonly statusCode: number | undefined;
  readonly cause?: unknown;

  constructor(
    code: WithdrawalConsentErrorCode,
    message: string,
    statusCode?: number,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'WithdrawalConsentError';
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

interface BackendErrorBody {
  code?: string;
  message?: string;
  detail?: { code?: string; message?: string } | string;
}

function extractErrorCode(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const body = data as BackendErrorBody;
  if (typeof body.code === 'string') return body.code;
  if (typeof body.detail === 'object' && body.detail !== null) {
    return body.detail.code;
  }
  return undefined;
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (typeof data !== 'object' || data === null) return fallback;
  const body = data as BackendErrorBody;
  if (typeof body.message === 'string') return body.message;
  if (typeof body.detail === 'string') return body.detail;
  if (typeof body.detail === 'object' && body.detail !== null) {
    return body.detail.message ?? fallback;
  }
  return fallback;
}

/**
 * POST /users/me/withdrawal-consent
 *
 * @throws WithdrawalConsentError on 4xx (typed code for caller branching)
 * @throws AxiosError on network / 5xx (caller decides retry / generic toast)
 */
export async function postWithdrawalConsent(
  payload: WithdrawalConsentRequest,
): Promise<void> {
  try {
    await apiClient.post('/users/me/withdrawal-consent', payload);
  } catch (err) {
    if (err instanceof AxiosError && err.response) {
      const status = err.response.status;
      const code = extractErrorCode(err.response.data);
      const message = extractErrorMessage(
        err.response.data,
        '탈퇴 약관 동의 처리 중 오류가 발생했습니다.',
      );

      if (status === 404 || code === 'USER_NOT_FOUND') {
        throw new WithdrawalConsentError('USER_NOT_FOUND', message, status, err);
      }
      if (status === 400) {
        let mapped: WithdrawalConsentErrorCode = 'UNKNOWN';
        if (code === 'TERMS_VERSION_MISMATCH') {
          mapped = 'TERMS_VERSION_MISMATCH';
        } else if (code === 'CONFIRM_DATA_LOSS_REQUIRED') {
          mapped = 'CONFIRM_DATA_LOSS_REQUIRED';
        } else if (code === 'CONFIRM_IRREVERSIBLE_REQUIRED') {
          mapped = 'CONFIRM_IRREVERSIBLE_REQUIRED';
        }
        throw new WithdrawalConsentError(mapped, message, status, err);
      }
    }
    throw err;
  }
}

// Bundled export (mirrors consent.ts: `export const consentApi = { ... }; export default consentApi;`)
export const withdrawalApi = { postWithdrawalConsent };
export default withdrawalApi;
