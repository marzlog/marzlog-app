# Claude Code 세션 가이드

## 프로젝트 구조

- **marzlog-app**: React Native/Expo 프론트엔드 앱
- **marzlog-backend**: FastAPI 백엔드 (EC2 서버에서 실행)

## 서버 접속

```bash
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68
cd /home/ubuntu/marzlog-backend
```

## 중요 환경 변수 설정 (백엔드)

### CORS 설정 주의사항

1. **환경 변수 이름**: `CORS_ALLOW_ORIGINS` (CORS_ORIGINS 아님)
2. **형식**: JSON 배열
   ```yaml
   # 올바른 형식
   - CORS_ALLOW_ORIGINS=["http://localhost:5173","http://localhost:3000"]
   ```
3. **변경 후 컨테이너 재생성 필요**
   ```bash
   # restart는 환경 변수 변경 반영 안 됨
   docker compose restart api  # 

   # up -d로 컨테이너 재생성 필요
   docker compose up -d api    # ✅
   ```

### 설정 확인

```bash
# 컨테이너 내 환경 변수 확인
docker exec recall_api printenv CORS_ALLOW_ORIGINS

# 애플리케이션에서 로드된 값 확인
docker exec recall_api python3 -c "from app.config import Settings; print(Settings().CORS_ALLOW_ORIGINS)"
```


## 자주 사용하는 명령어

#

## 서버 상태 확인
```bash
docker compose ps
docker compose logs api --tail 50
docker compose logs worker --tail 50
```

### DB 조회
```bash
docker compose exec -T postgres psql -U recall -d recall_db -c "SELECT ..."
```

### S3/MinIO 파일 확인
```bash
docker compose exec -T api python3 << 'EOF'
import boto3
from app.config import settings
s3 = boto3.client('s3', endpoint_url=settings.S3_ENDPOINT, ...)
# ...
EOF
```

## 서버 역할 분리 원칙

### API 서버 (43.202.146.68, t3.small 2GB) — 절대 금지 목록
- `open_clip`, `torch`, `transformers` 등 AI 모델 import 금지
- SigLIP, CLIP, BLIP 등 로컬 모델 로드 금지
- `ai_models.py`는 Worker HTTP 클라이언트 코드만 포함

### Worker 서버 (13.209.26.40, 3.7GB) — 모델 전담
- SigLIP2 임베딩 생성 → `/embed` 엔드포인트 제공 (port 8001)
- BLIP-2 캡셔닝, PaddleOCR 등 AI 처리 전담

### 배포 규칙
- API 서버 코드 변경: `docker cp` + `docker compose restart api`
- `docker compose up --build --force-recreate` 직접 실행 금지
- 배포는 반드시 `deploy_api.sh` 사용

### 위반 시 결과
- API 서버 OOM → SSH 불가 → 강제 stop/start 필요 (2026-04-06 실제 발생)

## 주의사항

- 서버 브랜치가 origin/main과 diverge될 수 있음 - 주의해서 merge/push
- 고아 레코드: S3 파일 없는 media 레코드는 Worker가 자동 삭제
- 상세 환경 변수 문서: `/home/ubuntu/marzlog-backend/docs/ENVIRONMENT-CONFIG.md`
