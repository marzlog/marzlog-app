# MarZlog Backend - 백엔드 구조 문서

> 최종 업데이트: 2026-03-13

## 1. 기술 스택

| 카테고리 | 기술 | 버전 |
|----------|------|------|
| 프레임워크 | FastAPI | 0.115.5 |
| 런타임 | Python 3.11 (Docker) | - |
| ORM | SQLAlchemy | 2.0.36 |
| DB | PostgreSQL (AWS RDS) | - |
| 벡터 DB | pgvector | 0.2.5 |
| 마이그레이션 | Alembic | 1.13.3 |
| 큐 | Redis + RQ | redis 5.1.1, rq 1.16.2 |
| 스토리지 | AWS S3 | boto3 1.35.50 |
| AI (텍스트 인코딩) | SigLIP 2 (open_clip) | PyTorch 2.6.0 CPU |
| AI (이미지 분석) | BLIP-2 + PaddleOCR | Worker EC2 |
| AI (번역/일기) | Gemini API | httpx |
| 인증 | JWT (PyJWT) | 2.8.0 |
| ASGI 서버 | Uvicorn | 0.32.0 |

## 2. 인프라 구성

```
┌─────────────────────────────────────────────────┐
│                   클라이언트                       │
│              (React Native App)                   │
└─────────────┬───────────────────────────────────┘
              │ HTTPS
              ▼
┌─────────────────────────────────────────────────┐
│           api.marzlog.com (Nginx)               │
│           EC2: 43.202.146.68                     │
│  ┌──────────────────┐  ┌─────────────────────┐  │
│  │   recall_api     │  │   recall_adminer    │  │
│  │   (FastAPI)      │  │   (DB 관리 UI)       │  │
│  │   :8000          │  │   :8080             │  │
│  │   mem_limit: 2G  │  │                     │  │
│  └────────┬─────────┘  └─────────────────────┘  │
└───────────┼─────────────────────────────────────┘
            │
    ┌───────┼───────────────────┐
    ▼       ▼                   ▼
┌────────┐ ┌──────────────┐ ┌────────────────┐
│ AWS S3 │ │  AWS RDS     │ │ Worker EC2     │
│ marzlog│ │  PostgreSQL  │ │ 172.31.43.22   │
│ -media │ │  + pgvector  │ │ Redis + RQ     │
│ -prod  │ │              │ │ AI Worker      │
└────────┘ └──────────────┘ └────────────────┘
```

### 서버 구성

| 구성요소 | 위치 | 설명 |
|----------|------|------|
| API 서버 | EC2 `43.202.146.68` | FastAPI + Adminer, Nginx 리버스 프록시 |
| Worker | EC2 `172.31.43.22` (내부) | Redis + RQ Worker (AI 분석 태스크) |
| 데이터베이스 | AWS RDS | PostgreSQL + pgvector (768차원 벡터) |
| 스토리지 | AWS S3 `marzlog-media-prod` | 이미지 원본 + 썸네일 저장 |
| SSL | Let's Encrypt (certbot) | 자동 갱신, 만료 2026-05-18 |
| 스케줄 | EC2 자동 시작/중지 | 10:00~24:00 (비용 절감) |

## 3. 프로젝트 구조

