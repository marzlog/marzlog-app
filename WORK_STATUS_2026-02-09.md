# 작업 상태 - 2026-02-09

## 완료된 작업

### 1. 썸네일 카드 스타일 통일 (홈/타임라인/검색) ✓

홈, 타임라인, 검색 화면의 그리드 뷰를 모두 `ScheduleCard compact` 컴포넌트로 통일.

**변경 전**: 각 화면마다 별도의 그리드 카드 구현 (스타일 불일치)
**변경 후**: 정사각형 이미지 + 하단 제목 오버레이 + 좌상단 감정 아이콘 (동일)

**수정된 파일**:
| 파일 | 변경 내용 |
|------|----------|
| `app/(tabs)/index.tsx` | 그리드 모드에서 `ScheduleCard compact` 사용, `gridCardWrapper` 추가 |
| `app/(tabs)/timeline.tsx` | `renderGridCard`를 `ScheduleCard compact`로 교체 |
| `app/(tabs)/search.tsx` | 검색 결과를 `ScheduleCard compact` 2열 그리드로 표시 |
| `src/components/home/ScheduleCard.tsx` | compact 모드: 고정 크기 → `aspectRatio: 1` (부모가 크기 제어) |

### 2. 검색 API에 emotion / title / caption_ko 추가 ✓

**문제**: 검색 결과에 감정 아이콘이 안 보이고, 제목이 영문 AI 캡션("a white plate with...")으로 표시됨

**백엔드 수정** (`search_basic.py`):
- `SearchResult` 스키마에 `emotion`, `title`, `caption_ko` 필드 추가
- `_add_thumbnail_urls()`에서 `Media.emotion`, `Media.title`, `RecallCard.caption_ko` 조회

**프론트엔드 수정**:
- `src/api/search.ts` — `SearchResult` 타입에 `title`, `emotion` 추가
- `app/(tabs)/search.tsx` — 제목 우선순위: `title > caption_ko > caption`
- `app/(tabs)/search.tsx` — `emotion={item.emotion}` prop 전달

### 3. DB 감정값 한글 통일 ✓

**문제**: 초기 데이터에 영문 emotion 값이 혼재

| 변환 | 건수 |
|------|------|
| `serenity` → `평온` | 20건 |
| `happiness` → `기쁨` | 1건 |

**변환 후 분포**:
| 감정 | 건수 |
|------|------|
| 평온 | 23 |
| 기쁨 | 5 |
| 생각 | 3 |
| 피곤 | 3 |
| 감사 | 3 |
| 사랑 | 2 |

---

## 커밋 기록

### 프론트엔드 (marzlog-app) — 오늘 커밋
```
1face8c feat: 썸네일 카드 스타일 통일 및 검색 결과 개선
```

### 이전 세션 커밋 (2/6~2/8)
```
d0441b9 feat: 홈 화면 감정 아이콘 표시 및 캘린더 타임존 버그 수정
8650b72 feat: 감정 UI Figma 디자인 적용 및 모바일 스와이프 개선
```

### 백엔드 (marzlog-backend)
```
062c8d0 feat: 검색 API 개선 및 타임라인 KST 변환
```

---

## 배포 상태

| 환경 | 상태 | 버전 |
|------|------|------|
| 프론트엔드 (GitHub) | ✓ pushed | `1face8c` on `master` |
| 백엔드 (GitHub) | ✓ pushed | `062c8d0` on `main` |
| EC2 (recall_api) | ✓ running | 최신 코드 반영됨 |

---

## 아키텍처 참고

### 테이블 구조 (검색 관련)
```
media 테이블:
  - id, title, emotion, intensity, storage_key, group_id, taken_at ...
  - title: 사용자 설정 제목 (현재 대부분 NULL)
  - emotion: 한글 감정값 (기쁨, 평온, 사랑, 감사, 생각, 피곤 등)

recall_cards 테이블:
  - id, media_id, caption (영문 AI), caption_ko (한글 번역), tags, tags_ko, embedding ...
  - caption_ko: AI 캡션의 한글 번역
```

### 감정 매핑 (프론트엔드)
```
DB 한글값 → constants/emotions.ts의 EMOTION_NAME_TO_KEY로 영문 키 변환 → 아이콘 로드
getEmotionIcon('기쁨', 'color') → joy_color.png
getEmotionIcon('평온', 'color') → calm_color.png
```

### 검색 제목 표시 우선순위
```
1. item.title        — media.title (사용자 설정 제목)
2. item.caption_ko   — recall_cards.caption_ko (한글 AI 캡션)
3. item.caption       — recall_cards.caption (영문 AI 캡션)
```

---

## 다음 작업 시 참고

### 알려진 이슈
- `media.title`이 대부분 NULL — 사용자가 제목을 직접 설정하는 UX가 아직 약함
- Gemini API 모듈 미설치 (`No module named 'google'`) — 검색 쿼리 파싱에 영향

### 프론트엔드 브랜치 주의
- 현재 `master` 브랜치에서 작업 중 (main 아님)
- `origin/master`에 push 완료

---

## 다음 작업 후보

| 우선순위 | 작업 | 비고 |
|---------|------|------|
| 🔴 | **Apple OAuth 실제 구현** | 가이드 문서 완료, 구현만 남음 |
| 🔴 | **사용자 제목 편집 UX 개선** | media.title 활용도 높이기 |
| 🟡 | 앨범/폴더 관리 | |
| 🟡 | Figma 디자인 추가 적용 | 설정 화면 등 |
| 🟢 | 얼굴 인식 + 이름 태깅 | |
| 🟢 | 프로덕션 HTTPS/도메인 | |

---

## 시작 명령어

```bash
# 1. EC2 서버 확인
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68 "cd ~/marzlog-backend && docker compose ps"

# 2. 프론트엔드 실행
cd ~/projects/marzlog-app
npx expo start --clear

# 3. 백엔드 최신 코드 반영 (필요시)
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68 "cd ~/marzlog-backend && git pull && docker compose restart api"
```

---

**작성일**: 2026-02-09
