jest.mock('@sentry/react-native', () => ({ init: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn() }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));

import * as Sentry from '@sentry/react-native';
import { captureMessage } from '../sentry';

const sentryCaptureMessage = Sentry.captureMessage as jest.Mock;
// NODE_ENV 는 타입상 readonly — 테스트에서만 production 경로로 전환한다
const env = process.env as Record<string, string | undefined>;
const ORIGINAL_NODE_ENV = env.NODE_ENV;

describe('captureMessage', () => {
  beforeEach(() => {
    sentryCaptureMessage.mockReset();
    env.NODE_ENV = 'production';
  });

  afterAll(() => {
    env.NODE_ENV = ORIGINAL_NODE_ENV;
  });

  it('level 미지정 → warning 기본값', () => {
    captureMessage('msg', { a: 1 });

    expect(sentryCaptureMessage).toHaveBeenCalledWith('msg', {
      level: 'warning',
      extra: { a: 1 },
      fingerprint: undefined,
      tags: undefined,
    });
  });

  it('level·fingerprint·tags 지정 → 그대로 전달', () => {
    captureMessage('msg', undefined, { level: 'info', fingerprint: ['fp'], tags: { scope: 's' } });

    expect(sentryCaptureMessage).toHaveBeenCalledWith('msg', {
      level: 'info',
      extra: undefined,
      fingerprint: ['fp'],
      tags: { scope: 's' },
    });
  });

  it('비 production → Sentry 미호출', () => {
    env.NODE_ENV = 'test';

    captureMessage('msg');

    expect(sentryCaptureMessage).not.toHaveBeenCalled();
  });
});
