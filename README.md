# 📷 Marzlog - AI 기반 사진 관리 앱

**버전**: 1.0.0  
**기술 스택**: React Native (Expo SDK 54) + TypeScript

---

## 🎯 주요 기능

- **Google OAuth 로그인**: 소셜 로그인으로 간편하게 시작
- **AI 시맨틱 검색**: 자연어로 사진 검색 ("작년 여름 해운대")
- **스마트 타임라인**: 날짜별 자동 정리
- **AI 자동 분류**: CLIP 기반 앨범 자동 생성
- **크로스 플랫폼**: iOS, Android, Web 지원

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript (strict mode) |
| State Management | Zustand |
| API Client | Axios |
| Navigation | Expo Router |
| Authentication | expo-auth-session, expo-secure-store |
| Styling | React Native StyleSheet |

---

## 📦 설치 및 실행

### 1. 의존성 설치

```bash
cd marzlog-app
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
# .env 파일을 열어 API URL과 Google Client ID 설정
```

### 3. 개발 서버 실행

```bash
# 모든 플랫폼
npm start

# 웹만
npm run web

# iOS만 (macOS 필요)
npm run ios

# Android만
npm run android
```

---

## 📁 프로젝트 구조

```
marzlog-app/
├── app/                      # Expo Router 페이지
│   ├── (tabs)/               # 탭 네비게이션
│   │   ├── index.tsx         # 타임라인 탭
│   │   ├── search.tsx        # 검색 탭
│   │   ├── albums.tsx        # 앨범 탭
│   │   └── profile.tsx       # 프로필 탭
│   ├── login.tsx             # 로그인 화면
│   └── _layout.tsx           # 앱 레이아웃
│
├── src/                      # 소스 코드
│   ├── api/                  # API 클라이언트
│   │   ├── client.ts         # Axios 설정
│   │   └── auth.ts           # 인증 API
│   ├── components/           # 재사용 컴포넌트
│   │   └── auth/             # 인증 관련 컴포넌트
│   ├── store/                # Zustand 스토어
│   │   └── authStore.ts      # 인증 상태 관리
│   └── types/                # TypeScript 타입
│       └── auth.ts           # 인증 타입
│
├── assets/                   # 정적 자원
├── components/               # 공용 컴포넌트
├── constants/                # 상수
└── app.json                  # Expo 설정
```

---

## 🔐 환경변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `EXPO_PUBLIC_API_URL` | 백엔드 API URL | `https://api.marzlog.com` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth Web Client ID | `xxx.apps.googleusercontent.com` |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS Client ID | `xxx.apps.googleusercontent.com` |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android Client ID | `xxx.apps.googleusercontent.com` |

---

## 📱 스크린샷

### 로그인 화면
- 그라데이션 배경
- Google OAuth 버튼
- 기능 소개 카드

### 타임라인
- 날짜별 사진 그리드
- Pull-to-refresh
- 업로드 FAB

### 검색
- AI 시맨틱 검색
- 자동완성 제안
- 검색 결과 그리드

### 프로필
- 사용자 통계
- 설정 메뉴
- 로그아웃

---

## 🧪 테스트

```bash
# 타입 체크
npx tsc --noEmit

# 웹 빌드
npx expo export --platform web

# 모든 플랫폼 빌드
npx expo export
```

---

## 🚀 배포

### AWS Amplify (웹)

```bash
npm run build:web
# dist/ 폴더를 Amplify에 배포
```

### Expo EAS (모바일)

```bash
npx eas build --platform all
```

---

## 📚 관련 문서

- [Backend Repository](https://github.com/marzlog/BACKEND)
- [API Documentation](https://api.marzlog.com/docs)
- [Expo Documentation](https://docs.expo.dev/)

---

## 📄 라이선스

MIT License

---

**작성일**: 2024-12-17  
**최종 수정**: 2024-12-17
