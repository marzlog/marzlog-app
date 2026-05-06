# VERIFY 2026-05-06 — P4 OCR + Sentry + OAuth Android Redirect

## 검증 대상 빌드

- iOS production 1.0.0 (15) — TestFlight
- Android production 1.0.0 (7) — AAB만 보관 (정식 검증 X)
- Android preview 1.0.0 (8) — APK 직접 설치 (이번 사이클 검증 대상)

## 사전 준비

### iOS
- [ ] TestFlight 앱 설치된 iOS 기기
- [ ] Apple ID = TestFlight 초대 받은 계정
- [ ] `Marzlog 1.0.0 (15)` TestFlight 표시 대기 (eas submit 후 ~10분)
- [ ] 설치 후 demo@marzlog.com 또는 본인 계정으로 로그인

### Android
- [ ] Android 기기 개발자 옵션 + USB 디버깅 또는 "출처를 알 수 없는 앱 설치" 허용
- [ ] preview APK 다운로드 (EAS 빌드 페이지)
- [ ] APK 설치 후 본인 계정으로 로그인

### 검증용 자산
- [ ] 텍스트 있는 사진 1장 (한글 + 영문, 예: 책 한 페이지 / 메뉴판 / 표지판)
- [ ] 텍스트 없는 사진 1장 (풍경 / 음식)
- [ ] 의도적 401 유발 방법: 토큰 만료 시뮬레이션 또는 잘못된 endpoint 호출

---

## 시나리오 1 — iOS: 텍스트 있는 사진 OCR (정상 경로)

**플랫폼**: iOS  
**기대 결과**: `ocr_status=done` + `searchable_text` 반영 + 검색 가능

### 절차
1. 앱 실행 → 홈 진입
2. 업로드 → 텍스트 있는 사진 → 업로드
3. 상세 화면 진입
4. OCR 트리거 버튼 탭
5. 디바이스 OCR 실행 (수초 이내, 서버 폴링 없음)
6. 화면에 인식된 텍스트 표시
7. 백엔드 API 호출 확인:
```
   PATCH /api/media/{media_id}/ocr
   body: { "text": "<인식된 텍스트>", "ocr_status": "done" }
```

### 검증 포인트
- [ ] OCR 처리 시간 < 5초
- [ ] 화면에 인식 텍스트 표시
- [ ] 50KB UTF-8 초과 시 클라이언트 truncate
- [ ] PATCH 요청 200 OK
- [ ] 시나리오 4(검색)에서 이 텍스트로 검색 가능

### 실패 시 진단
- ML Kit 모듈 미로드 → app.json deploymentTarget 15.5 확인, 빌드 로그에서 ML Kit pod install 확인
- PATCH 4xx → 백엔드 라우트 main 흡수 재확인 (`9996134`, `337b62f`)
- PATCH 500 → 백엔드 로그 (alembic 011/012 적용, schema validation)

---

## 시나리오 2 — iOS: 텍스트 없는 사진 OCR

**기대 결과**: `ocr_status=no_text`

### 절차
1. 텍스트 없는 사진 (풍경/음식) 업로드
2. 상세 화면 진입 → OCR 트리거
3. ML Kit가 빈 결과 반환
4. 화면에 "이 사진에는 텍스트가 없어요" 또는 유사 메시지

