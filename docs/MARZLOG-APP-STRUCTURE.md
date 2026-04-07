# MarZlog App - 프론트엔드 구조 문서

> 최종 업데이트: 2026-03-13

## 1. 기술 스택

| 카테고리 | 기술 | 버전 |
|----------|------|------|
| 프레임워크 | Expo (SDK 54) | ~54.0.29 |
| UI | React Native | 0.81.5 |
| 언어 | TypeScript + React 19 | 19.1.0 |
| 라우팅 | Expo Router (파일 기반) | ~6.0.19 |
| 상태관리 | Zustand | ^5.0.9 |
| HTTP 클라이언트 | Axios | ^1.13.2 |
| 다국어 | i18n-js | ^4.5.1 |
| 스타일링 | StyleSheet + NativeWind | ^4.2.1 |
| 이미지 캐싱 | expo-image | ~3.0.11 |
| 크래시 추적 | @sentry/react-native | ~7.2.0 |
| 빌드/배포 | EAS Build + EAS Update | - |

## 2. 디렉토리 구조

```
marzlog-app/
├── app/                          # Expo Router 화면 (파일 기반 라우팅)
│   ├── _layout.tsx               # 루트 레이아웃 (인증/온보딩 분기)
│   ├── (tabs)/                   # 메인 탭 네비게이션
│   │   ├── _layout.tsx           # 커스텀 탭 바 (5탭)
│   │   ├── index.tsx             # 홈 (캘린더 + 타임라인)
│   │   ├── timeline.tsx          # 일상 모아보기 (무한 스크롤)
│   │   ├── search.tsx            # AI 검색
│   │   ├── profile.tsx           # 마이페이지
│   │   ├── more.tsx              # 더보기
│   │   └── albums.tsx            # 앨범 (숨김, href: null)
│   ├── login.tsx                 # 로그인
│   ├── register.tsx              # 회원가입
│   ├── onboarding.tsx            # 온보딩 캐러셀
│   ├── upload/index.tsx          # 사진 업로드
│   ├── media/[id].tsx            # 미디어 상세
│   ├── settings.tsx              # 설정
│   ├── notifications.tsx         # 알림 (공지 + 개인)
│   ├── profile-edit.tsx          # 프로필 수정
│   ├── app-info.tsx              # 앱 정보
│   ├── withdraw.tsx              # 회원 탈퇴
│   ├── withdraw-complete.tsx     # 탈퇴 완료
│   ├── language-select.tsx       # 언어 선택
│   ├── labs/                     # 실험 기능
│   └── policy/                   # 약관 (인앱 브라우저)
├── src/                          # 소스 코드
│   ├── api/                      # API 모듈 (Axios)
│   ├── components/               # 재사용 컴포넌트
│   ├── constants/                # 상수 (감정 아이콘 등)
│   ├── hooks/                    # 커스텀 훅
│   ├── i18n/                     # 다국어 (ko/en)
│   ├── services/                 # 서비스 (알림)
│   ├── store/                    # Zustand 스토어
│   ├── theme/                    # 테마 (색상/타이포/간격)
│   ├── types/                    # TypeScript 타입
│   └── utils/                    # 유틸리티
├── assets/                       # 이미지/폰트/비디오
├── docs/                         # 프로젝트 문서
├── app.json                      # Expo 설정
├── eas.json                      # EAS 빌드 설정
└── package.json                  # 의존성
```

## 3. 화면 목록 (Screens)

### 메인 탭 (5개)

| 탭 | 파일 | 설명 |
|----|------|------|
| MarZlog | `(tabs)/index.tsx` | 주간/월간 캘린더 토글, 날짜별 타임라인 카드, 검색/업로드 FAB, 알림 벨 |
| 일상 모아보기 | `(tabs)/timeline.tsx` | 무한 스크롤 그리드, 그룹 이미지, 스와이프 제스처, 공유 |
| AI 검색 | `(tabs)/search.tsx` | 벡터+텍스트 하이브리드 검색, 카테고리 칩, 최근 검색, 디바운스 |
| 마이페이지 | `(tabs)/profile.tsx` | 프로필 카드(아바타/닉네임), 통계, 프로필 수정/알림 링크, 로그아웃 |
| 더보기 | `(tabs)/more.tsx` | 설정 바로가기, 앱 정보, 버전 표시 |

### 인증 (4개)

| 파일 | 설명 |
|------|------|
| `login.tsx` | Google/Apple OAuth + 이메일 로그인 |
| `register.tsx` | 이메일 회원가입, 비밀번호 검증, 약관 동의 |
| `forgot-password.tsx` | 비밀번호 찾기 (이메일 인증코드) |
| `terms-agreement.tsx` | 이용약관/개인정보 체크박스 |

### 미디어 (2개)

| 파일 | 설명 |
|------|------|
| `upload/index.tsx` | 다중 이미지 업로드, 감정 선택, 강도 슬라이더, AI 분석 |
| `media/[id].tsx` | 이미지 뷰어, 캡션(EN/KO), 태그, EXIF, OCR, 공유, 삭제 |

