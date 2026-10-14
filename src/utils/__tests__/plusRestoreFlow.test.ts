/**
 * runPlusRestore 단위 테스트 (D6-0 에서 분리한 복원 흐름 — 결제 화면·구독 화면 공용)
 */
import type { RestoreOutcome } from '../../services/purchases';
import { runPlusRestore } from '../plusRestoreFlow';

function deps(outcome: RestoreOutcome, reflected = true) {
  const order: string[] = [];
  return {
    order,
    d: {
      restore: jest.fn(async () => {
        order.push('restore');
        return outcome;
      }),
      waitReflected: jest.fn(async () => {
        order.push('wait');
        return reflected;
      }),
      onRestoreActive: jest.fn(() => {
        order.push('active');
      }),
      breadcrumb: jest.fn((o: RestoreOutcome) => {
        order.push(`crumb:${o}`);
      }),
      reportNotReflected: jest.fn(() => {
        order.push('warn');
      }),
    },
  };
}

it.each<[RestoreOutcome, string]>([
  ['identity_mismatch', 'identity_mismatch'],
  ['failed', 'failed'],
])('%s → 그대로 반환, 기록·반영 확인 없음', async (outcome, result) => {
  const { d, order } = deps(outcome);
  expect(await runPlusRestore(d)).toBe(result);
  expect(order).toEqual(['restore']);
});

it('활성 구독 없음 → restored-none, breadcrumb 만, 반영 확인 없음(PW-14)', async () => {
  const { d, order } = deps('restored-none');
  expect(await runPlusRestore(d)).toBe('restored-none');
  expect(order).toEqual(['restore', 'crumb:restored-none']);
});

it('활성 구독 + 반영 → reflected. 진행 단계 표시가 반영 확인보다 먼저', async () => {
  const { d, order } = deps('restored-active', true);
  expect(await runPlusRestore(d)).toBe('reflected');
  expect(order).toEqual(['restore', 'crumb:restored-active', 'active', 'wait']);
});

it('활성 구독 + 30초 미반영 → not-reflected, warning 1회', async () => {
  const { d, order } = deps('restored-active', false);
  expect(await runPlusRestore(d)).toBe('not-reflected');
  expect(order).toEqual(['restore', 'crumb:restored-active', 'active', 'wait', 'warn']);
});

it('onRestoreActive 는 선택', async () => {
  const { d } = deps('restored-active', true);
  const { onRestoreActive: _omit, ...rest } = d;
  expect(await runPlusRestore(rest)).toBe('reflected');
});
