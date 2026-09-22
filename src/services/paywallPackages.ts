/**
 * 페이월 패키지 선택 — 순수 함수 (RN/SDK 비의존, 단위 테스트 대상).
 *
 * offering 'default' 의 패키지 중 RC 표준 식별자 $rc_monthly / $rc_annual 만 고른다.
 * 그 외 패키지(과거 마법사가 넣은 Test Store·lifetime 등)는 설정 오염이 재발해도 표시하지 않는다.
 */
export const PAYWALL_OFFERING_ID = 'default';

export const PAYWALL_PACKAGE_IDS = {
  monthly: '$rc_monthly',
  annual: '$rc_annual',
} as const;

export type PaywallPlanKind = keyof typeof PAYWALL_PACKAGE_IDS;

export interface PackageLike {
  identifier: string;
}

export function pickPaywallPackages<P extends PackageLike>(
  packages: readonly P[],
): Partial<Record<PaywallPlanKind, P>> {
  const picked: Partial<Record<PaywallPlanKind, P>> = {};
  (Object.keys(PAYWALL_PACKAGE_IDS) as PaywallPlanKind[]).forEach((kind) => {
    const pkg = packages.find((p) => p.identifier === PAYWALL_PACKAGE_IDS[kind]);
    if (pkg) picked[kind] = pkg;
  });
  return picked;
}