### 설정/정보 (6개)

| 파일 | 설명 |
|------|------|
| `settings.tsx` | 푸시 알림, 테마, 언어, AI 모드, 리마인더 |
| `app-info.tsx` | 버전, 공지사항, 이용약관/개인정보(인앱 브라우저), 회원탈퇴 |
| `profile-edit.tsx` | 닉네임 수정, 비밀번호 변경 |
| `notifications.tsx` | 공지사항(파란) + 개인 알림(빨간) 통합 화면 |
| `withdraw.tsx` | 회원 탈퇴 확인 |
| `withdraw-complete.tsx` | 탈퇴 완료 화면 |

### 기타 (4개)

| 파일 | 설명 |
|------|------|
| `onboarding.tsx` | 온보딩 캐러셀 (로고 → 기능 소개 → 시작) |
| `language-select.tsx` | 언어 선택 (KO/EN) |
| `labs/ai-classify.tsx` | AI 감정 분류 실험 |
| `labs/scene-photos.tsx` | 장면 사진 그룹핑 실험 |

## 4. 컴포넌트 구조

### UI 디자인 시스템 (`src/components/ui/`)

| 컴포넌트 | 설명 |
|----------|------|
| `Button` | Primary/Secondary 버튼 (variant 지원) |
| `Input` | 텍스트 입력 (유효성 검증) |
| `Dialog` | 모달 다이얼로그 (confirm/cancel) + `useDialog` 훅 |
| `TopAppBar` | 헤더 바 (로고, 제목, 아이콘) |
| `BottomAppBar` | 하단 액션 바 |
| `Checkbox` / `Radio` / `Toggle` | 폼 컨트롤 |

### 도메인 컴포넌트

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `home/` | `ScheduleCard` | 미디어 카드 (large/compact), 감정 배지, 그룹 배지 |
| `home/` | `DateSelector`, `WeekSelector`, `CalendarModal` | 날짜 선택 UI |
| `auth/` | `GoogleLoginButton` | Google OAuth (웹/네이티브 분기) |
| `auth/` | `BiometricLock`, `PinInput`, `PinSetup` | 앱 잠금 (생체인증/PIN) |
| `media/` | `EditAnalysisModal` | 캡션/태그 수정 모달 |
| `media/` | `ShareCardView`, `ShareSheet` | 공유 카드 + 공유 시트 |
| `upload/` | `ImageSelector` | 카메라/갤러리 이미지 선택 |
| `upload/` | `EmotionPicker`, `IntensitySlider` | 감정 선택 (12개) + 강도 조절 |
| `common/` | `Logo`, `ErrorView`, `AiNotice` 등 | 공통 유틸리티 UI |

## 5. 상태 관리 (Zustand Stores)

| 스토어 | 주요 상태 | 주요 액션 |
|--------|----------|----------|
| `authStore` | `user`, `isAuthenticated`, `accessToken`, `refreshToken` | `loginWithGoogle()`, `loginWithEmail()`, `register()`, `logout()`, `deleteAccount()` |
| `settingsStore` | `themeMode`, `language`, `aiMode`, `notificationsEnabled` | `setThemeMode()`, `setLanguage()`, `setAIMode()`, `loadSettings()` |
| `timelineStore` | `selectedDateISO`, `lastViewedDateISO` | `setSelectedDate()`, `restoreFromLastViewed()` |
| `appLockStore` | `isEnabled`, `isLocked`, `failCount`, `biometricType` | `enableLock()`, `verifyPin()`, `authenticateBiometric()` |
| `reminderStore` | `isEnabled`, `hour`, `minute` | `enableReminder()`, `disableReminder()`, `setTime()` |

## 6. API 모듈 (`src/api/`)

| 모듈 | 엔드포인트 |
|------|-----------|
| `client.ts` | Axios 인스턴스, Bearer 토큰 자동 주입, 401 리프레시 플로우 |
| `auth.ts` | Google/Apple/Email 로그인, 회원가입, 비밀번호 찾기, 프로필 조회/수정, 회원탈퇴 |
| `media.ts` | 미디어 상세 조회, AI 분석 결과, 수정, 삭제, 대표 이미지 설정 |
| `timeline.ts` | 타임라인 조회, 통계, 그룹 이미지 조회 |
| `upload.ts` | Presigned URL 발급 → S3 직접 업로드 → 분석 트리거 (SHA256 중복 검사) |
| `search.ts` | 하이브리드 검색 (벡터+텍스트), 유사 이미지, 자동완성 |
| `announcements.ts` | 공지사항 목록, 안 읽은 수, 읽음 처리 |
| `notifications.ts` | 알림 목록, 안 읽은 수, 읽음/삭제 |

## 7. 커스텀 훅 & 서비스

### 훅 (`src/hooks/`)

| 훅 | 설명 |
|----|------|
| `useTranslation()` | `t(key)` 번역 함수, `language`, `changeLanguage()` — settingsStore 연동 |
| `useImageUpload()` | 다중 이미지 업로드 로직: 선택 → SHA256 → presigned → S3 → complete |

