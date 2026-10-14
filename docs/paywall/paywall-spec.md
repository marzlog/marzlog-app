# Marzlog Plus 결제 화면(PAYWALL) 구현 명세서

- 판: v1.6 (2026-10-14, D6 — 설정 구독 화면 §3.3 전면 개정·진입점 정리·표기 정리·복원 훅) · 대상: Build 34 (marzlog-app 1.0.3, develop)
- 이전 판: v1.5 (2026-10-13, D5-b — 반영 확인 30초·미반영 화면·신원 대조, PW-14·PW-15 / D5-b-4 주기 재확인·복원 안전장치 / D5-b-5 결제 화면 잠금 안전장치 / D5-c 이미 구독 중 안내, PW-16) · 대상: Build 34 (marzlog-app 1.0.3, develop)
- 이전 판: v1.4 (2026-10-08, PW-11~13 + 게이트 2 판정·측정 S1~S3 + D1 보정 3건 + 재개 single 사진별 판정 반영)
- 기준선: marzlog-app `e24e5a1` / marzlog-backend `7031620` / 정찰 보고 2026-10-08(게이트 1)
- 우선순위: **이 문서 > `screens/*.png` > `reference/*.html`**
  - PNG·HTML은 배치·위계·문구의 기준이다. 색·글꼴·간격·모서리 값은 앱의 기존 테마 토큰을 쓴다.
  - 시안의 `#FF6A5E`, Noto Sans KR, ₩ 금액, "33%", "14일"은 전부 그림용 임시값이다.

---

## 0. 범위

| 포함 | 제외 |
|---|---|
| 결제 화면 본체(시안 1) | 사용량 90% 사전 예고 |
| 진입점 3곳: 설정 구독 메뉴(4) · 재생성 제한(2) · 용량 초과(5) | 평생 이용권(F-PLUS-LIFETIME) |
| 구독 시작 완료 화면(3) | 프로모션 코드·첫해 할인 |
| 선결 수리 B-UPLOAD-FAIL-AS-PENDING | 413 응답 본문 개편(W-ERROR-SHAPE로 유지) |
| 백엔드 `/auth/me` 필드 2개 추가 | 용량 표시·집행 불일치 수리(W-QUOTA-DISPLAY-GATE로 유지) |

---

## 1. 결정 기록 (ADR-2026-10-08-PW)

| # | 결정 | 근거 |
|---|---|---|
| PW-1 | Plus 판정은 계속 서버 `/auth/me`의 `plan`만 신뢰한다. RC `CustomerInfo`로 권한을 판정하지 않는다. | 이관 보존 조건 ②(2026-09-18) |
| PW-2 | "해지 예약됨" 표시는 `/auth/me`에 `plan_status`·`plan_store`를 **추가**해서 해결한다. 앱은 필드가 없거나 `null`이면 날짜만 표시한다. | PW-1과 일관. 추가만 하므로 구버전 앱 무영향 |
| PW-3 | 금액·통화·할인율·체험 일수는 전부 스토어가 준 값에서 만든다. 문구 파일과 코드에 금액·통화 기호를 넣지 않는다. | 나라별 가격이 달라 할인율도 다름(KRW 33%, VND 32%, THB 36%). F-CURRENCY-DISPLAY 선결 |
| PW-4 | 체험 자격을 확인하지 못하면 체험을 약속하지 않는다(중립 버튼 문구). | 자격 없는 사용자에게 "무료"를 보여주면 심사·환불 리스크 |
| PW-5 | 용량 초과 안내의 숫자는 413 응답 본문의 `used_bytes`·`limit_bytes`를 쓴다. 업로드 전 사전 검사는 넣지 않는다. | 413 값이 집행값. `/users/storage`는 표시값이라 플래그 off에서 어긋남(F4) |
| PW-6 | 서버가 거절한 업로드(용량 초과 포함)는 재시도 대상과 "대기 중" 건수에서 즉시 뺀다. | 지금은 413 항목이 4분 넘게 "대기 중"으로 보여 안내가 묻힘 |
| PW-7 | 결제 완료 후 서버 반영이 늦어도 alert를 띄우지 않는다. 완료 화면의 "반영 중" 변형으로 보여준다. | 스토어 결제는 이미 끝난 상태. 오류처럼 보이면 안 됨 |
| PW-8 | 결제 화면은 `fullScreenModal`, 닫기(X)로만 닫는다. 구매 진행 중에는 닫기·뒤로가기를 막는다. | 구매 시트와 화면 전환 충돌 방지 |
| PW-9 | 레거시 `app/plans.tsx`와 `plans.*` 문구는 마지막 정리 diff에서 삭제한다. | 진입 경로 0건, ₩ 하드코딩 잔존 |
| PW-11 | 서버는 샌드박스 구매 알림을 **항상 받는다**(`RC_ACCEPT_SANDBOX_EVENTS=true` 상시). 9/28 G0의 `false`를 되돌린다. | 심사는 업데이트마다 있고 심사자는 샌드박스로 구매한다. 샌드박스 구매는 TestFlight·개발 빌드·Play 라이선스 테스터만 가능해 명단이 통제됨. 통계에서는 `subscriptions.environment = 'sandbox'` 행을 제외한다(기존 컬럼, 마이그레이션 없음) |
| PW-12 | `PLUS_GATE_ENABLED=true` 전환은 **심사 제출 전**에 한다(공개일이 아님). 선행 조건은 8.2의 측정 2건. | 꺼져 있으면 Plus 결제자도 2GB로 집행됨. 첫 결제가 가능해지기 전에 켜져 있어야 함 |
| PW-13 | `/auth/me`의 `plan`은 집행과 **같은 만료 판정**을 쓴다. 만료 시각 뒤 여유 시간(`PLAN_EXPIRY_GRACE_SECONDS`) 동안은 Plus로 본다. 표시·집행 모두 같은 함수. | EXPIRATION 알림이 누락되면 "표시는 Plus, 집행은 무료"가 됨. 여유 시간은 갱신 알림 지연 대비 |
| PW-14 | 복원 후: RC 응답(`CustomerInfo`)에 활성 구독이 없으면 즉시 `paywall.restoreNone`. 있으면 구매와 같은 반영 확인(최대 30초) → 반영되면 완료 화면, 안 되면 완료 화면 "반영 중"(복원 확인 안내). **SDK 결과는 대기 생략 판단에만 쓰고 Plus 부여·표시에는 쓰지 않는다(PW-1 유지).** | 복원도 웹훅을 거쳐 반영되므로 즉시 1회 조회는 대부분 "내역 없음"으로 오판. 내역 없는 사용자를 30초 기다리게 하지 않기 위해 SDK 결과로 대기만 생략 |
| PW-15 | 구매·복원 직전 신원 대조: ① 식별 큐 대기 → ② RC `appUserID`와 서버 `user.id` 대조(대소문자 무시·공백 유지), 다르면 재 `logIn` 1회 후 재대조 → ③ 그래도 다르면 스토어 호출 전에 차단 + Sentry. 로그인 때 `logIn`이 실패한 채면 앱 복귀 때 재시도. (④ 보류) | 익명·다른 id로 산 구매는 웹훅이 사용자에 매핑하지 못해 영원히 미반영 |
| PW-16 | 이 기기의 스토어 계정이 이미 구독 중이면(`PRODUCT_ALREADY_PURCHASED`) 실패가 아니라 `already_owned`로 보고 [구매 복원]/[닫기]를 안내한다. 복원하면 구독이 지금 계정으로 옮겨지고 이전 계정은 Plus가 해제됨을 문구로 알린다. **RevenueCat 이전 정책 = Transfer 전제**(대시보드 설정, JJ 확인 항목). 헤더의 일반 "구매 복원"에는 복원 전 확인 창을 넣지 않는다. | 2026-10-13 Android 실측: 같은 Play 계정·다른 앱 계정에서 구매 시 "실패" 안내, 복원 시 TRANSFER(A→B) 처리 |
| PW-10 | 새 의존성 0건. 바텀시트는 앱에 이미 있는 모달 패턴으로 만든다. | 네이티브 모듈 추가는 빌드·심사 리스크 |

