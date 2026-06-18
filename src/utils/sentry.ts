import * as Sentry from '@sentry/react-native';
import { isAxiosError } from 'axios';
import Constants from 'expo-constants';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export const initSentry = (): void => {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: (Constants.expoConfig?.extra?.environment as string) ?? 'production',
    enabled: process.env.NODE_ENV === 'production',
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
  });
};

type CaptureOptions = {
  /** Skip Sentry reporting for axios 4xx (handled client errors). 5xx still reported. */
  skipClientErrors?: boolean;
};

export const captureError = (
  error: Error,
  context?: Record<string, unknown>,
  options?: CaptureOptions,
): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', error.message, context);
    return;
  }

  if (options?.skipClientErrors && isAxiosError(error)) {
    const status = error.response?.status;
    if (status !== undefined && status >= 400 && status < 500) {
      return;
    }
  }

  Sentry.captureException(error, { extra: context });
};

// [B-DK] 진단용 info 레벨 메시지. captureError와 동일하게 wrapper 경유(옵션 A) — 화면에서 raw Sentry import 회피.
export const captureMessage = (message: string): void => {
  Sentry.captureMessage(message, 'info');
};
