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
  tags?: Record<string, string>;
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

  Sentry.captureException(error, { extra: context, tags: options?.tags });
};

type MessageOptions = {
  /** Defaults to 'warning'. Use 'info' for expected conditions that should be counted but not alerted on. */
  level?: Sentry.SeverityLevel;
  fingerprint?: string[];
  tags?: Record<string, string>;
};

/**
 * Report a non-exception signal (silent failure, unexpected flow exit) as a warning.
 */
export const captureMessage = (
  message: string,
  context?: Record<string, unknown>,
  options?: MessageOptions,
): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[Warn]', message, context, options);
    return;
  }

  Sentry.captureMessage(message, {
    level: options?.level ?? 'warning',
    extra: context,
    fingerprint: options?.fingerprint,
    tags: options?.tags,
  });
};

/**
 * 흐름 추적용 breadcrumb(오류 아님 — 다음 이벤트에 함께 실린다). 식별값·영수증·토큰은 싣지 않는다.
 */
export const addBreadcrumb = (category: string, message: string, data?: Record<string, unknown>): void => {
  Sentry.addBreadcrumb({ category, message, level: 'info', data });
};