---

## 2. 계약

### 2.1 백엔드 변경: `GET /auth/me` (추가만, 버전업 없음)

```json
{
  "plan": "plus",
  "plan_expires_at": "2026-11-08T03:12:00Z",
  "plan_status": "cancelled",
  "plan_store": "apple"
}
```

| 필드 | 값 | 규칙 |
|---|---|---|
| `plan_status` | `active` \| `grace` \| `cancelled` \| `expired` \| `null` | `subscriptions.status` 그대로. 구독 행이 없으면(users fallback) `null` |
| `plan_store` | `apple` \| `google` \| `null` | 저장값이 `apple`·`google`이면 그대로, 그 밖의 값(다른 스토어·프로모션 지급 등)은 `null`로 내린다. 예상 밖 값으로 응답 검증이 실패하면 안 된다 |

- 마이그레이션 없음. 조회는 기존 `get_user_plan`이 읽는 행을 재사용해 쿼리를 늘리지 않는다(N+1 금지).
- 실패 응답 형식은 현행 유지. `plan_expires_at`의 의미는 바꾸지 않는다.
- **D2-b(PW-13)**: `plan`은 "구독 행이 plus이고 `now < 만료 시각 + PLAN_EXPIRY_GRACE_SECONDS`"일 때만 `plus`다. `grace` 상태는 유예 만료 시각을 기준으로 한다. 이 판정을 함수 하나로 두고 `/auth/me`·재생성 게이트·용량 한도가 모두 그 함수를 쓴다. 시각은 DB `now()` 기준(현행 집행과 동일).
- `PLAN_EXPIRY_GRACE_SECONDS`는 env. 값은 9/28 샌드박스 기록에서 "만료 시각 → RENEWAL 수신" 지연을 실측한 뒤 JJ가 확정한다.
- 테스트: 구독 행 없음 → 둘 다 `null` / active·grace·cancelled·expired 각 1건 / 만료 직전·여유 시간 안·여유 시간 뒤 경계 3건 / 표시와 집행이 같은 결과인지 1건 / 기존 `/auth/me` 테스트 회귀 0.

### 2.2 앱이 소비하는 기존 응답 (변경 없음)

용량 초과 — `POST /media/upload/prepare`, `POST /media/{group_id}/add-images`

```json
HTTP 413
{"detail":{"error_code":"STORAGE_QUOTA_EXCEEDED","message":"…",
  "detail":{"used_bytes":2147483648,"limit_bytes":2147483648,"plan":"free","upgrade_url":"/plans"}}}
```
- 앱은 `error_code`·`used_bytes`·`limit_bytes`만 쓴다. `message`(한국어 고정)·`upgrade_url`(레거시)은 무시한다.

재생성 제한 — `POST /media/{id}/generate-diary`

```json
HTTP 403
{"detail":{"code":"PLUS_REQUIRED","feature":"diary_regeneration","trace_id":"…"}}
```

### 2.3 RC 래퍼 확장: `src/services/purchases.ts` (RC import 단일 지점 유지)

```ts
export type PaywallPlanKind = 'annual' | 'monthly';

export type PaywallPlanOffer = {
  priceString: string;                 // 스토어 문자열 그대로
  perMonthPriceString: string | null;  // 연간만. SDK 제공값이 없으면 null(자체 계산 금지)
  trial: { eligible: boolean | null; days: number | null }; // null = 확인 불가
};

export type PaywallOffer = {
  annual: PaywallPlanOffer;
  monthly: PaywallPlanOffer;
  annualDiscountPercent: number | null; // floor((월×12 − 연) / (월×12) × 100), 통화 다르거나 ≤0이면 null
};

export type PaywallOfferResult =
  | { status: 'ok'; offer: PaywallOffer }
  | { status: 'unavailable' }   // 미구성·패키지 0개
  | { status: 'load_failed' };  // 예외·시간 초과

loadPaywallOffer(): Promise<PaywallOfferResult>
openSubscriptionManagement(): Promise<'opened' | 'unavailable'>
```

