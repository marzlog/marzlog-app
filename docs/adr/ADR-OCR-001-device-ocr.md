# ADR-OCR-001: 디바이스 OCR 도입 (PaddleOCR → Google ML Kit)

- 상태: Accepted
- 일자: 2026-05-05
- 작성자: Marzlog Backend Engineer
- 관련 메모리: #4 OCR device migration, #15 OCR 종결 스펙
- 관련 백엔드: C1 (PATCH /media/{id}/ocr, 0ee59b6), C2 (POST 410 + worker no-op, 01e416b)

## 배경

서버 PaddleOCR 처리 시간(2~5분)이 프론트 폴링 상한 60초를 빈번히 초과하여 사용자 체감 실패율이 높음.
백엔드 C1/C2 머지로 PATCH 엔드포인트 준비됨. 디바이스 OCR로 전환하여 1~3초 즉답 + 폴링 제거.

## 결정

1. 라이브러리: `@react-native-ml-kit/text-recognition` v2.0.0
   - iOS/Android 공통: Google ML Kit Text Recognition
   - 한국어 모듈: `GoogleMLKit/TextRecognitionKorean` 8.0.0 (iOS pod 의존)
   - 온디바이스 처리, 외부 서버 호출 없음
2. iOS deployment target: 15.1 → 15.5 상향 (라이브러리 podspec 요구)
   - `expo-build-properties` 옵션에 `ios.deploymentTarget: "15.5"` 추가
3. Expo config plugin: 라이브러리 자체 plugin 미제공, autolinking만 의존
4. 트리거: 사용자 명시 액션 (기존 "사진 속 글자 읽기" 버튼 그대로)
5. 그룹 미디어 캐러셀: `currentImage` (L325 기존 변수) 재활용
   - 사용자가 캐러셀에서 보고 있는 이미지를 OCR 대상으로 삼음 (직관 일치)
6. 실패 처리:
   - 디바이스 OCR 실패 → 서버 저장 없이 토스트만 (재시도 시 새로 실행)
   - PATCH 실패 → 토스트 + 버튼 재활성화 (try/catch/finally 패턴, handleGenerateDiary와 일관)
7. 50KB 안전망: 클라이언트 측 UTF-8 트렁케이트 (한글 경계 보존)
8. i18n 미변경: 기존 6개 키 재사용 (`media.readTextButton`/`readingText`/`readTextSection`/`noTextInPhoto`/`readTextFailed`/`readTextRetry`)
   - production OTA 영향 0

## 근거

- vision-camera 계열은 라이브 카메라 의존, 번들 ~10MB+. 정적 사진 OCR 목적과 불일치
- @react-native-ml-kit는 정적 이미지 URI 직접 입력, autolinking으로 Expo Dev Client 호환
- "사진 속 글자 읽기"는 일기 앱 정체성과 일치 ("텍스트 추출하기" 같은 기술어 대비)
- 50KB ≈ 한글 12,500자 → 사진 1장에서 도달 사실상 불가, 방어용
- L325 `currentImage` 재활용으로 코드 중복 회피, 그룹 캐러셀 직관 보존

## 트레이드오프

- 자동성: PaddleOCR이 모든 사진 자동 처리. 디바이스 OCR은 사용자 명시 트리거만 → 검색 누락 가능
  - 완화: Phase 2에서 자동 백그라운드 OCR 옵션 검토 가능
- iOS 15.5 상향: iOS 15.0~15.4 사용자 컷오프 (영향 미미 추정, Sentry 디바이스 분포 모니터링 필요)
- Google ML Kit pod 의존 추가: privacy-first 정체성 보존됨 (온디바이스 처리, 네트워크 호출 없음)
  - Privacy Manifest (메모리 #19) 점검 시 함께 검토 — 별 백로그 B-OCR-2
- 라이브러리 v2.0.0 `types` 필드 미선언: tsc 통과 확인됨, 향후 `skipLibCheck` 처리 가능성 — B-OCR-1
- 데드 코드 `triggerOcr` (POST) 보존: 호출처 0개. 별 PR로 정리 — B-OCR-CLEAN

## 대안

- (기각) react-native-vision-camera + 텍스트 인식 플러그인: 카메라 의존, 번들 큼
- (기각) Expo config plugin 자작 (Vision/MLKit 직접): 수개월 소요
- (기각) 폴링만 5분 확장: 디바이스 OCR과 양립 불가, 임시 방편

## 영향

- 백엔드 변경 없음 (C1/C2 develop 머지 완료)
- DB 스키마 변경 없음
- **머지 게이트**: 운영 RDS C3 완료 후 (alembic upgrade 012 + API 재배포)
- 머지 후 데드 코드: `triggerOcr` (POST) — 별 PR 정리

## 검증

- `npx tsc --noEmit`: 0 errors (STEP 7b 통과)
- EAS preview 빌드: iOS/Android 각 1회 OCR 실행 (PR 머지 전 필수)
- 수동 체크리스트:
  1. ocr_status=null 사진에서 "사진 속 글자 읽기" 버튼 노출
  2. 버튼 탭 → "글자 읽는 중..." 1~3초 → 텍스트 표시
  3. 글자 없는 사진 → "이 사진에는 글자가 없어요"
  4. 비행기 모드 → 토스트 "글자를 읽지 못했어요..."
  5. 그룹 캐러셀에서 다른 이미지로 스와이프 → 그 이미지에 OCR 적용
  6. iOS 15.5 미만 단말 → 앱 자체 미설치 (Sentry로 영향 추적)
  7. iOS/Android 동일 동작

## 별 백로그 (이번 PR 외)

- B-OCR-1: `@react-native-ml-kit/text-recognition` v2.0.0 `types` 필드 미선언. 향후 빌드 환경 변경 시 영향 모니터링.
- B-OCR-2: GoogleMLKit pod 의존 추가 → Privacy Manifest (메모리 #19) 점검 시 함께 확인.
- B-OCR-3: iOS deployment target 15.1 → 15.5 상향. 사용자 컷오프 영향 Sentry 디바이스 분포로 모니터링.
- B-OCR-4: `android/` 디렉터리 부분 prebuild 상태 (ios/ 부재). git commit 여부 + gitignore 일관성 검토.
- B-OCR-5: `currentMediaId` 변수명이 위치별로 string ID(L551, L583)와 객체(L632)로 분기. 명료성 리팩터.
- B-OCR-6: B-OCR-5와 묶음. `currentMediaId` (string) / `currentImage` (object) 분리 권장.
- B-OCR-7: `handleSaveImage` (L631)가 L325 `currentImage`를 모르고 동일 로직 재정의. B-OCR-5/6과 함께 정리.
- B-OCR-CLEAN: `triggerOcr` (POST) 함수 삭제. C3 운영 적용 + 본 PR 머지 후 별 PR.

## 결정 회의록

- 2026-05-05: JJ + Marzlog Backend Engineer
  - i18n: 기존 "사진 속 글자 읽기" 유지 (b "텍스트 추출하기" 기각, 톤·일관성·OTA 리스크 종합 판단)
  - 라이브러리: @react-native-ml-kit/text-recognition v2 채택 (vision-camera·자작 plugin 기각)
  - PR 분리: 단일 PR로 통합 (PR-1/PR-2 분리는 작업량 증가만 초래, 머지 게이트는 어차피 C3로 동일)