```
marzlog-backend/
├── apps/api/                     # API 서버 (Docker 빌드 컨텍스트)
│   ├── Dockerfile                # Python 3.11-slim, PyTorch CPU
│   ├── requirements.txt          # 의존성
│   └── app/
│       ├── main.py               # FastAPI 앱 생성, 라우터 등록, 미들웨어
│       ├── config.py             # Settings (환경변수 기반)
│       ├── models/
│       │   └── __init__.py       # SQLAlchemy 모델 (8개 테이블)
│       ├── routers/
│       │   ├── auth.py           # 인증 API
│       │   ├── media.py          # 미디어 업로드/관리
│       │   ├── timeline.py       # 타임라인 조회
│       │   ├── search_basic.py   # 하이브리드 검색
│       │   ├── album.py          # 앨범 CRUD
│       │   ├── notifications.py  # 개인 알림
│       │   └── announcements.py  # 공지사항 (관리자)
│       ├── schemas/
│       │   ├── auth.py           # 인증 요청/응답 스키마
│       │   ├── media.py          # 미디어 스키마
│       │   ├── album.py          # 앨범 스키마
│       │   ├── notification.py   # 알림 스키마
│       │   └── announcement.py   # 공지사항 스키마
│       ├── services/
│       │   ├── ai_models.py      # SigLIP 2 텍스트 인코더 (검색용)
│       │   ├── smart_search.py   # 자연어 검색 + 필터링
│       │   ├── query_parser.py   # Gemini 기반 쿼리 파싱
│       │   ├── synonym_dict.py   # 한영 동의어 사전
│       │   ├── media.py          # 미디어 비즈니스 로직
│       │   ├── s3.py             # S3 서비스 (presigned URL)
│       │   ├── jobs.py           # RQ 작업 큐 관리
│       │   ├── oauth_google.py   # Google OAuth 검증
│       │   ├── email.py          # SMTP 이메일 (비밀번호 재설정)
│       │   ├── caption_translator.py  # Gemini 캡션 한글화
│       │   ├── diary_generator.py     # AI 일기 생성 (Gemini)
│       │   └── batch_translate_captions.py  # 캡션 일괄 번역
│       ├── core/
│       │   ├── security.py       # JWT 토큰 생성/검증
│       │   ├── validators.py     # 파일 유효성 검사
│       │   ├── cache.py          # 캐시 유틸리티
│       │   └── search_cache.py   # 검색 캐시
│       ├── db/
│       │   └── session.py        # SQLAlchemy 엔진/세션 팩토리
│       └── dependencies/
│           └── auth.py           # FastAPI 의존성 (get_current_user, require_admin)
├── workers/analyzer/             # AI Worker (별도 EC2)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── tasks.py                  # 분석 태스크 (EXIF, 캡셔닝, 임베딩, OCR, 장면 분류)
│   ├── ai_models.py              # MarzlogAIAnalyzer (BLIP-2 + SigLIP 2 + CLIP)
│   ├── caption_translate_hook.py # 캡션 번역 후크
│   ├── diary_generator.py        # AI 일기 생성기
│   ├── generate_thumbnails.py    # 썸네일 생성
│   └── worker.py                 # RQ Worker 실행
├── infra/
│   ├── alembic.ini               # Alembic 설정
│   ├── init.sql                  # 초기 SQL
│   └── migrations/versions/      # DB 마이그레이션
│       ├── 001_initial_schema.py
│       ├── 001a_validate_foreign_keys.py
│       └── 002_add_media_grouping.py
├── scripts/                      # 유틸리티 스크립트
│   ├── backfill_caption_ko.py    # 캡션 한글화 백필
│   ├── reembed_all.py            # 임베딩 재생성
│   ├── rerun_ocr.py              # OCR 재실행
│   └── batch_translate_captions.py
├── docker-compose.yml            # API + Adminer (RDS/S3/Worker는 외부)
└── backup_legacy/                # 레거시 코드 백업
```

## 4. 데이터베이스 모델 (8개 테이블)

### users
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | - |
| email | Text | 이메일 (인덱스) |
| password_hash | Text (nullable) | 이메일 가입 시 사용 |
| name | Text (nullable) | 닉네임 |
| oauth_provider | Text (nullable) | google / apple |
| oauth_sub | Text (nullable) | OAuth subject ID |
| avatar_url | Text (nullable) | S3 storage_key |
| role | Text | user / admin |
| analysis_mode | Text | precision / fast |

### media
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | - |
| user_id | UUID (FK → users, CASCADE) | - |
| storage_key | Text | S3 파일 경로 |
| sha256 | String(64) | 중복 검사용 해시 |
| metadata | JSONB | 원본 메타데이터 |
| taken_at | Timestamp | 촬영 일시 |
| group_id | UUID (nullable) | 그룹 ID (다중 업로드) |
| is_primary | Text | 그룹 대표 이미지 여부 |
| title | Text (nullable) | 사용자 제목 |
| emotion | Text (nullable) | 감정 (한글: 기쁨, 평온 등) |
| intensity | Integer (nullable) | 감정 강도 (1~5) |