- 체험 자격: iOS = `checkTrialOrIntroductoryPriceEligibility`(ELIGIBLE만 `true`, INELIGIBLE `false`, 그 외 `null`) / Android = `defaultOption.freePhase` 존재 여부(`true`/`false`). 체험 일수는 스토어 상품의 체험 기간이 일·주 단위일 때만 일수로 바꾼다. 월·년 단위면 `days = null`이고 숫자 없는 문구(`paywall.ctaTrialGeneric`, `plusSheet.trialNoteGeneric`)를 쓴다.
- `annualDiscountPercent`·체험 일수 계산은 RC 타입에 의존하지 않는 순수 함수로 분리한다(`src/services/paywallOffer.ts`).
- `loadPaywallOffer`는 시간 제한을 둔다: `PAYWALL_OFFER_TIMEOUT_MS`(`src/constants/plus.ts`).
- `openSubscriptionManagement`: iOS `showManageSubscriptions()` → 실패 시 `managementURL` → 실패 시 `'unavailable'`. Android `managementURL`. 스토어 URL을 코드에 직접 쓰지 않는다.
- 같은 diff(D3)에서 `captureError`에 `tags` 옵션을 추가하고(`captureMessage`와 같은 방식), `refreshUser`에 호출별 시간 제한을 넣는다(W-REFRESHUSER-TIMEOUT 종결).
- 기존 `loadPaywallOffer` 반환형이 바뀌므로 호출처(`paywall.tsx`)를 같은 diff에서 맞춘다.

D5-b 추가 (PW-14·PW-15):

```ts
purchasePaywallPlan(kind, serverUserId, source): Promise<'completed' | 'cancelled' | 'failed' | 'identity_mismatch' | 'already_owned'>
restorePaywallPurchases(serverUserId): Promise<'restored-active' | 'restored-none' | 'failed' | 'identity_mismatch'>
retryPurchasesIdentity(): void   // _layout 모듈 최상위 AppState 'active' 리스너
```

- 신원 대조 판정은 순수 함수(`purchasesIdentity.ts`의 `verifyPurchaseIdentity`·`runWithVerifiedIdentity`·`normalizeAppUserId`·`shouldRetryIdentity`)로 분리한다. 차단이면 `purchasePackage`·`restorePurchases`를 부르지 않는다.
- 정규화: 서버 웹훅 매핑(`uuid.UUID` 파싱)과 같게 — 대소문자 무시, 공백은 무시하지 않음(서버도 매핑 못 하므로 "다름"이 맞고, 재 `logIn`이 교정한다), 빈 값은 "없음".
- RC 미설정(`configured=false`): 대조 없이 기존대로 구매 `failed`·복원 `failed`. 서버 `user.id` 없음(비로그인): `no_server_user`로 SDK 호출 없이 차단.
- 월 환산(`perMonthPriceString`): 플랫폼 SDK의 반올림 차이로 월 환산이 1원 다를 수 있음(Android ₩3,666 / iOS ₩3,667). 자체 계산 금지 원칙 유지(W-PAYWALL-PERMONTH-ROUNDING, 2026-10-14 현행 유지로 종결).
- 복원 흐름(D6-0): 순수 함수 `runPlusRestore`(`src/utils/plusRestoreFlow.ts`) + 훅 `usePlusRestore(source)`(`src/hooks/usePlusRestore.ts`). 래퍼 복원(신원 대조) → 결과 분기 → 활성 구독이면 반영 확인. 결과 `identity_mismatch`·`failed`·`restored-none`·`reflected`·`not-reflected`에 따른 안내·이동은 화면 몫.
- 오류 분류(D5-c, `purchaseErrors.ts`의 `classifyPurchaseError`): 사용자 취소·`PURCHASE_CANCELLED_ERROR` → `cancelled` / `PRODUCT_ALREADY_PURCHASED_ERROR` → `already_owned` / 그 외 → `failed`. 영수증이 다른 사용자에 묶인 계열(`RECEIPT_ALREADY_IN_USE_ERROR`·`RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR`)은 `failed`를 유지하고 Sentry tag `reason=receipt_in_use`로만 구분한다. 코드는 숫자 리터럴이 아니라 SDK `PURCHASES_ERROR_CODE`를 넘긴다.
- 활성 구독 판단(`purchasesRestore.ts`의 `hasActiveSubscription`): `activeSubscriptions` 또는 `entitlements.active`가 하나라도 있으면 활성.

### 2.4 상수: `src/constants/plus.ts` (신규)

`FREE_STORAGE_GB`, `PLUS_STORAGE_GB`, `PAYWALL_OFFER_TIMEOUT_MS`, `PLUS_REFLECT_INTERVAL_MS`(2초), `PLUS_REFLECT_MAX_WAIT_MS`(30초), `PLUS_REFLECT_ATTEMPT_TIMEOUT_MS`(5초), `PLUS_REFLECT_LONG_AFTER_MS`(10초). 값은 diff 보고에서 제안 → JJ 확정(반영 확인 4개는 2026-10-13 확정, 구 `PLUS_REFLECT_RETRY_COUNT` 삭제).

- 반영 확인은 **마감 시각 기준**: 시도는 2초마다 시작, 시도별 제한 5초(마지막 시도는 남은 시간으로 자름), 전체 ≤ 30초. 근거 = 구매→첫 웹훅 지연 실측 5.8 / 14.3 / 17.4 / 6.6초(2026-10-12~13)의 약 1.7배.
- 완료 화면 "반영 중" 주기 재확인(D5-b-4): `PLUS_PENDING_RECHECK_INTERVAL_MS`(5초), `PLUS_PENDING_RECHECK_MAX_MS`(2분, 앱이 앞에 있는 동안 쓴 시간만 셈). 시도별 제한은 `PLUS_REFLECT_ATTEMPT_TIMEOUT_MS` 재사용. 같은 `waitForPlusReflected`에 `shouldContinue`로 중단 조건을 넘긴다.

---

## 3. 화면 명세

공통: 진입 경로는 `/paywall?source=settings|regen|storage`. `source`는 기록용이고 화면은 같다.

### 3.1 결제 화면 — `app/paywall.tsx` (시안 `01-paywall.png`)

