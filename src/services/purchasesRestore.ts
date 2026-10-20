/**
 * 구매 복원 결과 판정 — 순수 함수 (RN/SDK 비의존, 단위 테스트 대상). PAYWALL 명세 PW-14, B-PAYWALL-HANG.
 *
 * "복원할 내역 있음(restored-active)" = RC CustomerInfo 의 entitlements.active["plus"] 가 활성일 때만.
 * 만료 영수증(entitlements.all·allPurchasedProductIdentifiers 에만 있는 구매)은 restored-none → 즉시 "복원할 구매 내역이 없어요".
 * restored-active 면 서버 반영 확인 루프로 간다.
 * ★Plus 부여·표시에는 쓰지 않는다(PW-1 — Plus 판정은 서버 /auth/me plan 만).
 */
import { hasPlusEntitlement, type EntitlementInfoLike } from './purchaseRecovery';
import { isTimeoutError } from '../utils/withTimeout';

/**
 * restored-active = 복원 완료, Plus 자격 활성 → 서버 반영 확인 루프로
 * restored-none = 복원 완료, Plus 자격 없음(만료 포함) → 즉시 restoreNone
 * failed = 예외·시간 초과
 * identity_mismatch = 신원 대조 차단(복원 미호출)
 */
export type RestoreOutcome = 'restored-active' | 'restored-none' | 'failed' | 'identity_mismatch';

/** 복원 래퍼가 겪은 일 — 차단 / RC 응답 / 예외(시간 초과 포함) */
export type RestoreRun =
  | { kind: 'blocked' }
  | { kind: 'result'; info: EntitlementInfoLike | null | undefined }
  | { kind: 'error'; error: unknown };

export interface RestoreResolution {
  outcome: RestoreOutcome;
  /** failed 일 때만 — 시간 초과인지 그 밖의 예외인지 */
  failure?: 'timeout' | 'error';
}

export function resolveRestoreOutcome(run: RestoreRun): RestoreResolution {
  switch (run.kind) {
    case 'blocked':
      return { outcome: 'identity_mismatch' };
    case 'error':
      return { outcome: 'failed', failure: isTimeoutError(run.error) ? 'timeout' : 'error' };
    case 'result':
      return { outcome: hasPlusEntitlement(run.info) ? 'restored-active' : 'restored-none' };
  }
}