### recall_cards
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | - |
| user_id | UUID (FK → users, CASCADE) | - |
| media_id | UUID (FK → media, SET NULL, unique) | 1:1 관계 |
| caption | Text | AI 생성 영어 캡션 |
| caption_ko | Text | 한글 번역 캡션 |
| embedding | Vector(768) | SigLIP 2 벡터 임베딩 |
| tags | Text[] | 영어 태그 배열 |
| tags_ko | Text[] | 한글 태그 배열 |
| ocr_text | Text | OCR 추출 텍스트 |
| scene_type | Text | 장면 분류 (food, landscape 등) |
| scene_scores | JSONB | 장면 분류 점수 |
| exif | JSONB | EXIF 메타데이터 (GPS, 카메라 등) |
| title / content / mood | Text | AI 일기 필드 |
| ai_provider | Text | AI 제공자 (gemini 등) |

### jobs
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | - |
| media_id | UUID (FK → media, CASCADE) | - |
| mode | Text | precision / fast |
| status | Text | queued / running / completed / failed |
| result | JSONB | 분석 결과 |
| error | Text | 에러 메시지 |
| retry_count | Integer | 재시도 횟수 (최대 3) |

### albums / album_media
- **albums**: id, user_id, name, description, cover_media_id, is_default, sort_order
- **album_media**: album_id + media_id (다대다), added_at, sort_order

### notifications
- **notifications**: id, user_id, type, title, body, is_read

### announcements / announcement_reads
- **announcements**: id, title, body, type, is_active, created_by (SET NULL), expires_at
- **announcement_reads**: announcement_id + user_id (읽음 추적)

## 5. API 엔드포인트

### 인증 (`/auth`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/auth/google` | Google OAuth 로그인 |
| POST | `/auth/apple` | Apple OAuth 로그인 |
| POST | `/auth/register` | 이메일 회원가입 |
| POST | `/auth/login` | 이메일 로그인 |
| POST | `/auth/refresh` | 토큰 갱신 |
| POST | `/auth/forgot-password` | 비밀번호 재설정 코드 발송 |
| POST | `/auth/reset-password` | 비밀번호 재설정 |
| GET | `/auth/me` | 현재 사용자 정보 |
| GET | `/auth/stats` | 사용자 통계 (사진/앨범/저장공간) |
| PUT | `/auth/profile` | 프로필 수정 (닉네임 등) |
| POST | `/auth/avatar` | 아바타 업로드 |
| DELETE | `/auth/account` | 회원 탈퇴 (S3 파일 삭제 → CASCADE) |

### 미디어 (`/media`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/media/upload/prepare` | Presigned URL 발급 (SHA256 중복 검사) |
| POST | `/media/upload/complete` | 업로드 완료 + AI 분석 트리거 |
| POST | `/media/upload/group/complete` | 그룹 업로드 완료 |
| GET | `/media/{id}` | 미디어 상세 조회 |
| PUT | `/media/{id}` | 미디어 수정 (제목/감정) |
| DELETE | `/media/{id}` | 미디어 삭제 (S3 포함) |
| PUT | `/media/{id}/primary` | 대표 이미지 설정 |

### 타임라인 (`/timeline`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/timeline` | 타임라인 조회 (날짜/페이징, 그룹 카운트 포함) |
| GET | `/timeline/stats` | 날짜별 통계 |
| GET | `/timeline/group/{group_id}` | 그룹 이미지 조회 |

### 검색 (`/search`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/search` | 하이브리드 검색 (vector + text + 메타데이터) |
| POST | `/search/similar` | 유사 이미지 검색 (이미지→이미지 벡터) |
| GET | `/search/suggestions` | 자동완성 제안 |

### 앨범 (`/albums`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/albums` | 앨범 목록 |
| POST | `/albums` | 앨범 생성 |
| GET | `/albums/{id}` | 앨범 상세 (미디어 포함) |
| PUT | `/albums/{id}` | 앨범 수정 |
| DELETE | `/albums/{id}` | 앨범 삭제 |
| POST | `/albums/{id}/media` | 앨범에 미디어 추가 |
| DELETE | `/albums/{id}/media` | 앨범에서 미디어 제거 |

