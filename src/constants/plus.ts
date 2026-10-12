/**
 * Marzlog Plus 상수 (PAYWALL 명세 §2.4). 값은 diff 보고에서 제안 → JJ 확정.
 */

/** 무료 저장 공간(GB) — 백엔드 free 2GB(core/storage_plans FREE)와 같게 */
export const FREE_STORAGE_GB = 2;

/** Plus 저장 공간(GB) — 백엔드 PLUS_STORAGE_LIMIT_BYTES 기본 100GB와 같게 */
export const PLUS_STORAGE_GB = 100;

/** 상품 조회(getOfferings·체험 자격) 시간 제한 — 부트 /auth/me(10초)와 같은 수준 */
export const PAYWALL_OFFER_TIMEOUT_MS = 10_000;

/** 결제 완료 후 서버 반영(/auth/me plan) 재조회 횟수 — 웹훅 반영은 보통 수 초 */
export const PLUS_REFLECT_RETRY_COUNT = 5;

/** 재조회 간격 — 5회 × 2초 = 최대 약 10초 대기 후 "반영 중" 변형으로 넘어간다 */
export const PLUS_REFLECT_RETRY_INTERVAL_MS = 2_000;
