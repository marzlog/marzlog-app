# Marzlog 세션 노트

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
