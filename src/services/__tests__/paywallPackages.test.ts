import { pickPaywallPackages } from '../paywallPackages';

const pkg = (identifier: string) => ({ identifier, priceString: identifier });

describe('pickPaywallPackages', () => {
  it('$rc_monthly / $rc_annual 을 종류별로 고른다', () => {
    const picked = pickPaywallPackages([pkg('$rc_annual'), pkg('$rc_monthly')]);
    expect(picked.monthly?.identifier).toBe('$rc_monthly');
    expect(picked.annual?.identifier).toBe('$rc_annual');
  });

  it('표준 식별자가 아닌 패키지(lifetime·Test Store 잔재)는 무시한다', () => {
    const picked = pickPaywallPackages([pkg('$rc_lifetime'), pkg('test_store_monthly'), pkg('$rc_monthly')]);
    expect(Object.keys(picked)).toEqual(['monthly']);
  });

  it('한쪽만 있으면 그쪽만 반환한다', () => {
    expect(pickPaywallPackages([pkg('$rc_annual')])).toEqual({ annual: pkg('$rc_annual') });
  });

  it('비어 있으면 빈 객체', () => {
    expect(pickPaywallPackages([])).toEqual({});
  });
});