| 상태 | 조건 | 표시 |
|---|---|---|
| 로딩 | 상품 조회 중 | 헤더(닫기·복원)와 제목은 즉시, 플랜 카드 자리에 스피너 |
| 정상·체험 가능 | `ok`, 선택 플랜 `trial.eligible === true` | 시안 그대로. 버튼 `ctaTrial`, "오늘은 결제되지 않아요", 고지 `disclosureTrial*` |
| 정상·체험 없음/불명 | `eligible`이 `false` 또는 `null` | 버튼 `ctaSubscribe`, "오늘은 결제되지 않아요" 줄 없음, 고지 `disclosure*` |
| 상품 없음 | `unavailable` | `paywall.unavailable` + 다시 시도 |
| 조회 실패 | `load_failed` | `paywall.loadFailed` + 다시 시도 |
| 구매 중 | 구매·복원 진행 | 버튼 스피너, 플랜 카드·닫기·복원 비활성, 뒤로가기 차단 |
| 반영 확인 중 | 구매 `completed`·복원 `restored-active` 후 | 구매 중과 같은 잠금 + 버튼 아래 `paywall.reflecting` → 10초 뒤 `paywall.reflectingLong`. 완료 화면으로 넘어갈 때까지 표시를 고정(재조회로 plus가 돼도 "이용 중" 카드로 바뀌지 않음) |
| 신원 불일치 | 구매·복원 `identity_mismatch` | `paywall.identityMismatch` 안내, 화면 유지(구매 시트는 뜨지 않음) |
| 이미 구독 중 | 구매 `already_owned` | 잠금이 풀린 뒤 대화상자: 제목 `paywall.alreadyOwnedTitle`, 본문 `paywall.alreadyOwned`(`{{store}}` = `subscription.storeApple`/`storeGoogle`), 버튼 [구매 복원](`paywall.restore`) / [닫기](`paywall.close`). 구매 복원 → 복원 흐름을 새 잠금으로 시작 |
| 이미 Plus | `user.plan === 'plus'` | 결제 UI 없이 `/subscription`으로 `replace`(D6-2). 반영 확인 중·잠금 중에는 하지 않는다(`shouldRedirectToSubscription`) — 구매·복원 직후 이동은 각 흐름이 정한다. "이용 중" 카드는 이동 전 대체 표시 |

- 연간이 기본 선택. 할인 배지는 `annualDiscountPercent !== null`일 때만, "월 ○꼴"은 `perMonthPriceString !== null`일 때만 표시한다.
- 비교표 3행은 고정 문구. 용량 숫자는 `FREE_STORAGE_GB`·`PLUS_STORAGE_GB`를 끼워 넣는다.
- 약관·개인정보처리방침 주소는 상수로 뽑아 `app/app-info.tsx`와 같이 쓴다(새 URL 0건, 여는 방식은 현행과 동일).
- 고지문은 선택한 플랜에 따라 바뀐다. 가격은 `priceString`만 쓴다.

구매 흐름

1. 버튼 탭 → `purchasePaywallPlan(kind, user.id)`. 진행 중 재탭 무시(중복 방지). 래퍼가 신원 대조(PW-15) 후에만 구매 시트를 띄운다 — 차단이면 `identity_mismatch`.
2. `cancelled` → 아무 표시 없이 정상 상태로 복귀.
3. `failed` → `paywall.failed` 안내, 화면 유지.
3-1. `already_owned` → 잠금 해제 후 "이미 구독 중" 대화상자(PW-16). [구매 복원]이면 아래 복원 흐름 그대로(신원 대조·PW-14·완료 화면). 결과 뒤 처리는 순수 함수 `resolvePurchaseFollowUp`.
4. `completed` → 반영 확인(§2.4, 최대 30초, 대기 문구 표시) → `/plus-success`로 `replace`(params: `kind`, `trial`, `price`, `reflected`).

복원(PW-14): `restorePaywallPurchases(user.id)` →
- `identity_mismatch` → `paywall.identityMismatch` / `failed` → `paywall.failed`
- `restored-none` → 즉시 `paywall.restoreNone`
- `restored-active` → 반영 확인(구매와 같은 상수·문구) → 반영되면 **`/subscription?restored=1`**(상단 `subscription.restored` 1회, D6-2), 30초 안에 안 되면 `/plus-success?restore=1`(반영 중 + 복원 확인 안내). 이동처는 `restoreExitTarget`.

잠금 구간 예상 밖 오류(D5-b-5): 구매·복원 잠금(`runLocked`)은 오류에도 항상 풀린다. 처리는 진행 단계로 정한다(순수 함수 `resolveLockedErrorAction`).
- 스토어 거래 완료 전 → `paywall.failed` 안내, 화면 유지.
- 구매 `completed` 뒤 → 실패 안내 대신 `/plus-success` 반영 중(`reflected=0`) — "실패"를 보고 다시 결제하는 일을 막는다.
- 복원 `restored-active` 뒤 → `/plus-success?restore=1`.
- 완료 화면으로 넘어가지 않은 채 잠금이 풀리면 반영 확인 단계를 `idle`로 되돌린다(정상 경로의 "넘어갈 때까지 고정"은 유지).

### 3.2 구독 시작 완료 — `app/plus-success.tsx` (신규, 시안 `03-success.png`)

| 변형 | 조건 | 표 내용 |
|---|---|---|
| 체험 시작 | `reflected && trial` | 플랜 / 무료 체험 종료 = `plan_expires_at` / 첫 결제 = `plan_expires_at` · `price` + 체험 해지 안내 |
| 바로 결제 | `reflected && !trial` | 플랜 / 다음 결제 = `plan_expires_at` · `price` |
| 반영 중 | `!reflected && !plus`, 또는 `restore=1 && !plus` | 표 없음. 시계 아이콘, 제목 `plusSuccess.pendingTitle`, 본문 `plusSuccess.pending`. 버튼 "구매 복원"(`plusSuccess.restore`, 주 버튼) + "닫기"(`plusSuccess.close`, 홈으로 `replace`). 진입 시 1회 + 앱 복귀(AppState active)마다 1회 재조회, plus가 확인되면 반영 변형으로 바뀐다 |

- 반영 중 주기 재확인(D5-b-4): 5초마다 `/auth/me` 재조회, 최대 2분. 중단 = plus 확인 / 화면 이탈 / 앱 백그라운드 / 복원 진행 중(`restoring`, 복원의 반영 확인 루프와 겹치지 않게 — 복원이 끝나면 남은 시간으로 다시 시작) / 시간 소진. 앱 복귀 때는 남은 시간이 있으면 주기 재확인을 이어 가고(첫 시도가 곧 복귀 1회 재조회), 없으면 1회만 재조회. 실패한 재조회는 기록하지 않는다. 판정은 순수 함수 `shouldPendingRecheck`·`remainingRecheckMs`.
- 반영 중 화면의 복원은 전체를 try/catch/finally 로 감싼다 — 예상 밖 throw 에도 `restoring`에 남지 않고 `restore-failed`, `captureError` scope `plusSuccess.restore`.
- 반영 중 화면의 복원 단계(표시 모델 `buildPlusPendingVM`): `idle`(안내 없음) / `restoring`(버튼 스피너·닫기 잠금) / `restore-checked`(`plusSuccess.restoreChecked`) / `restore-none`(`paywall.restoreNone`) / `restore-failed`(`plusSuccess.restoreFailed`) / `identity-mismatch`(`plusSuccess.identityMismatch`). 복원 규칙은 PW-14와 같다. `restore=1`로 들어오면 `restore-checked`부터.
- 날짜는 앱의 기존 날짜 표시 유틸·로케일을 따른다.
- "기록하러 가기" → 홈으로 `replace`(뒤로가기로 결제 화면에 돌아가지 않게). "구독 관리 보기" → `/subscription`으로 `replace`(D6-2 — 뒤로가기가 완료 화면·결제 화면으로 돌아가지 않는다).

