/**
 * Marzlog Plus 상수 (PAYWALL 명세 §2.4). 값은 diff 보고에서 제안 → JJ 확정.
 */

/** 무료 저장 공간(GB) — 백엔드 free 2GB(core/storage_plans FREE)와 같게 */
export const FREE_STORAGE_GB = 2;

/** Plus 저장 공간(GB) — 백엔드 PLUS_STORAGE_LIMIT_BYTES 기본 100GB와 같게 */
export const PLUS_STORAGE_GB = 100;

/** 상품 조회(getOfferings·체험 자격) 시간 제한 — 부트 /auth/me(10초)와 같은 수준 */
export const PAYWALL_OFFER_TIMEOUT_MS = 10_000;

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
