/**
 * Marzlog Plus 상수 (PAYWALL 명세 §2.4). 값은 diff 보고에서 제안 → JJ 확정.
 */

/** 무료 저장 공간(GB) — 백엔드 free 2GB(core/storage_plans FREE)와 같게 */
export const FREE_STORAGE_GB = 2;

/** Plus 저장 공간(GB) — 백엔드 PLUS_STORAGE_LIMIT_BYTES 기본 100GB와 같게 */
export const PLUS_STORAGE_GB = 100;

/** 상품 조회(getOfferings·체험 자격) 시간 제한 — 부트 /auth/me(10초)와 같은 수준 */
export const PAYWALL_OFFER_TIMEOUT_MS = 10_000;

/** 구매 복원(신원 대조 + restorePurchases) 전체 시간 제한 — 초과하면 잠금 해제 + 실패 안내(B-PAYWALL-HANG) */
export const PAYWALL_RESTORE_TIMEOUT_MS = 20_000;

/**
 * purchasePackage 시간 제한(B-PAYWALL-HANG) — 결제 시트에서 인증하는 시간까지 포함하므로 넉넉히.
 * 초과 뒤 거래가 끝나도 결제 화면 복귀 때 자격 확인(B-PURCHASE-ERROR-AFTER-SUCCESS ②)이 반영 확인을 시작한다.
 */
export const PAYWALL_PURCHASE_TIMEOUT_MS = 60_000;

/**
 * 결제·복원 후 서버 반영(/auth/me plan) 확인 — 마감 시각 기준(D5-b).
 * 구매 → 첫 웹훅 지연 실측 5.8 / 14.3 / 17.4 / 6.6초(2026-10-12~13) → 최대 30초면 실측 최대의 약 1.7배.
 */
/** 확인 시작 간격 — 시도가 이보다 빨리 끝나면 남은 만큼 기다린다 */
export const PLUS_REFLECT_INTERVAL_MS = 2_000;

/** 최대 대기 — 이 안에 반영되지 않으면 완료 화면의 "반영 중" 변형으로 넘어간다 */
export const PLUS_REFLECT_MAX_WAIT_MS = 30_000;

/** 시도 1회(/auth/me)의 시간 제한 — 마지막 시도는 남은 시간으로 자른다 */
export const PLUS_REFLECT_ATTEMPT_TIMEOUT_MS = 5_000;

/** 대기 문구를 "조금 더 걸리고 있어요"로 바꾸는 시점 */
export const PLUS_REFLECT_LONG_AFTER_MS = 10_000;

/** 완료 화면 "반영 중"에서 /auth/me 주기 재확인 간격(D5-b-4). 시도별 제한은 PLUS_REFLECT_ATTEMPT_TIMEOUT_MS */
export const PLUS_PENDING_RECHECK_INTERVAL_MS = 5_000;

/** 주기 재확인 총 시간 — 앱이 앞에 있는 동안 쓴 시간만 센다(백그라운드에서 멈췄다가 복귀하면 남은 만큼 이어 감) */
export const PLUS_PENDING_RECHECK_MAX_MS = 120_000;

/**
 * 결과 미확인 구매(unconfirmed)의 유예(D12) — **복귀 후 첫 재확인 시각**부터 이 안에서는 재확인이 '없음'이어도 실패로
 * 보지 않고 RC(캐시 비운 읽기)와 서버 /auth/me plan 을 UNCONFIRMED_POLL_MS 간격으로 다시 본다. 오프라인 동안은 거래가
 * RC 로 갈 수 없으므로 연결이 돌아온 뒤부터 센다. 구매 → RC 수신 실측 13초(2026-10-30 iPhone, purchased_at 10:17:48Z →
 * webhook 10:18:01Z)와 첫 웹훅 지연 최대 17.4초의 약 3.5배.
 */
export const UNCONFIRMED_GRACE_MS = 60_000;

/** 미확인 시각부터의 총 상한 — 유예(첫 재확인 + 60초)와 이 상한 중 먼저 끝나는 쪽까지만 폴링한다 */
export const UNCONFIRMED_MAX_MS = 180_000;

/** 유예 중 재확인 간격 */
export const UNCONFIRMED_POLL_MS = 5_000;