### 3.3 설정 구독 화면 — `app/subscription.tsx` (D6-1, 시안 `04-subscription-settings.png`)

진입: 설정 Section 1 맨 위 "구독" 행(`settings.subscriptionRow`) · 더보기 저장 공간 카드(D6-2) · 완료 화면 "구독 관리 보기"(D6-2) · 결제 화면의 이미 Plus(D6-2) · 결제 화면 복원 성공(D6-2).

표시는 순수 함수 `buildSubscriptionVM`(`src/utils/subscriptionViewModel.ts`). 입력 = `/auth/me`의 `plan`·`plan_status`·`plan_store`·`plan_expires_at`(PW-1) + `/users/storage` + 기기 스토어 + 상품 조회 결과(무료일 때만).

| 상태 | 조건 | 현재 플랜 아래 | Plus 카드 |
|---|---|---|---|
| 무료 | `plan !== 'plus'` | 없음 | 있음(`paywall.brand`·`paywall.subhead`, 가격 줄 `subscription.plusCardPrice`는 상품 조회 성공 시에만, 버튼 `subscription.cta` → `/paywall?source=settings`) |
| 이용 중 | plus + `active` | `subscription.renewsOn` | 없음 |
| 해지 예약 | plus + `cancelled` | `subscription.cancelledUntil` | 없음 |
| 결제 확인 필요 | plus + `grace` | `subscription.graceNotice` + `paywall.activeUntil` | 없음 |
| 상태 불명 | plus + `null`·없음·`expired`(여유 시간 안)·알 수 없는 값 | 날짜만(`paywall.activeUntil`) | 없음 |

- 날짜는 `formatLongDate`. 날짜가 없거나 변환에 실패하면 날짜 줄을 생략한다.
- 체험 중 여부·월간/연간 구분은 `/auth/me`에 없어 표시하지 않는다(W-AUTHME-PERIOD-FIELDS, Build 34 제외).
- 저장 공간 막대는 `/users/storage` 값(`subscription.usage`). 불러오는 중·실패면 막대 영역을 숨긴다(오류 alert 없음).
- 행: 구매 복원(`paywall.restore`) · 스토어에서 구독 관리(`subscription.manage`, 조건부) · 이용약관 · 개인정보처리방침. 하단 `subscription.footnote`.
- **스토어에서 구독 관리 표시 조건**: `plan === 'plus' && (plan_store == null || plan_store === 기기 스토어)`. 무료·다른 스토어는 숨긴다. 열지 못하면(`'unavailable'`) `subscription.manageUnavailable`.
- **다른 스토어**: plus이고 `plan_store`가 기기 스토어와 다르면 관리 행 대신 `subscription.otherStore`(`{{store}}` = `subscription.storeApple`/`storeGoogle`)를 행 아래에 보인다.
- 구매 복원: `usePlusRestore`(결제 화면과 같은 흐름, PW-14·PW-15). `identity_mismatch` → `paywall.identityMismatch` / `failed` → `paywall.failed` / `restored-none` → `paywall.restoreNone` / `not-reflected` → `paywall.restoreChecked` / `reflected` → `/auth/me`가 plus로 바뀌어 Plus 상태로 다시 그린다. 진행 중 행 스피너, 예상 밖 오류는 `captureError` scope `subscription.restore`.
- 진입할 때마다 `/auth/me`·저장 공간을 다시 읽는다. 무료일 때만 상품을 조회한다.
- 복원 안내(D6-2): `?restored=1`로 들어오면 상단에 `subscription.restored`를 보이고 파라미터는 바로 지운다(다시 들어와도 반복하지 않음). 이 화면의 구매 복원이 `reflected`여도 같은 안내.
- 뒤로가기: 일반 스택. 완료 화면에서 `replace`로 오면(결제 화면 → 완료 화면 → 구독 화면이 모두 replace) 뒤로가기는 결제 화면을 연 화면으로 돌아간다.
- 관측: breadcrumb `paywall` / `subscription` + `plan`.
- 동반 수정(완료): `StorageUsageBar`의 `PLAN_KEYS` 정리(D6-a `planBadge.ts`), `User` 타입 `plan_status?`·`plan_store?`(D2).
- 표기 정리(D6-3): 마이페이지 플랜 = `/auth/me` `plan`(`resolvePlanBadge`, PW-1), 용량 = `/users/storage`(`storageStore`, 더보기 카드와 같은 스켈레톤). `/auth/me/stats`의 `storage_plan`·`storage_limit_bytes`(레거시 `users` 컬럼, 웹훅이 갱신하지 않음)는 읽지 않는다. "지금은 모든 기능을 무료로 제공하고 있어요"(`storage.freeNotice`)와 더보기 카드의 업그레이드 버튼(`onUpgrade`·`storage.upgrade`)은 삭제 — PW-12로 심사 전 게이트가 켜지면 사실이 아니게 된다.

### 3.4 Plus 안내 시트 — `src/components/plus/PlusUpsellSheet.tsx` (신규, 시안 `02`, `05`)

`variant: 'regen' | 'storage'` 하나의 컴포넌트. 버튼: "Plus 알아보기" → 시트 닫고 `/paywall?source=…` / "다음에 할게요" → 닫기.

**재생성 제한(`regen`)** — `app/media/[id].tsx`

- `REGEN_PLUS_GATE` 지역 상수와 "곧 만나요" alert를 제거한다.
- 판정 순서: ① 복구 재생성(`isDiaryFailed`) → 현행대로 통과 ② `user.plan !== 'plus'` → 시트 ③ 그 외 → 재생성 요청.
- 서버가 403 `PLUS_REQUIRED`를 주면: `refreshUser()` 후 시트를 연다. 오류 alert와 Sentry error는 남기지 않는다(breadcrumb만).
- 체험 안내 줄은 상품 조회가 끝나 `eligible === true`일 때만 나타난다. 조회를 기다리느라 시트를 늦게 띄우지 않는다.

