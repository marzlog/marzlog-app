/**
 * 페이월 표시값 계산 — 순수 함수 (RN/SDK 비의존, 단위 테스트 대상). PAYWALL 명세 §2.3.
 *
 * 금액·통화·할인율·체험 일수는 전부 스토어가 준 값에서 만든다(PW-3). 여기서는 숫자만 다루고
 * 표시 문자열(priceString·pricePerMonthString)은 SDK 값을 그대로 쓴다(자체 포맷 금지).
 */

export interface PricePoint {
  /** 현지 통화 금액(스토어 값) */
  price: number;
  /** ISO 4217 (스토어 값) */
  currencyCode: string;
}

/**
 * 연간 할인율(%) = floor((월×12 − 연) / (월×12) × 100).
 * 값이 없거나, 통화가 다르거나, 월×12 ≤ 0, 할인율 ≤ 0(연간이 같거나 더 비쌈)이면 null.
 */
export function annualDiscountPercent(monthly: PricePoint | null, annual: PricePoint | null): number | null {
  if (!monthly || !annual) return null;
  if (monthly.currencyCode !== annual.currencyCode) return null;
  const yearlyByMonth = monthly.price * 12;
  if (!(yearlyByMonth > 0) || !(annual.price >= 0)) return null;
  // 부동소수 오차로 33.333… 이 32.999… 가 되지 않게 아주 작은 보정을 둔다
  const percent = Math.floor(((yearlyByMonth - annual.price) * 100) / yearlyByMonth + 1e-9);
  return percent > 0 ? percent : null;
}

/** 스토어 기간 단위 — iOS PurchasesIntroPrice.periodUnit / Android Period.unit */
export type TrialPeriodUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | string;

/**
 * 체험 기간 → 일수. 일·주 단위만 일수로 바꾼다(월·년은 길이가 일정하지 않아 null — 숫자 없는 문구 사용).
 * total = 단위 수 × 반복 횟수(무료 체험은 보통 1회).
 */
export function trialPeriodToDays(unit: TrialPeriodUnit, unitCount: number, cycles: number = 1): number | null {
  if (!Number.isInteger(unitCount) || unitCount <= 0) return null;
  if (!Number.isInteger(cycles) || cycles <= 0) return null;
  const total = unitCount * cycles;
  switch (String(unit).toUpperCase()) {
    case 'DAY':
      return total;
    case 'WEEK':
      return total * 7;
    default:
      return null;
  }
}
