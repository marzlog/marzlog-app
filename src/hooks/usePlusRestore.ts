import { useCallback } from 'react';
import { useAuthStore } from '@src/store/authStore';
import { restorePaywallPurchases } from '@src/services/purchases';
import { addBreadcrumb, captureMessage } from '@/src/utils/sentry';
import { runPlusRestore, type PlusRestoreResult } from '@src/utils/plusRestoreFlow';

/**
 * 구매 복원 훅(D6-0) — 결제 화면·구독 화면이 같은 복원 흐름(신원 대조 → PW-14 → 서버 반영 확인)을 쓴다.
 * 잠금·대기 문구·결과별 안내와 이동은 호출부 몫이다. source 는 기록용(결제 화면 source 또는 화면 이름).
 */
export function usePlusRestore(source: string) {
  return useCallback(
    (opts: { waitReflected: () => Promise<boolean>; onRestoreActive?: () => void }): Promise<PlusRestoreResult> =>
      runPlusRestore({
        restore: () => restorePaywallPurchases(useAuthStore.getState().user?.id),
        waitReflected: opts.waitReflected,
        onRestoreActive: opts.onRestoreActive,
        breadcrumb: (outcome) => addBreadcrumb('paywall', 'restore', { outcome, source }),
        reportNotReflected: () =>
          captureMessage('paywall plus not reflected after restore', { source }, {
            level: 'warning',
            fingerprint: ['paywall-restore-reflect-timeout'],
            tags: { area: 'paywall', source },
          }),
      }),
    [source],
  );
}
