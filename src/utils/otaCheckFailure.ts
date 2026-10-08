/**
 * W-SENTRY-OFFLINE-NOISE: OTA 업데이트 확인 실패의 Sentry 처리 판정.
 * NetInfo가 "연결 없음"을 확정한 경우만 breadcrumb(이벤트 미발송) — 오프라인 실패는 정상 거동이다.
 * 온라인·판정 불가(null)·NetInfo 조회 실패는 현행대로 예외를 보낸다. 오류 문구로는 판별하지 않는다.
 */
export type OtaCheckFailureAction = 'breadcrumb' | 'capture';

export async function resolveOtaCheckFailure(
  fetchNetState: () => Promise<{ isConnected: boolean | null }>,
): Promise<OtaCheckFailureAction> {
  try {
    const state = await fetchNetState();
    return state.isConnected === false ? 'breadcrumb' : 'capture';
  } catch {
    return 'capture';
  }
}
