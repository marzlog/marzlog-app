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
   docker compose restart api  # ❌

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

### 서버 상태 확인
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

## 주의사항

- 서버 브랜치가 origin/main과 diverge될 수 있음 - 주의해서 merge/push
- 고아 레코드: S3 파일 없는 media 레코드는 Worker가 자동 삭제
- 상세 환경 변수 문서: `/home/ubuntu/marzlog-backend/docs/ENVIRONMENT-CONFIG.md`
