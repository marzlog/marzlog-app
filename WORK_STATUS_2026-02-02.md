# 작업 상태 정리 (2026-02-02)

## 완료된 작업

### 1. 자연어 스마트 검색 API 구현
- `apps/api/app/services/query_parser.py` - Gemini API 기반 쿼리 파싱
- `apps/api/app/services/smart_search.py` - 벡터+텍스트 하이브리드 검색
- `/search/smart` 엔드포인트 추가
- GitHub에 커밋 완료 (a7931d7)

### 2. EC2 배포 완료
- 인스턴스 시작 (stopped → running)
- IP: 43.202.146.68
- `MEDIA_PROXY_URL` 환경변수 추가 → 이미지 로딩 정상화

### 3. 프론트엔드 검색 UI 개선
- `app/(tabs)/search.tsx` 수정
  - 검색 결과 개수 표시 추가
  - `extraData={query}` - FlatList 강제 리렌더링
  - `setResults([])` - 새 검색 시 이전 결과 초기화
  - 디버그 로깅 추가

---

## 현재 문제: 벡터 검색 유사도 분포 이상

### 증상
- "수영장" 검색 → 20개 결과 (전체 38개 중)
- 실제 수영장 사진은 1개뿐
- 모든 이미지가 0.74~0.94 유사도 (threshold 무의미)

### 원인 분석
```
이미지-이미지 유사도: 0.37 ~ 1.0 (평균 0.67) - 정상
텍스트-이미지 유사도: 0.74 ~ 0.94 - 비정상적으로 높음
```

Multilingual CLIP 모델의 텍스트-이미지 유사도가 전반적으로 높아서
threshold 필터링이 효과가 없음.

### 현재 threshold 설정
```python
# apps/api/app/routers/search_basic.py
VECTOR_SIMILARITY_THRESHOLD = 0.40
HYBRID_VECTOR_THRESHOLD = 0.35
SIMILAR_SEARCH_THRESHOLD = 0.3
```

---

## 내일 작업 계획

### 옵션 1: Threshold 대폭 상향 (0.8+)
```bash
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68
cd ~/marzlog-backend

# threshold 0.85로 상향
sed -i 's/VECTOR_SIMILARITY_THRESHOLD = 0.40/VECTOR_SIMILARITY_THRESHOLD = 0.85/' \
  apps/api/app/routers/search_basic.py
sed -i 's/HYBRID_VECTOR_THRESHOLD = 0.35/HYBRID_VECTOR_THRESHOLD = 0.80/' \
  apps/api/app/routers/search_basic.py

# 재빌드
docker compose -f docker-compose.production.yml build api
docker compose -f docker-compose.production.yml up -d api
```

### 옵션 2: 상대적 순위 기반 필터링
- threshold 대신 "상위 N개" 또는 "최고 유사도의 90% 이상"으로 변경
```python
# 예시: 최고 유사도 대비 90% 이상만 반환
max_sim = max(r.similarity for r in rows)
threshold = max_sim * 0.9
results = [r for r in rows if r.similarity >= threshold]
```

### 옵션 3: 임베딩 모델 교체
- OpenAI CLIP (영어 전용, 더 정확)
- 또는 한국어 특화 모델 검토

### 옵션 4: 텍스트 검색 우선 전략
- 벡터 검색은 보조로만 사용
- caption, tags, OCR 텍스트 매칭 우선

---

## 데이터 상태

| 항목 | 값 |
|------|------|
| 총 recall_cards | 38 |
| 임베딩 있음 | 38 (100%) |
| searchable_text 있음 | 38 (100%) |
| 고유 storage_key | 31 (7개 중복) |
| 사용자 | 1명 (ac8294c3-...) |

---

## 서버 접속 정보

```bash
# EC2 접속
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68

# 백엔드 디렉토리
cd /home/ubuntu/marzlog-backend

# API 로그 확인
docker logs marzlog_api --tail 50

# DB 접속
docker exec -it marzlog_postgres psql -U recall -d recall_db

# API 재시작
docker compose -f docker-compose.production.yml restart api

# API 재빌드 (코드 변경 시)
docker compose -f docker-compose.production.yml build api
docker compose -f docker-compose.production.yml up -d api
```

---

## 테스트 쿼리

```bash
# 유사도 확인
docker exec -e PYTHONPATH=/app marzlog_api python3 -c "
from app.services.ai_models import get_clip_encoder
from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
enc = get_clip_encoder()
emb = enc.encode_text('수영장')
sql = text('''
    SELECT caption, 1 - (embedding <=> :emb) as sim
    FROM recall_cards WHERE embedding IS NOT NULL
    ORDER BY sim DESC LIMIT 10
''')
for r in db.execute(sql, {'emb': str(emb.tolist())}).fetchall():
    print(f'{r.sim:.3f} - {r.caption[:40]}')
"
```

---

## Git 상태

### 프론트엔드 (marzlog-app)
- 브랜치: master
- 미커밋 변경: `app/(tabs)/search.tsx` (디버그 로깅 추가)

### 백엔드 (marzlog-backend)
- 브랜치: main
- EC2에 미커밋 변경: threshold 값 변경
- GitHub Actions 배포 실패 중 (SSH key 문제)

---

## 추천 다음 단계

1. **threshold 0.85 테스트** - 가장 빠른 해결책
2. 결과가 너무 적으면 **상대적 threshold** 로직 구현
3. 장기적으로 **텍스트 검색 강화** 또는 **모델 교체** 검토