**용량 초과(`storage`)** — `src/hooks/useImageUpload.ts`의 세 경로(단일·그룹·그룹 추가)

- 413 `STORAGE_QUOTA_EXCEEDED` 수신 → 남은 항목 업로드 중단 → 큐 정리(4장) → 시트.
- 막대와 숫자는 413 본문 값. 본문에 값이 없으면 숫자 줄을 숨긴다.
- 이미 Plus인 사용자: 제목은 같고 본문 `plusSheet.storageBodyPlus`, 버튼은 "확인" 하나.
- 백그라운드 재시도(`resumeUploads`)에서 받은 413은 시트를 띄우지 않고 큐 정리만 한다.

---

## 4. 선결 수리: B-UPLOAD-FAIL-AS-PENDING

| 분류 | 조건(HTTP 상태 기준, 메시지 문자열 판별 금지) | 처리 |
|---|---|---|
| `transient` | 응답 없음(API) · S3 PUT 응답 없음 중 NetInfo가 오프라인을 확인한 경우 · 5xx(S3 포함) · 408 · 429 · 로컬 타이머 시간 초과 · S3 403(서명 만료 → 재발급 후 재시도) | 현행 재시도 |
| `auth` | 401 · 403 `CONSENT_REQUIRED` | 재시도 횟수를 올리지 않고 대기 유지 |
| `quota` | 413 + `STORAGE_QUOTA_EXCEEDED` | 재시도 대상·대기 건수에서 즉시 제외 |
| `rejected` | 그 밖의 4xx(S3 포함) | 재시도 대상·대기 건수에서 즉시 제외. 기록은 warning 1건만(큐에 올라간 작업이면 기존 `captureError` 생략, 화면 alert는 유지) |
| `oversize` | 크기 사전 검사 초과(단일 경로 `file_too_large`, 그룹·그룹 추가 경로의 크기 초과 throw) | 즉시 제외. breadcrumb만(warning·`captureError` 없음). 묶음 규칙에서는 `rejected`와 같은 취급 |
| `local` | HTTP 응답이 아닌 실패(사본 없음, 응답 형식 오류 등) · S3 PUT 응답 없음 중 온라인이거나 판별 불가(`isConnected` null·NetInfo 조회 실패) · 서명 재발급 후에도 S3 403 | 현행 유지(재시도 횟수 +1, 5회 상한) |

- 분류는 순수 함수 `classifyUploadFailure(error)`(신규 `src/utils/uploadFailure.ts`)로 만들고, `isTransientUploadError`의 문자열 판별을 대체한다.
- 세 업로드 경로 모두 **분류 → 큐 반영** 순서로 통일한다(지금은 그룹 경로가 `markFailed`를 먼저 호출).
- 큐에서 빼는 방식은 삭제다: `discardJob(jobId)`를 추가하고 `markDone`과 정리 코드를 공유한다(manifest 항목 삭제 + 로컬 사본 삭제).
- S3 PUT 실패는 상태 코드를 담은 오류 클래스로 던진다(`src/api/upload.ts`). 오류 메시지 문자열은 바꾸지 않는다.
- 사진 여러 장이 든 작업의 처리: ① `quota`가 하나라도 있으면 작업 전체를 버린다 ② 남은 실패에 `transient`·`auth`·`local`이 있으면 보존한다 ③ 남은 실패가 전부 `rejected`·`oversize`일 때만 버린다(`rejected`가 하나라도 있으면 warning 대상).
- 재개도 single 작업은 사진별로 실패를 모아 작업 단위로 판정한다(용량 초과에서 중단). 그룹·추가는 첫 실패에서 중단(현행).
- 재시도 5회를 넘긴 작업의 정리는 이 diff의 범위 밖이다.
- 로컬 원인 실패(파일 없음 등 HTTP 응답이 아닌 것)는 현행 유지하고, 종류를 diff 보고에 나열한다.
- 확인: 413 직후 홈 "업로드 대기 중" 배너가 뜨지 않는다.

---

## 5. 문구

- 키와 4개 언어 값은 `copy/{ko,en,vi,th}.json`. 기존 로케일 파일에 병합한다(기존 `paywall.*` 10개 키는 유지).
- 보간 문법은 기존 키(`paywall.activeUntil`)와 같은 방식을 쓴다. 파일의 `{{name}}` 표기가 다르면 맞춰 바꾼다.
- `t()`는 런타임 호출만. 모듈 스코프에서 미리 평가하지 않는다.
- 금지 표현: "AI 일기·검색 무제한". 검색은 Plus 혜택이 아니다.
- 값이 영어와 같은 키(`paywall.brand`, `paywall.compare.plus`, 스토어 이름)는 의도적 영어 유지 목록에 등록한다. 목록(v1.6): `paywall.brand` · `paywall.compare.plus` · `subscription.planPlus` · `subscription.storeApple`(App Store) · `subscription.storeGoogle`(Google Play) · `storage.planFree`(ko·th 배지 "Free" — 더보기 카드·마이페이지 플랜 표기, D6-a·D6-3). `paywall.alreadyOwned`의 `{{store}}`는 이 스토어 이름 키 값을 끼워 넣는다.
- vi·th는 초안이다. 병합 후 표로 뽑아 JJ 검수를 받는다.
- v1.5(D5-b): copy 72키 → **81키**. 추가 9개 = `paywall.reflecting`·`reflectingLong`·`identityMismatch`, `plusSuccess.pendingTitle`·`restore`·`close`·`restoreChecked`·`restoreFailed`·`identityMismatch`. 값 변경 1개 = `plusSuccess.pending`. vi·th 9개는 D9 검수 대상.
- v1.6(D6-2): 83키 → **84키**. 추가 1개 = `subscription.restored`. 삭제(D6-3) = `storage.freeNotice`·`storage.upgrade`(로케일만, copy 묶음 밖이라 84키 계산에 영향 없음).
- v1.5(D5-c): 81키 → **83키**. 추가 2개 = `paywall.alreadyOwnedTitle`·`paywall.alreadyOwned`. en·vi·th 초안, D9 검수 대상.

---

## 6. 관측