### 검증 포인트
- [ ] PATCH body: `{ "ocr_status": "no_text", "text": "" }` 또는 text omit
- [ ] 백엔드에서 `ocr_status=no_text` 정상 처리 (메모리 #15 시맨틱)
- [ ] UI 회색 톤 / 비활성 상태 표시
- [ ] 재시도 버튼 노출 안 됨 (`failed`와 구분)

---

## 시나리오 3 — iOS: 상세 화면 폴링 제거 회귀

**기대 결과**: 상세 화면 진입 시 60초 폴링 없음, 정상 렌더

### 절차
1. 기존 ocr_status=NULL 사진 (107건 중 임의) 상세 진입
2. 화면 정상 렌더 확인
3. 네트워크 모니터링 (옵션, Charles/Proxyman): 60초 폴링 끊겼는지

### 검증 포인트
- [ ] 상세 화면 로딩 즉시 완료
- [ ] 네트워크 탭에 폴링 호출 없음
- [ ] 메모리 #15 "polling 결과 즉시반영 버그"가 폴링 자체 제거로 해결됨

### 실패 시 진단
- `app/media/[id].tsx` 변경이 빌드에 들어갔는지 (Files changed -42/+30)
- 다른 코드 경로에서 폴링 잔존 → grep 확인

---

## 시나리오 4 — iOS: 검색 (기존 53건 done 데이터)

**기대 결과**: 메모리 #21 검증 쿼리로 검색 결과 정상 반환

### 절차
검색 화면 → 다음 쿼리 입력, 결과 건수 비교:

| 쿼리 | 기대 건수 | 실제 |
|---|---|---|
| 바다 | 4 | |
| 카페 | 4 | |
| 커피 | 4 | |
| 강아지 | 2 | |
| 점심 | 4 | |
| 평온 | 5 | |
| 행복 | 5 | |
| 사랑 | 2 | |
| 평온한 날 | 5 | |
| 행복한 순간 | 5 | |

### 검증 포인트
- [ ] 모든 쿼리 결과 = 기대 건수 (오차 0)
- [ ] 시나리오 1에서 OCR 성공한 사진 검색 시 그 사진 결과 포함

### 실패 시 진단
- 결과 0 → searchable_tsv 트리거 (alembic 012) 정상 작동 확인
- 누락 → ocr_status=done 53건 backfill 점검

---

## 시나리오 5 — iOS: Sentry 4xx skip

**기대 결과**: 401/4xx Sentry 안 들어감, 5xx만 보존

### 절차
**4xx 유발 (skip 기대)**:
1. 잘못된 토큰으로 API 호출 (개발도구/Charles로 헤더 변조 또는 토큰 만료 후 보호 API 호출)
2. 401 응답
3. Sentry 대시보드 (https://sentry.io/organizations/jjsim-inc) → react-native → Issues
4. 해당 401 신규 이벤트 **없어야 함** ✅

**5xx 보존 기대**:
1. 자연 발생 5xx 대기 또는 메모리 #6 RN3/RN4/RN5 패턴 검토

### 검증 포인트
- [ ] 4xx Sentry 이벤트 0건
- [ ] 5xx Sentry 이벤트 정상 (skipClientErrors가 5xx 보존)

### 실패 시 진단
- sentry.ts captureError 변경(`0db9b60`)이 빌드 포함됐는지
- Sentry SDK v8+ skipClientErrors 옵션 지원 확인

---

## 시나리오 6 — Android: 1~5 동일 (preview APK 1.0.0+8)

**기대 결과**: iOS와 동일 (단, ML Kit Text Recognition v2 사용)

### 추가 검증 포인트
- [ ] Android ML Kit 한글 인식 정확도 (iOS Vision API와 비교)
- [ ] Android intent filters 변경이 다른 기능 깨지 않음 (app.json +9줄)

---

## 시나리오 7 — Android: Google OAuth Android redirect

**기대 결과**: 메모리 #29 origin_mismatch 해결 또는 잔존 확인

### 절차
1. 앱 실행 → 로그인 화면
2. Google 로그인 버튼 탭
3. Google 계정 선택 → OAuth 동의
4. 앱으로 리다이렉트
5. 정상 로그인 완료

### 검증 포인트
- [ ] `400 origin_mismatch` 안 뜸
- [ ] 여전히 뜨면: PR #5 (e9621ec)는 client side 수정만, Google Cloud Console 측 별도 필요 (todo ①)

### 실패 시 진단
- Google Cloud Console (`marzlog-824b5`) → APIs & Services → Credentials → OAuth Client ID
- Authorized JavaScript origins 확인
- Authorized redirect URIs에 Android scheme 등록 확인 (`com.googleusercontent.apps.446583916256-...`)

---

## 시나리오 8 — Android ML Kit Text Recognition 한글 정확도

**기대 결과**: 한글 OCR 정확도 검증

### 절차
1. 한글 텍스트 사진 (메모지, 카페 메뉴판 등) 업로드
2. OCR 트리거
3. 인식 결과 vs 실제 텍스트 비교

### 검증 포인트
- [ ] 한글 인식 정확도 > 80%
- [ ] 한글 + 영문 혼합 정상
- [ ] 손글씨는 인식 못 할 수 있음 (별건)

### 실패 시 결정
- 50% 미만: 별건 백로그, ML Kit Korean LSTM 모델 활용 검토
- 보통: 진행, 모니터링

---

## 검증 통과 기준

8개 시나리오 중:
- 시나리오 1, 2, 3, 4, 6, 7 = **필수 통과** (정식 출시 블로커)
- 시나리오 5, 8 = **권장 통과** (실패 시 별건 백로그)

## 통과 후 액션

- iOS: TestFlight → "Submit for Review" → App Store Connect (별 사이클)
- Android: Play Console 앱 등록 (별건, 1~2h 신규 작업)

## 실패 시 액션

- 시나리오 1~4 실패 → hotfix 분기 + 재빌드 사이클
- 시나리오 5 실패 → Sentry SDK 점검, 별건
- 시나리오 6 실패 (Android만) → ML Kit Android 분기 hotfix
- 시나리오 7 실패 → todo ① 우선순위 상향, Google Cloud Console 진단
- 시나리오 8 실패 → 별건 백로그
