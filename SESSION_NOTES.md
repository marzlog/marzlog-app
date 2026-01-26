# Marzlog 세션 노트

## 2026-01-14 (화) - Worker S3 설정 및 이미지 분석 수정

### 해결한 이슈: 이미지가 1개만 보이고 AI 캡셔닝이 진행 중으로 표시되는 문제

**원인:**
1. Worker 컨테이너가 AWS S3 설정으로 실행 중 (MinIO 대신)
2. 분석 작업이 잘못된 함수 시그니처로 큐잉됨
3. MinIO 파일과 DB 레코드 불일치

**해결:**
1. Worker 컨테이너 재시작하여 올바른 MinIO 설정 적용
2. `analyze_media()` 함수로 올바른 파라미터와 함께 작업 재큐잉
3. DB 정리 및 모든 미디어에 `is_primary='true'` 설정

**Worker 환경변수 (올바른 설정):**
```
S3_ENDPOINT=http://minio:9000
S3_BUCKET=recall-media
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
```

**분석 작업 큐잉 방법:**
```python
from rq import Queue
q = Queue(connection=redis)
q.enqueue(
    'tasks.analyze_media',
    analysis_job_id=job_id,      # jobs 테이블에 먼저 레코드 생성
    media_id=media_id,
    storage_key=storage_key,
    mode='basic'
)
```

### 완료된 작업
- [x] Worker S3 설정 수정 (AWS S3 → MinIO)
- [x] 분석 작업 재큐잉 및 완료
- [x] 3개 미디어 모두 AI 캡션 생성 완료
- [x] 이미지 프록시 동작 확인

### AI 캡션 결과
- "a menu card with a black border" (scene: food)
- "a white plate with a silver rim" (scene: object)
- "a person is putting a piece of food into a plate" (scene: food)

---

## 2026-01-14 (화) - 검색 UI 및 HTTPS 프록시 구현

### 완료된 작업

**1. 검색 UI 영어 힌트 추가**
- 검색은 영어만 지원되므로 사용자에게 영어 검색 안내 배너 추가
- 추천 검색어를 영어로 변경: ['beach', 'sunset', 'food', 'family', 'city']
- 최근 검색어 저장/삭제 기능 추가

**2. 검색 결과 썸네일 수정**
- `SearchResult` 스키마에 `thumbnail_url` 필드 추가
- `_add_thumbnail_urls()` 함수로 presigned URL 생성

**3. HTTPS 이미지 프록시 구현**
- 문제: MinIO가 HTTP만 지원하여 모바일 앱에서 이미지 로드 불가
- 해결: FastAPI 스트리밍 프록시 엔드포인트 추가

**수정된 파일:**
- `app/(tabs)/search.tsx` - 영어 검색 힌트, 최근 검색어
- `src/i18n/locales/ko.json`, `en.json` - i18n 키 추가
- `apps/api/app/routers/search_basic.py` - thumbnail_url 추가
- `apps/api/app/routers/media.py` - `/proxy/{storage_key}` 엔드포인트
- `apps/api/app/services/s3.py` - `generate_signed_url()`이 프록시 URL 반환
- `app.json` - HTTP cleartext 허용 설정

**프록시 엔드포인트:**
```
GET https://api.marzlog.com/media/proxy/{storage_key}
```

**환경변수 (EC2 docker-compose.yml):**
```yaml
- MEDIA_PROXY_URL=https://api.marzlog.com/media/proxy
```

---

## 2025-12-31 (화) - 테스트 세션

### 해결한 이슈: 이미지가 안 보이는 문제

**원인:** MinIO presigned URL이 `localhost:9000`으로 생성되어 브라우저에서 접근 불가

**해결:**
1. EC2 docker-compose.yml에 `S3_PUBLIC_ENDPOINT` 환경변수 추가
2. API 컨테이너 재생성

**수정된 파일 (EC2: ~/marzlog-backend/):**
```yaml
# docker-compose.yml - api 서비스 environment에 추가
- S3_PUBLIC_ENDPOINT=http://43.202.146.68:9000
```

### 테스트 완료 항목
- [x] 이미지 표시
- [x] 상세보기 (AI 캡션, OCR, 감정/제목/내용/메모)
- [x] 편집에서 이미지 추가
- [x] 홈 화면 그룹 배지 (+N)
- [x] 그룹 업로드

---

## 다음 세션 시작 명령어

### 1. EC2 컨테이너 시작 (평일 자동 종료됨)
```bash
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68 "cd ~/marzlog-backend && docker compose up -d"
```

### 2. API 헬스체크
```bash
curl -s https://api.marzlog.com/health
```

### 3. 프론트엔드 시작
```bash
cd ~/projects/marzlog-app && npx expo start --web --port 8081
```

### 4. 디버깅 명령어
```bash
# API 로그
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68 "cd ~/marzlog-backend && docker compose logs api --tail=50"

# Worker 로그
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68 "cd ~/marzlog-backend && docker compose logs worker --tail=50"

# DB 확인
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68 "cd ~/marzlog-backend && docker compose exec -T postgres psql -U recall -d recall_db -c \"SELECT * FROM media ORDER BY created_at DESC LIMIT 5;\""
```

---

## 프로젝트 정보

| 항목 | 값 |
|------|-----|
| EC2 | 43.202.146.68 |
| API | https://api.marzlog.com |
| 프론트엔드 | http://localhost:8081 |
| SSH 키 | ~/.ssh/marzlog-key.pem |
| EC2 자동 스케줄 | 평일 9AM 시작, 10PM 종료 |

### 백엔드 파일 위치 (EC2)
- `apps/api/app/routers/media.py` - 미디어 API
- `apps/api/app/services/s3.py` - S3/MinIO 서비스
- `workers/analyzer/worker/tasks.py` - AI 분석 워커

### 프론트엔드 파일 위치
- `app/(tabs)/home.tsx` - 홈 화면
- `app/media/[id].tsx` - 상세보기
- `app/upload/index.tsx` - 업로드/편집
- `src/hooks/useImageUpload.ts` - 이미지 업로드 훅
- `src/components/home/ScheduleCard.tsx` - 그룹 배지 컴포넌트