### 서비스 (`src/services/`)

| 서비스 | 설명 |
|--------|------|
| `notificationService.ts` | Expo Notifications 래퍼: 채널 설정, 권한 요청, 일일 리마인더 스케줄링/취소 |

### 유틸리티 (`src/utils/`)

| 유틸 | 설명 |
|------|------|
| `secureStorage.ts` | 크로스 플랫폼 보안 저장소 (네이티브: expo-secure-store, 웹: localStorage) |
| `sentry.ts` | `initSentry()`, `captureError()` — Sentry 크래시 리포팅 |
| `errorMessages.ts` | 백엔드 에러 응답 파싱 |
| `shareUtils.ts` | 공유 카드 캡처 (ViewShot), 클립보드 복사, 시스템 공유 |

## 8. 다국어 (i18n)

- **지원 언어**: 한국어 (ko), 영어 (en)
- **라이브러리**: `i18n-js` + `expo-localization` (시스템 언어 감지)
- **파일**: `src/i18n/locales/ko.json` (~27KB), `en.json` (~24KB)
- **주요 네임스페이스**: `auth`, `common`, `ai`, `search`, `reminder`, `terms`, `settings`, `stats`, `profile`, `more`, `upload`, `media`, `error`

## 9. 테마 시스템

### 색상 팔레트

| 모드 | 배경 | 카드 | 테두리 | 텍스트 | 액센트 |
|------|------|------|--------|--------|--------|
| 라이트 | `#F9FAFB` | `#FFFFFF` | `#E5E7EB` | `#1F2937` | `#8B5CF6` |
| 다크 | `#0F1923` | `#1A2332` | `#2D3748` | `#F9FAFB` | `#8B5CF6` |

### 감정 시스템 (12개)

기쁨, 평온, 사랑, 감사, 놀람, 불안, 슬픔, 집중, 분노, 생각, 피곤, 아픔
각 감정별 컬러/그레이/비활성 아이콘 + 일러스트레이션 제공
`constants/emotions.ts` → `getEmotionIcon()`, `getEmotionIllustration()`

## 10. 빌드 & 배포

### Expo 설정 (app.json)

- **앱 이름**: MarZlog
- **번들 ID**: `com.marzlog.app` (iOS/Android 동일)
- **버전**: 1.0.0
- **플러그인**: expo-router, secure-store, localization, local-auth, web-browser, image-picker, notifications, Sentry
- **대체 아이콘**: coral, red (expo-alternate-app-icons)
- **OTA 업데이트**: EAS Update 활성화, runtimeVersion: appVersion

### EAS 빌드 프로필 (eas.json)

| 프로필 | 용도 | 배포 |
|--------|------|------|
| `development` | 개발 클라이언트 | internal |
| `preview` | Android APK 미리보기 | APK |
| `production` | 프로덕션 빌드 | 스토어 제출 (auto-increment) |

### 환경 변수

| 변수 | 설명 |
|------|------|
| `EXPO_PUBLIC_API_URL` | 백엔드 API URL (`https://api.marzlog.com`) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth (웹) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth (iOS) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth (Android) |

## 11. 네비게이션 구조

```
루트 _layout.tsx
├── 미인증
│   ├── /onboarding (첫 실행 시)
│   ├── /language-select
│   ├── /login
│   ├── /register
│   ├── /terms-agreement
│   └── /forgot-password
│
├── 인증됨 → (tabs)
│   ├── index (홈)
│   ├── timeline (일상 모아보기)
│   ├── search (AI 검색)
│   ├── profile (마이페이지)
│   └── more (더보기)
│
└── 모달/스택
    ├── /upload
    ├── /media/[id]
    ├── /notifications
    ├── /settings
    ├── /profile-edit
    ├── /app-info
    ├── /withdraw → /withdraw-complete
    └── /labs/*
```

## 12. 주요 아키텍처 패턴

### 인증 플로우
1. 미인증 → 온보딩 → 로그인 (Google/Apple/Email)
2. 토큰 → `expo-secure-store` 보안 저장
3. Axios 인터셉터 → Bearer 토큰 자동 주입
4. 401 응답 → 리프레시 토큰으로 자동 갱신
5. 갱신 실패 → 강제 로그아웃

### 미디어 업로드 플로우
1. 이미지 선택 → SHA256 해시 계산 (중복 검사)
2. `prepareUpload` → Presigned URL 발급
3. S3 직접 업로드 (진행률 표시)
4. `completeUpload` → AI 분석 트리거 (Worker)

### 검색
- 하이브리드 모드: 벡터(SigLIP 2) + 텍스트(FTS) 결합
- 한글 동의어 확장 (synonym_dict)
- 디바운스 입력 (300ms)
- 최근 검색 로컬 저장

### 앱 잠금
- PIN(6자리) + 생체인증 (Face ID/지문)
- 백그라운드 30초 후 자동 잠금
- 5회 실패 시 30초 잠금
