import { resolveOtaCheckFailure } from '../otaCheckFailure';

describe('resolveOtaCheckFailure (W-SENTRY-OFFLINE-NOISE)', () => {
  it('연결 없음 확정 → breadcrumb', async () => {
    await expect(resolveOtaCheckFailure(async () => ({ isConnected: false }))).resolves.toBe('breadcrumb');
  });

  it('온라인 → capture', async () => {
    await expect(resolveOtaCheckFailure(async () => ({ isConnected: true }))).resolves.toBe('capture');
  });

  it('판정 불가(null) → capture', async () => {
    await expect(resolveOtaCheckFailure(async () => ({ isConnected: null }))).resolves.toBe('capture');
  });

  it('NetInfo 조회 실패 → capture', async () => {
    await expect(
      resolveOtaCheckFailure(async () => {
        throw new Error('netinfo unavailable');
      })
    ).resolves.toBe('capture');
  });
});
