# Marzlog 작업 상태

> 마지막 업데이트: 2026-01-30

## 프로젝트 개요
- **앱**: React Native (Expo) 사진 일기 앱
- **백엔드**: FastAPI + PostgreSQL + Redis + MinIO
- **AI**: Gemini Vision API (일기 생성), CLIP/BLIP (캡션/임베딩)

---

## 완료된 기능

### AI 일기 시스템
- [x] Gemini Vision API 연동 (`gemini-2.0-flash`)
- [x] 단일 이미지 일기 생성
- [x] 그룹 통합 일기 생성 (최대 10장)
- [x] 수동 재생성 API (`POST /media/{id}/generate-diary`)
- [x] 재생성 버튼 UI + 10초 자동 갱신
- [x] 홈화면 제목 표시 (`title || caption || noTitle`)
- [x] useFocusEffect로 화면 복귀 시 데이터 갱신

### 검색 기능
- [x] 텍스트 검색 (caption, tags, OCR)
- [x] 유사 이미지 검색 (CLIP 임베딩)
- [x] 자동완성 UI
- [x] 검색 모드 선택 (텍스트/유사/통합)

### 미디어 관리
- [x] 그룹 업로드 (최대 5장)
- [x] 대표 이미지 변경
- [x] EXIF 추출 (GPS, 카메라 정보)
- [x] 썸네일 생성

---

## 다음 작업 (우선순위)

### 1. 편집 기능 (2-3시간)
- [ ] 제목 편집
- [ ] 일기 내용 편집
- [ ] 분위기(mood) 변경

### 2. 개별 캡션 편집 (1시간)
- [ ] 그룹 내 각 이미지 캡션 수정

### 3. 검색 개선 (1시간)
- [ ] 유사도 threshold 필터링
- [ ] 검색 결과 정렬 옵션

---

## 주요 파일 위치

### 백엔드 (EC2: /home/ubuntu/marzlog-backend)
```
workers/analyzer/
├── diary_generator.py    # Gemini 일기 생성기
├── tasks.py              # Worker 태스크 (analyze_image, generate_*_diary_task)
└── ai_models.py          # CLIP/BLIP 모델

apps/api/app/
├── routers/
│   ├── media.py          # 미디어 API (재생성 포함)
│   └── timeline.py       # 타임라인 API
├── schemas/
│   ├── __init__.py       # RecallCardResponse (title, mood 등)
│   └── media.py          # MediaResponse
└── models/
    └── __init__.py       # DB 모델 (RecallCard 컬럼)

infra/migrations/
└── 002_add_diary_columns.sql  # title, content, mood, ai_provider 컬럼
```

### 프론트엔드 (로컬: ~/projects/marzlog-app)
```
app/
├── (tabs)/index.tsx      # 홈화면 (useFocusEffect)
├── media/[id].tsx        # 상세화면 (재생성 버튼)
└── search/index.tsx      # 검색 화면

src/
├── api/
│   ├── media.ts          # generateDiary() API
│   └── timeline.ts       # TimelineItem 타입
└── types/
    └── media.ts          # MediaDetail 타입
```

---

## 서버 정보

### EC2
- **IP**: 43.202.146.68
- **SSH**: `ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68`
- **백엔드 경로**: `/home/ubuntu/marzlog-backend`

### Docker 서비스
| 서비스 | 포트 | 용도 |
|--------|------|------|
| api | 8000 | FastAPI 서버 |
| worker | - | RQ Worker (AI 분석) |
| postgres | 5432 | PostgreSQL + pgvector |
| redis | 6379 | 작업 큐 |
| minio | 9000/9001 | S3 호환 스토리지 |
| adminer | 8080 | DB 관리 UI |

### 환경 변수 (Worker)
```
GEMINI_API_KEY=설정됨
GEMINI_MODEL=gemini-2.0-flash
DIARY_PROVIDER=gemini
```

---

## 자주 사용하는 명령어

### 배포
```bash
# 백엔드 배포
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68 \
  "cd /home/ubuntu/marzlog-backend && git pull && docker compose build worker && docker compose up -d"

# API만 재시작
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68 \
  "cd /home/ubuntu/marzlog-backend && docker compose restart api"
```

### 로그 확인
```bash
# Worker 로그
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68 \
  "cd /home/ubuntu/marzlog-backend && docker compose logs worker --tail=50"

# API 로그
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68 \
  "cd /home/ubuntu/marzlog-backend && docker compose logs api --tail=50"
```

### DB 쿼리
```bash
# 그룹 일기 상태 확인
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68 \
  "cd /home/ubuntu/marzlog-backend && docker compose exec -T postgres psql -U recall -d recall_db -c \"
SELECT group_id, COUNT(*) as cnt, MAX(CASE WHEN is_primary='true' THEN rc.title END) as title
FROM media m LEFT JOIN recall_cards rc ON rc.media_id = m.id
WHERE group_id IS NOT NULL GROUP BY group_id;\""
```

### 프론트엔드 개발
```bash
cd ~/projects/marzlog-app
npx expo start
```

---

## 마이그레이션 이력

| 날짜 | 작업 | 상태 |
|------|------|------|
| 2026-01-30 | 기존 17개 그룹 AI 일기 생성 | 완료 |
| 2026-01-30 | recall_cards에 title/content/mood/ai_provider 컬럼 추가 | 완료 |

---

## 참고 문서

- `AI-DIARY-STRATEGY.md` - AI 일기 생성 전략 문서
- `docs/` - API 문서 (있다면)