| 지점 | 기록 |
|---|---|
| 결제 화면 진입 | breadcrumb `paywall` / `view` + `source` |
| 상품 조회 결과 | breadcrumb `offer` + `status` |
| 구매 시작·결과 | breadcrumb `purchase` + `kind` + 결과 |
| 구매 `failed` | `captureError`, tags `area: 'paywall'`, `kind`, `source`, `reason`(`receipt_in_use`/`other`) |
| 구매 `already_owned` | `captureMessage` **info**(알림 없음), fingerprint `['purchases-already-owned']`, tags `area`·`stage`(purchase)·`store`(apple·google). 사용자 상황이지 오류가 아니다 |
| 복원 `failed` | `captureError` scope `purchases.restore`, tags `area`·`stage`(restore)·`reason` |
| 이미 구독 중 대화상자 선택 | breadcrumb `already-owned` + `choice`(restore·close) |
| 업로드를 `rejected`로 버림 | `captureMessage` warning, fingerprint `upload-rejected`, tags 상태 코드·경로 종류. 파일명·사용자 식별값 금지 |
| 업로드를 `quota`·`oversize`로 버림 | breadcrumb만 |
| 결제 완료 후 미반영 | `captureMessage` warning, fingerprint `paywall-reflect-timeout` |
| 복원(활성 구독 있음) 후 미반영 | `captureMessage` warning, fingerprint `paywall-restore-reflect-timeout`, tags `source`(결제 화면 source 또는 `plus-success`) |
| 복원 결과 | breadcrumb `restore` + `outcome` |
| 신원 대조 차단 | `captureMessage` warning `purchases identity mismatch`, fingerprint `['purchases-identity-mismatch', reason]`, tags `area`·`stage`(purchase·restore)·`reason`(`relogin_failed` = 재 logIn 네트워크 등 실패 / `id_mismatch` = logIn 후에도 다름 / `no_server_user`), extra `rcAnonymous`·`reloginCode`. id 값 금지 |
| 결제 화면 잠금 구간 예상 밖 오류 | `captureError` scope `paywall.locked`, extra `stage`(`before-completion`·`purchase-completed`·`restore-active`), tags `area`·`source`. 식별값 금지 |
| 앱 복귀 logIn 재시도 실패 | `captureError` scope `purchases.identity`, `transition: 'retry'` |
| 403 `PLUS_REQUIRED`, 413 용량 초과 | breadcrumb만(오류 아님) |
| 상품 `unavailable` (production) | `captureMessage` warning — 스토어·RC 설정 이상 신호 |

이메일·사용자 ID·영수증·토큰은 어떤 기록에도 싣지 않는다.

---

## 7. 테스트

| 종류 | 대상 | 케이스 |
|---|---|---|
| 단위 | `paywallOffer.ts` | 할인율(KRW 33 / VND 32 / THB 36), 통화 불일치 → null, 연간이 더 비쌈 → null, 체험 일수 변환 |
| 단위 | `uploadFailure.ts` | 응답 없음·500·408·429·401·403 CONSENT·413 quota·413 기타·400·422 |
| 단위 | 큐 | quota·rejected 후 `listResumable`·`pendingCount`에서 제외, transient는 유지, auth는 횟수 불변 |
| 단위 | 재생성 판정 | 복구 재생성 통과 / 무료 → 시트 / Plus → 요청 / 403 → 시트·alert 없음 |
| 단위 | 결제 화면 표시 모델(순수 함수) | 6개 상태, 체험 가능·없음·불명·일수 불명의 버튼·고지 문구, 구매 중 닫기 차단. 렌더는 실기 스크린샷으로 확인 |
| 단위 | 구독 화면 표시 모델(`buildSubscriptionVM`) | 무료(상품 조회 성공·전·없음·실패), active·cancelled·grace·불명(null·expired·알 수 없음), 날짜 없음·변환 실패, 관리 행 조건·다른 스토어 6조합, 저장 공간 숨김·0~100 고정. 렌더는 실기 스크린샷으로 확인 |
| 단위 | 구독 화면 이동(D6-2) | 이미 Plus 이동 조건(반영 확인 중·잠금·무료·미인증 제외), 복원 결과 이동처, `restored` 파라미터 |
| 단위 | 복원 흐름(`runPlusRestore`) | 5개 결과, 기록 순서(breadcrumb·진행 단계·warning) |
| 통합 | 백엔드 `/auth/me` | 2.1의 케이스 |
| 시나리오 | 용량 초과 | prepare 413 → 시트 표시 → 대기 배너 없음 → "Plus 알아보기" → 결제 화면 |
| 단위 | 반영 확인(`plusReflect.ts`) | 실측 지연 4건 30초 안 확인, 끝까지 미반영 15회·≤30초, 시도별 5초·마지막 자르기, throw = 미반영 |
| 단위 | 결제 화면 표시 모델 | 반영 확인 단계 문구·잠금, 단계 중 plus 고정 |
| 단위 | 완료 화면 표시 모델 | 반영 중 6단계, `restore=1` 진입, plus 확인 시 반영 변형, 주기 재확인 계속/중단 판정(restoring 정지·백그라운드·이탈·시간 소진)·남은 시간 |
| 단위 | 반영 확인 중단(`shouldContinue`) | 처음부터 중단 → 시도 0, 도중 중단, 5초·2분 = 24회 |
| 단위 | 신원 대조(`purchasesIdentity.ts`) | 정규화(대소문자·공백·빈 값), 일치·익명·다른 id·조회 실패, relogin_failed vs id_mismatch, 비로그인 SDK 호출 0, 차단 시 스토어 호출 0, 복귀 재시도 판정 |
| 단위 | 활성 구독 판단(`purchasesRestore.ts`) | 구독·entitlement·빈 값·누락 |
| 단위 | 오류 분류(`purchaseErrors.ts`) | 취소 2종 → cancelled, 이미 구매 → already_owned, 영수증 사용 중 2종 → failed(+reason), 알 수 없는 코드·코드 없음·null → failed |
| 단위 | 구매 결과 뒤 처리 | 5개 결과 → none·alert-failed·alert-identity·offer-restore·reflect, 대화상자 스토어 이름(iOS/그 외) |
| 시나리오 | 구매 완료 | completed → 대기 문구 → 재조회 후 plus → 완료 화면(체험) / 30초 미반영 → 반영 중 변형 → (아무것도 누르지 않아도) 주기 재확인으로 반영 변형 / 구매 복원 |

