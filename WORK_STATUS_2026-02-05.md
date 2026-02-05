# 작업 상태 - 2026-02-05

## 완료된 작업

### 1. 캡션 편집 저장 버그 수정 ✓
**문제**: 캡션 수정 → 저장 → 다시 열면 수정 전 내용으로 되돌아감

**원인**:
- 프론트엔드가 `PATCH /media/{id}` 호출 → 백엔드에 없는 엔드포인트
- `caption` 필드 전송 → 저장해야 할 필드는 `caption_ko`
- 백엔드 `/analysis` GET이 `caption_ko` 반환 안 함

**수정 내용**:
| 파일 | 변경 |
|------|------|
| `media.py` (BE) | GET `/analysis`에 `caption_ko`, `tags_ko` 반환 추가 |
| `media.py` (BE) | PUT `/analysis`에 `caption_ko`, `tags_ko` 업데이트 지원 |
| `media.ts` (FE) | `updateCaption()` → `PUT /analysis` + `caption_ko` 필드 사용 |

### 2. 감정편집 후 날짜 이동 버그 수정 ✓
**문제**: 1월 15일 상세보기 → 감정편집 → 저장 → 뒤로가기 → 12월 달력이 보임

**원인**: 상세보기→뒤로가기 시 홈 화면이 재마운트되며 `selectedDate`가 오늘 날짜로 초기화

**수정 내용**:
| 파일 | 변경 |
|------|------|
| `src/store/timelineStore.ts` (새 파일) | `selectedDate`, `lastViewedDate` 저장 스토어 |
| `app/(tabs)/index.tsx` | 스토어에서 날짜 초기화 + 포커스 시 `lastViewedDate` 복원 |
| `app/media/[id].tsx` | 미디어 로드 시 해당 날짜를 `lastViewedDate`에 저장 |

### 3. Fast PATCH 엔드포인트 추가 ✓
**목적**: 감정/일기 저장 시 빠른 응답 (DB만 업데이트, 비동기 작업 없음)

| 엔드포인트 | 설명 |
|-----------|------|
| `PATCH /media/{id}/emotion` | 감정/강도 빠른 업데이트 |
| `PATCH /media/{id}/diary` | 일기 필드 빠른 업데이트 |

---

## 커밋 기록

### 프론트엔드 (marzlog-app)
```
4c15062 fix: 캡션 저장 및 날짜 복원 버그 수정
```
- `app/(tabs)/index.tsx` - 날짜 복원 로직
- `app/(tabs)/search.tsx` - caption_ko 표시
- `app/media/[id].tsx` - lastViewedDate 저장, caption_ko 편집
- `src/api/media.ts` - updateCaption API 수정
- `src/store/timelineStore.ts` - 새 파일

### 백엔드 (marzlog-backend)
```
b38c6b2 feat: caption_ko 지원 및 fast PATCH 엔드포인트 추가
```
- `apps/api/app/routers/media.py` - caption_ko, PATCH 엔드포인트

---

## 테스트 결과

### 백엔드 API 테스트 (EC2)
```
✓ GET /media/{id}/analysis - caption_ko, tags_ko 반환
✓ PUT /media/{id}/analysis - caption_ko 저장 성공
✓ PATCH /media/{id}/emotion - 감정/강도 저장
✓ PATCH /media/{id}/diary - 제목/내용/분위기 저장
```

### 앱 테스트
- [ ] 캡션 편집 후 저장 확인
- [ ] 감정 편집 후 뒤로가기 → 날짜 유지 확인

---

## 배포 상태

| 환경 | 상태 | 버전 |
|------|------|------|
| 프론트엔드 (GitHub) | ✓ pushed | `4c15062` |
| 백엔드 (GitHub) | ✓ pushed | `b38c6b2` |
| EC2 (recall_api) | ✓ deployed | `b38c6b2` |

---

## 내일 작업 시 참고

### EC2 배포 방법
```bash
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68 "cd ~/marzlog-backend && git pull && docker compose restart api"
```

### 주요 파일 경로
- 프론트엔드: `/home/marzlog/projects/marzlog-app`
- 백엔드: `/home/marzlog/projects/marzlog-backend`
- SSH 키: `~/.ssh/marzlog-key.pem`

### 관련 API 엔드포인트
```
GET  /media/{id}/analysis     - 분석 정보 조회 (caption_ko, tags_ko 포함)
PUT  /media/{id}/analysis     - 캡션/태그 수정 (caption_ko 지원)
PATCH /media/{id}/emotion     - 감정/강도 빠른 수정
PATCH /media/{id}/diary       - 일기 빠른 수정
```

### timelineStore 사용법
```typescript
import { useTimelineStore } from '@/src/store/timelineStore';

const {
  getSelectedDate,      // 현재 선택된 날짜
  setSelectedDate,      // 날짜 선택
  setLastViewedDate,    // 상세보기 진입 시 호출
  restoreFromLastViewed // 홈 복귀 시 호출
} = useTimelineStore();
```

---

## 미해결 이슈

없음 - 모든 버그 수정 완료

---

## 다음 작업 제안

1. 앱에서 실제 테스트 (캡션 저장, 날짜 유지)
2. 검색 결과에서 caption_ko 표시 확인
3. 그룹 이미지의 캡션 편집 테스트
