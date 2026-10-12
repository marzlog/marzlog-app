jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));

import * as Sentry from '@sentry/react-native';
import { addBreadcrumb, captureError, captureMessage } from '../sentry';

const sentryCaptureMessage = Sentry.captureMessage as jest.Mock;
const sentryCaptureException = Sentry.captureException as jest.Mock;
// NODE_ENV 는 타입상 readonly — 테스트에서만 production 경로로 전환한다
const env = process.env as Record<string, string | undefined>;
const ORIGINAL_NODE_ENV = env.NODE_ENV;

describe('captureMessage', () => {
  beforeEach(() => {
    sentryCaptureMessage.mockReset();
    sentryCaptureException.mockReset();
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

describe('captureError', () => {
  beforeEach(() => {
    sentryCaptureException.mockReset();
    env.NODE_ENV = 'production';
  });

  afterAll(() => {
    env.NODE_ENV = ORIGINAL_NODE_ENV;
  });

  it('tags 지정 → captureException 에 그대로 전달', () => {
    const err = new Error('boom');
    captureError(err, { scope: 's' }, { tags: { area: 'paywall', kind: 'annual' } });

    expect(sentryCaptureException).toHaveBeenCalledWith(err, {
      extra: { scope: 's' },
      tags: { area: 'paywall', kind: 'annual' },
    });
  });

  it('tags 미지정 → undefined (기존 호출 형태 유지)', () => {
    const err = new Error('boom');
    captureError(err, { scope: 's' });

    expect(sentryCaptureException).toHaveBeenCalledWith(err, { extra: { scope: 's' }, tags: undefined });
  });
});

describe('addBreadcrumb', () => {
  it('category·message·data 를 info 레벨로 전달', () => {
    addBreadcrumb('paywall', 'offer', { status: 'ok' });

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'paywall',
      message: 'offer',
      level: 'info',
      data: { status: 'ok' },
    });
  });
});