품질 게이트: `tsc --noEmit` 0 · `jest` 전부 통과(기준선 **40 suites / 538 tests**(2026-10-13, D5-b-4)에서 증가만. 구 기준선 28 / 291 은 v1.4 작성 시점). eslint는 부재(W-LINT-ABSENT). 백엔드는 black·ruff·pytest.

---

## 8. 구현 순서 (1 issue = 1 diff = 게이트)

| # | diff | 리포 | 실기 확인 |
|---|---|---|---|
| D1 | B-UPLOAD-FAIL-AS-PENDING (4장) | app | — |
| D2 | `/auth/me` `plan_status`·`plan_store` | backend | D2-b와 같은 배포 |
| D2-b | 만료 판정 통일 + 여유 시간(PW-13) | backend | 배포 후 만료된 샌드박스 행으로 `/auth/me` 확인 |
| D3 | RC 래퍼 확장 + `paywallOffer.ts` + 상수 | app | — |
| D4 | 결제 화면 본체 | app | dev build, iOS·Android 각 1회 |
| D5 | 구독 시작 완료 화면 | app | 샌드박스 구매 1회 |
| D5-b | 반영 확인 30초(D5-b-1) → 신원 대조(D5-b-3) → 미반영 화면·복원 규칙(D5-b-2) | app | 샌드박스 구매·복원, 비행기 모드 미반영 |
| D5-c | 이미 구독 중 안내(PW-16): `already_owned` 분류 + [구매 복원]/[닫기] 대화상자 + Sentry info | app | Android 같은 Play 계정·다른 앱 계정 구매 → 복원 / iOS 같은 상황 |
| D6-a | 진입점 ① 선행: 더보기 저장 공간 카드 전체 탭 → `/paywall?source=settings`(무료·Plus 모두, D6에서 `/subscription`으로 교체) + 배지를 `/auth/me` plan 기준으로(PW-1, `planBadge.ts`) | app | Android 실기 결제 시험 진입 |
| D6-3 | 표기 정리: 마이페이지 플랜·용량 출처, 무료 안내 문구·업그레이드 버튼 삭제 | app | 무료·Plus 마이페이지·더보기 |
| D6-0 | 복원 흐름 분리(`usePlusRestore`·`runPlusRestore`), 동작 변경 0 | app | — |
| D6-1 | 설정 구독 화면(`buildSubscriptionVM`) + 설정 "구독" 행 | app | 무료·Plus·다른 스토어 각 1회 |
| D6-2 | 진입점 정리: 더보기 카드·완료 화면 "구독 관리 보기"·결제 화면 이미 Plus·복원 성공 → `/subscription` | app | 각 진입 1회 + 뒤로가기 |
| D6 | (D6-a·D6-0~3으로 분할) 설정 구독 화면 + 진입점 ① | app | 무료·Plus 각 1회 |
| D7 | 안내 시트 + 재생성 진입점 ② | app | 무료 계정 1회 |
| D8 | 용량 초과 진입점 ⑤ | app | 한도 근처 계정 1회 |
| D9 | 레거시 `plans` 정리 + vi·th 검수 반영 | app | — |

### 8.2 운영 절차 (코드 diff 아님, 각각 게이트)

| 순서 | 작업 | 조건 |
|---|---|---|
| S1 | 측정 ① — **완료**: 운영 OTA 커밋 `a4c37c7`에 재생성 앱 차단이 있음(`app/media/[id].tsx:742,746`). 2026-07-09 `3efcbbc`부터 계속 켜져 있었음 | — |
| S2 | 측정 ② — **완료**: 9/24~10/8(15일) `generate-diary` 요청 0건(같은 로그에 다른 API 요청은 있음) | — |
| S3 | 측정 ③ — **완료**: `subscriptions.environment`로 샌드박스 구분 가능. 저장된 `store` 값은 `google` 1건, 코드 매핑은 `apple`·`google`. 갱신 알림은 만료 시각 기준 App Store −46~0초, Play +37초 | — |
| S4 | API 배포(D2 + D2-b) — `.env`에 `RC_ACCEPT_SANDBOX_EVENTS=true`, `PLAN_EXPIRY_GRACE_SECONDS` 동반 | §4.1 순서, 롤백 태그, 디스크 8GB 이상 |
| S5 | `PLUS_GATE_ENABLED=true` | S1·S2 결과를 JJ가 확인한 뒤. 켠 직후 표시·집행 용량 일치 실측(W-QUOTA-DISPLAY-GATE 종결 확인) |
| S6 | Build 34 심사 제출 → 승인 → 수동 출시 | S5 완료 후 |

S1·S2 결과로 S5의 선행 조건은 충족됐다.

각 diff 보고: 변경 파일 목록 → diff 전문 → 테스트 → 게이트 결과 → (화면 diff는) 실기 스크린샷. 커밋은 승인 후, `git add`는 파일 단위.

---

## 9. 가정·열린 이슈

가정

- A1. `react-native-purchases` 10.10.1의 `StoreProduct`가 월 환산 가격 문자열을 준다. 없으면 "월 ○꼴" 줄을 생략한다(D3에서 타입 정의 인용으로 확인).
- A2. 체험 중 `plan_expires_at`은 체험 종료 시각이다(9/28 Play TRIAL 실측과 일치, iOS는 미실측).
- A3. `subscriptions.store` 저장값은 스토어당 하나다(D2에서 SSH 실측).

판정 완료 (2026-10-08 JJ)

- 샌드박스 수신은 상시 켬 → PW-11.
- 게이트는 심사 제출 전에 켬 → PW-12.
- 만료 표시는 Build 34 전에 수리 → PW-13, D2-b.

열린 이슈

- O1. (종결) 샌드박스 행은 `subscriptions.environment`로 가린다.
- O2. `PLAN_EXPIRY_GRACE_SECONDS` 값: 실측 지연은 1분 이내. 배포·장애 중 재전송까지 덮도록 3600(1시간)을 제안, JJ 확정 대기.
- O3. (종결) 구버전 앱의 재생성 요청은 15일간 0건.
- O4. 강조색: 시안의 코랄을 앱의 어떤 테마 토큰에 대응시킬지는 D4 보고에서 CC가 후보를 제시한다.
- O5. 다크 모드: 시안은 라이트만 있다. 앱이 다크 모드를 지원하면 기존 토큰으로 따라간다.
