/**
 * 구매 복원 흐름 — 순수 함수 (RN/SDK 비의존). PAYWALL PW-14·PW-15, D6-0 에서 결제 화면에서 분리.
 *
 * 복원 래퍼(신원 대조 포함) → 결과별 분기 → 활성 구독이면 서버 반영 확인. 화면 표시(안내·이동)는 호출부가
 * 결과값으로 정한다 — 결제 화면과 구독 화면(D6-1)이 같은 흐름을 쓴다.
 *  - 기록 순서는 분리 전과 같다: 복원 결과 breadcrumb 는 restored-* 일 때만, 미반영 warning 은 확인이 끝난 뒤.
 */
import type { RestoreOutcome } from '../services/purchases';

export type PlusRestoreResult = 'identity_mismatch' | 'failed' | 'restored-none' | 'reflected' | 'not-reflected';

export interface PlusRestoreDeps {
  /** 복원 래퍼 호출(서버 user.id 로 신원 대조) */
  restore: () => Promise<RestoreOutcome>;
  /** 서버 반영 확인(PLUS_REFLECT_* 상수) — 결제 화면은 대기 문구 단계를 함께 바꾼다 */
  waitReflected: () => Promise<boolean>;
  /** restored-active 로 확정된 직후(반영 확인 전) — 결제 화면은 잠금 진행 단계를 restore-active 로 */
  onRestoreActive?: () => void;
  breadcrumb: (outcome: RestoreOutcome) => void;
  reportNotReflected: () => void;
}

export async function runPlusRestore(deps: PlusRestoreDeps): Promise<PlusRestoreResult> {
  const restored = await deps.restore();
  if (restored === 'identity_mismatch') return 'identity_mismatch';
  if (restored === 'failed') return 'failed';
  deps.breadcrumb(restored);
  if (restored === 'restored-none') return 'restored-none';
  // restored-active: Plus 여부는 서버 반영으로만 판단(PW-1)
  deps.onRestoreActive?.();
  const reflected = await deps.waitReflected();
  if (!reflected) deps.reportNotReflected();
  return reflected ? 'reflected' : 'not-reflected';
}
