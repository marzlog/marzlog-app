/**
 * paywallOffer 단위 테스트 (PAYWALL 명세 §2.3·§7)
 *
 * 금액은 시안·스토어 설정 기준 예시값(코드·문구에는 들어가지 않는다 — PW-3).
 */
import { annualDiscountPercent, trialPeriodToDays } from '../paywallOffer';

describe('annualDiscountPercent', () => {
  it.each<[string, number, number, string, number]>([
    ['KRW', 5500, 44000, 'KRW', 33],
    ['VND', 49000, 399000, 'VND', 32],
    ['THB', 79, 599, 'THB', 36],
  ])('%s 월 %d · 연 %d → %d%%', (currency, monthly, annual, annualCurrency, expected) => {
    expect(
      annualDiscountPercent({ price: monthly, currencyCode: currency }, { price: annual, currencyCode: annualCurrency }),
    ).toBe(expected);
  });

  it('통화가 다르면 null', () => {
    expect(annualDiscountPercent({ price: 5500, currencyCode: 'KRW' }, { price: 39.99, currencyCode: 'USD' })).toBeNull();
  });

  it('연간이 더 비싸거나 같으면 null', () => {
    expect(annualDiscountPercent({ price: 5500, currencyCode: 'KRW' }, { price: 70000, currencyCode: 'KRW' })).toBeNull();
    expect(annualDiscountPercent({ price: 5500, currencyCode: 'KRW' }, { price: 66000, currencyCode: 'KRW' })).toBeNull();
  });

  it('값이 없거나 월 가격이 0 이하면 null', () => {
    expect(annualDiscountPercent(null, { price: 44000, currencyCode: 'KRW' })).toBeNull();
    expect(annualDiscountPercent({ price: 5500, currencyCode: 'KRW' }, null)).toBeNull();
    expect(annualDiscountPercent({ price: 0, currencyCode: 'KRW' }, { price: 0, currencyCode: 'KRW' })).toBeNull();
  });

  it('부동소수 경계에서 내림이 한 단계 밀리지 않는다(정확히 33.33…%)', () => {
    expect(annualDiscountPercent({ price: 3, currencyCode: 'USD' }, { price: 24, currencyCode: 'USD' })).toBe(33);
  });
});

describe('trialPeriodToDays', () => {
  it.each<[string, number, number, number | null]>([
    ['DAY', 3, 1, 3],
    ['DAY', 14, 1, 14],
    ['WEEK', 1, 1, 7],
    ['WEEK', 2, 1, 14],
    ['week', 1, 1, 7], // 대소문자 무관
    ['DAY', 7, 2, 14], // 반복 횟수 반영
  ])('%s × %d (cycles %d) → %s', (unit, count, cycles, expected) => {
    expect(trialPeriodToDays(unit, count, cycles)).toBe(expected);
  });

  it('월·년 단위는 일수로 바꾸지 않는다(null — 숫자 없는 문구)', () => {
    expect(trialPeriodToDays('MONTH', 1)).toBeNull();
    expect(trialPeriodToDays('YEAR', 1)).toBeNull();
    expect(trialPeriodToDays('UNKNOWN', 1)).toBeNull();
  });

  it('잘못된 수(0·음수·소수)는 null', () => {
    expect(trialPeriodToDays('DAY', 0)).toBeNull();
    expect(trialPeriodToDays('DAY', -1)).toBeNull();
    expect(trialPeriodToDays('DAY', 1.5)).toBeNull();
    expect(trialPeriodToDays('DAY', 3, 0)).toBeNull();
  });

  it('cycles 기본값은 1', () => {
    expect(trialPeriodToDays('WEEK', 1)).toBe(7);
  });
});