### 알림 (`/notifications`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/notifications` | 알림 목록 (최신순) |
| GET | `/notifications/unread-count` | 안 읽은 수 |
| PUT | `/notifications/{id}/read` | 읽음 처리 |
| DELETE | `/notifications` | 알림 삭제 |

### 공지사항 (`/announcements`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/announcements` | 활성 공지사항 (읽음 여부 포함) |
| GET | `/announcements/unread-count` | 안 읽은 공지 수 |
| PUT | `/announcements/{id}/read` | 읽음 처리 |
| POST | `/announcements` | 공지 생성 (관리자 전용) |
| PUT | `/announcements/{id}` | 공지 수정 (관리자 전용) |
| DELETE | `/announcements/{id}` | 공지 삭제 (관리자 전용) |

## 6. AI 파이프라인

### API 서버 (검색용)

| 서비스 | 설명 |
|--------|------|
| `ai_models.py` | SigLIP 2 (`ViT-B-16-SigLIP2-256`) 텍스트 인코더, 앱 시작 시 프리로드 |
| `smart_search.py` | 자연어 검색: 쿼리 파싱 → 벡터 검색 → 텍스트 FTS → 메타데이터 필터 → 결과 합산 |
| `query_parser.py` | Gemini API 기반 쿼리 분석 (키워드 추출, 날짜/위치 필터) |
| `synonym_dict.py` | 한→영 동의어 사전 (음식, 장소, 활동, 계절 등 100+ 매핑) |

### Worker (분석용, 별도 EC2)

| 단계 | 처리 | 설명 |
|------|------|------|
| 1 | EXIF 추출 | 촬영일시, GPS, 카메라 정보 |
| 2 | AI 캡셔닝 | BLIP-2로 영어 캡션 생성 |
| 3 | 캡션 번역 | Gemini API로 한글 번역 (caption_ko, tags_ko) |
| 4 | 벡터 임베딩 | SigLIP 2로 768차원 벡터 생성 |
| 5 | OCR | PaddleOCR로 이미지 내 텍스트 추출 |
| 6 | 장면 분류 | CLIP zero-shot (food, landscape, portrait 등) |
| 7 | AI 일기 | Gemini API로 일기 생성 (선택적) |
| 8 | 썸네일 | 리사이즈 + S3 저장 |

### 검색 유사도 기준 (SigLIP 2)

| 검색 유형 | 최소 유사도 | 설명 |
|-----------|------------|------|
| 텍스트→이미지 | 0.03 | Cross-modal은 원래 낮음 (0.07~0.16 범위) |
| 이미지→이미지 | 0.50 | 같은 모달은 정확 (0.34~1.0 범위) |

## 7. 운영 명령어

### 서버 상태 확인
```bash
ssh -i ~/.ssh/marzlog-key.pem ubuntu@43.202.146.68
cd /home/ubuntu/marzlog-backend
docker compose ps
docker compose logs api --tail 50
```

### DB 조회
```bash
docker compose exec -T api python3 -c "
from app.db.session import SessionLocal
from app.models import User, Media
db = SessionLocal()
print(db.query(User).count(), 'users')
print(db.query(Media).count(), 'media')
db.close()
"
```

### 컨테이너 재시작
```bash
# 환경변수 변경 시 (restart 아님!)
docker compose up -d api

# 코드만 변경 시 (--reload 활성화됨)
# uvicorn이 자동 감지
```

### Job 복구
- 앱 시작 시 자동 실행 (`recover_stuck_jobs`)
- 30분 이상 running 상태인 작업 → retry (최대 3회) 또는 failed 처리

### 주의사항
- `CORS_ALLOW_ORIGINS`: JSON 배열 형식, `docker compose up -d`로 반영
- `docker compose restart`는 환경변수 변경을 반영하지 않음
- Worker EC2는 내부 IP (`172.31.43.22`)로만 접근 가능
- EC2 운영 시간: 10:00~24:00 (자동 시작/중지)
