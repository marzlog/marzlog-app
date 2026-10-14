/**
 * shouldBlockWithdraw 단위 테스트 (W-WITHDRAW-PLAN-SOURCE, PAYWALL D9-3)
 */
import { shouldBlockWithdraw } from '../withdrawGate';

it('plus → 안내(탈퇴 전 구독 해지)', () => {
  expect(shouldBlockWithdraw({ plan: 'plus' })).toBe(true);
});

it.each([['free'], [undefined], [null], [''], ['PLUS'], ['basic'], ['pro'], ['unlimited']])(
  'plus 가 아니면(%p, 레거시 값 포함) 막지 않음',
  (plan) => {
    expect(shouldBlockWithdraw({ plan })).toBe(false);
  },
);
