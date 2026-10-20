/**
 * resolveRestoreOutcome 단위 테스트 (PW-14 · B-PAYWALL-HANG — Plus entitlement 활성만 "내역 있음")
 */
import { resolveRestoreOutcome } from '../purchasesRestore';
import { TimeoutError } from '../../utils/withTimeout';

describe('resolveRestoreOutcome', () => {
  it('Plus 자격 활성 → restored-active(반영 확인 루프로)', () => {
    const info = { entitlements: { active: { plus: { isActive: true } } } };
    expect(resolveRestoreOutcome({ kind: 'result', info })).toEqual({ outcome: 'restored-active' });
  });

  it('만료 영수증만(active 비어 있고 all 에만 plus) → restored-none(즉시 "내역 없음")', () => {
    const info = {
      activeSubscriptions: [],
      allPurchasedProductIdentifiers: ['plus_yearly'],
      entitlements: { active: {}, all: { plus: { isActive: false } } },
    };
    expect(resolveRestoreOutcome({ kind: 'result', info })).toEqual({ outcome: 'restored-none' });
  });

  it('내역 없음·응답 비어 있음 → restored-none', () => {
    expect(resolveRestoreOutcome({ kind: 'result', info: { entitlements: { active: {} } } })).toEqual({ outcome: 'restored-none' });
    expect(resolveRestoreOutcome({ kind: 'result', info: null })).toEqual({ outcome: 'restored-none' });
  });

  it('시간 초과 → failed(timeout)', () => {
    expect(resolveRestoreOutcome({ kind: 'error', error: new TimeoutError('PAYWALL_RESTORE') })).toEqual({
      outcome: 'failed',
      failure: 'timeout',
    });
  });

  it('그 밖의 예외 → failed(error)', () => {
    expect(resolveRestoreOutcome({ kind: 'error', error: new Error('network') })).toEqual({ outcome: 'failed', failure: 'error' });
  });
});
