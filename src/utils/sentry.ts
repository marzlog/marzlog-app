import * as Sentry from '@sentry/react-native';
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

export const captureError = (
  error: Error,
  context?: Record<string, unknown>
): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', error.message, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
};
