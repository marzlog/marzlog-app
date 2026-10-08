# Marzlog Plus 결제 화면(PAYWALL) 구현 명세서

- 판: v1.4 (2026-10-08, PW-11~13 + 게이트 2 판정·측정 S1~S3 + D1 보정 3건 + 재개 single 사진별 판정 반영) · 대상: Build 34 (marzlog-app 1.0.3, develop)
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

### 2.4 상수: `src/constants/plus.ts` (신규)

`FREE_STORAGE_GB`, `PLUS_STORAGE_GB`, `PAYWALL_OFFER_TIMEOUT_MS`, `PLUS_REFLECT_RETRY_COUNT`, `PLUS_REFLECT_RETRY_INTERVAL_MS`. 값은 diff 보고에서 제안 → JJ 확정.

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
| 이미 Plus | `user.plan === 'plus'` | 결제 UI 없이 `/subscription`으로 `replace` |

- 연간이 기본 선택. 할인 배지는 `annualDiscountPercent !== null`일 때만, "월 ○꼴"은 `perMonthPriceString !== null`일 때만 표시한다.
- 비교표 3행은 고정 문구. 용량 숫자는 `FREE_STORAGE_GB`·`PLUS_STORAGE_GB`를 끼워 넣는다.
- 약관·개인정보처리방침 주소는 상수로 뽑아 `app/app-info.tsx`와 같이 쓴다(새 URL 0건, 여는 방식은 현행과 동일).
- 고지문은 선택한 플랜에 따라 바뀐다. 가격은 `priceString`만 쓴다.

구매 흐름

1. 버튼 탭 → `purchasePaywallPlan(kind)`. 진행 중 재탭 무시(중복 방지).
2. `cancelled` → 아무 표시 없이 정상 상태로 복귀.
3. `failed` → `paywall.failed` 안내, 화면 유지.
4. `completed` → `refreshUser()`를 `PLUS_REFLECT_RETRY_COUNT`회까지 `PLUS_REFLECT_RETRY_INTERVAL_MS` 간격으로 재시도 → `/plus-success`로 `replace`(params: `kind`, `trial`, `price`, `reflected`).

복원: 성공 후 `refreshUser()` → plus면 `/subscription`으로 `replace`, 아니면 `paywall.restoreNone`.

### 3.2 구독 시작 완료 — `app/plus-success.tsx` (신규, 시안 `03-success.png`)

| 변형 | 조건 | 표 내용 |
|---|---|---|
| 체험 시작 | `reflected && trial` | 플랜 / 무료 체험 종료 = `plan_expires_at` / 첫 결제 = `plan_expires_at` · `price` + 체험 해지 안내 |
| 바로 결제 | `reflected && !trial` | 플랜 / 다음 결제 = `plan_expires_at` · `price` |
| 반영 중 | `!reflected` | 표 없음. `plusSuccess.pending` 문구. 화면 진입 후에도 재조회 1회 |

- 날짜는 앱의 기존 날짜 표시 유틸·로케일을 따른다.
- "기록하러 가기" → 홈으로 `replace`(뒤로가기로 결제 화면에 돌아가지 않게). "구독 관리 보기" → `/subscription`.

### 3.3 설정 구독 화면 — `app/subscription.tsx` (신규, 시안 `04-subscription-settings.png`)

진입: `settings.tsx`에 "구독" 행 추가 + `more.tsx`의 `<StorageUsageBar onUpgrade>` 연결.

| 상태 | 조건 | 표시 |
|---|---|---|
| 무료 | `plan !== 'plus'` | 시안 그대로. Plus 카드 가격 줄은 상품 조회 성공 시에만 |
| Plus·이용 중 | `plan_status === 'active'` | 현재 플랜 Plus, `subscription.renewsOn`, Plus 카드 없음 |
| Plus·해지 예약 | `cancelled` | `subscription.cancelledUntil` |
| Plus·결제 확인 필요 | `grace` | `subscription.graceNotice` |
| Plus·상태 불명 | `plan_status`가 없거나 `null` | 날짜만(`paywall.activeUntil` 재사용) |

- 저장 공간 막대는 `/users/storage` 값. 불러오지 못하면 막대 영역을 숨긴다(오류 alert 없음).
- "스토어에서 구독 관리" → `openSubscriptionManagement()`. `'unavailable'`이면 `subscription.manageUnavailable`.
- `plan_store`가 현재 기기의 스토어와 다르면 관리 행 아래에 `subscription.otherStore`를 보여준다.
- 동반 수정: `StorageUsageBar`의 `PLAN_KEYS`에 `plus` 추가, `StorageUsage.plan` 타입에 `'plus'` 추가, `User` 타입에 `plan_status?`·`plan_store?` 추가.

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
- 값이 영어와 같은 키(`paywall.brand`, `paywall.compare.plus`, 스토어 이름)는 의도적 영어 유지 목록에 등록한다.
- vi·th는 초안이다. 병합 후 표로 뽑아 JJ 검수를 받는다.

---

## 6. 관측

| 지점 | 기록 |
|---|---|
| 결제 화면 진입 | breadcrumb `paywall` / `view` + `source` |
| 상품 조회 결과 | breadcrumb `offer` + `status` |
| 구매 시작·결과 | breadcrumb `purchase` + `kind` + 결과 |
| 구매 `failed` | `captureError`, tags `area: 'paywall'`, `kind`, `source` |
| 업로드를 `rejected`로 버림 | `captureMessage` warning, fingerprint `upload-rejected`, tags 상태 코드·경로 종류. 파일명·사용자 식별값 금지 |
| 업로드를 `quota`·`oversize`로 버림 | breadcrumb만 |
| 결제 완료 후 미반영 | `captureMessage` warning, fingerprint `paywall-reflect-timeout` |
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
| 단위 | 구독 화면 표시 모델(순수 함수) | 무료·active·cancelled·grace·불명 5개 상태, 다른 스토어 안내. 렌더는 실기 스크린샷으로 확인 |
| 통합 | 백엔드 `/auth/me` | 2.1의 케이스 |
| 시나리오 | 용량 초과 | prepare 413 → 시트 표시 → 대기 배너 없음 → "Plus 알아보기" → 결제 화면 |
| 시나리오 | 구매 완료 | completed → 재조회 후 plus → 완료 화면(체험) / 끝까지 미반영 → 반영 중 변형 |

품질 게이트: `tsc --noEmit` 0 · `jest` 전부 통과(기준선 28 suites / 291 tests에서 증가만). eslint는 부재(W-LINT-ABSENT). 백엔드는 black·ruff·pytest.

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
| D6 | 설정 구독 화면 + 진입점 ① | app | 무료·Plus 각 1회 |
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
