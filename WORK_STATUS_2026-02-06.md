# 작업 상태 - 2026-02-06

## 완료된 작업

### 1. Apple OAuth 구현 가이드 문서 작성 ✓
**위치**: `marzlog-backend/docs/APPLE-OAUTH-IMPLEMENTATION-GUIDE.md`

**내용**:
- Apple Developer Console 설정 방법 (App ID, Service ID, Key 생성)
- 백엔드 구현 가이드 (토큰 검증, Client Secret 생성)
- 프론트엔드 구현 가이드 (expo-apple-authentication)
- 테스트 시나리오 및 체크리스트

### 2. 감정 선택 시스템 Figma 디자인 적용 ✓
**Figma 정보**:
- FILE_KEY: `eohevJLtwYyMRvb9D1rtWw`
- emotions 노드: `56934:40009`

**다운로드한 에셋**:
| 경로 | 내용 | 개수 |
|------|------|------|
| `assets/images/emotions/icons/` | 감정 아이콘 (color, gray, disabled) | 36개 |
| `assets/images/emotions/illustrations/` | 감정 일러스트 | 12개 |

**12개 감정**:
- joy(기쁨), calm(평온), love(사랑), gratitude(감사)
- surprise(놀람), anxiety(불안), sadness(슬픔), focus(몰입)
- anger(분노), thoughtful(생각), tired(피곤), hurt(아픔)

**수정된 파일**:
| 파일 | 변경 내용 |
|------|----------|
| `constants/emotions.ts` | 감정 매핑 상수, 타입, 헬퍼 함수 (신규) |
| `app/media/[id].tsx` | 상세보기 감정 표시 + 모달 아이콘화 + 일러스트 표시 |
| `src/components/upload/EmotionPicker.tsx` | 업로드 화면 이모지 → 아이콘 |
| `src/components/media/EditAnalysisModal.tsx` | 편집 모달 이모지 → 아이콘 |

---

## 커밋 기록

### 프론트엔드 (marzlog-app)
```
de4c21e fix: 업로드/편집 화면에도 감정 커스텀 아이콘 적용
745283b feat: 감정 선택 시스템 Figma 디자인 적용
```

### 백엔드 (marzlog-backend)
```
674ffdd docs: Apple OAuth 구현 가이드 추가
```

---

## 배포 상태

| 환경 | 상태 | 버전 |
|------|------|------|
| 프론트엔드 (GitHub) | ✓ pushed | `de4c21e` |
| 백엔드 (GitHub) | ✓ pushed | `674ffdd` |
| EC2 (recall_api) | ✓ running | - |

---

## 다음 작업 시 참고

### EC2 서버 상태
- 오늘 컨테이너 재시작함 (CORS 확인 중 중지 발견)
- CORS 설정 확인됨: `["http://localhost:5173","http://localhost:3000","http://127.0.0.1:5173","http://localhost:8081"]`

### 감정 시스템 사용법
```typescript
// 상수 import
import { EMOTIONS, getEmotionIcon, getEmotionIllustration } from '@/constants/emotions';

// 아이콘 가져오기
const icon = getEmotionIcon('기쁨', 'color'); // 또는 'gray', 'disabled'
const illustration = getEmotionIllustration('기쁨');

// 전체 감정 목록
EMOTIONS.forEach(emotion => {
  console.log(emotion.key, emotion.nameKo, emotion.icons, emotion.illustration);
});
```

### Apple OAuth 구현 시 필요한 정보
```
1. Apple Developer Program 가입 확인 ($99/년)
2. 가이드 문서: ~/projects/marzlog-backend/docs/APPLE-OAUTH-IMPLEMENTATION-GUIDE.md
3. 실제 iOS 기기 필요 (시뮬레이터에서는 테스트 불가)
```

---

## 다음 작업 후보

| 우선순위 | 작업 | 예상 시간 | 비고 |
|---------|------|----------|------|
| 🔴 | **Apple OAuth 실제 구현** | 2-3시간 | 가이드 문서 완료, 구현만 남음 |
| 🟡 | 앨범/폴더 관리 | 3-4시간 | |
| 🟡 | Figma 디자인 추가 적용 | 4-6시간 | 홈, 검색, 설정 화면 등 |
| 🟡 | CI/CD (GitHub Actions) | 1시간 | |
| 🟢 | 얼굴 인식 + 이름 태깅 | 4-6시간 | |
| 🟢 | 프로덕션 HTTPS/도메인 | 2-3시간 | |

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

## 미해결 이슈

없음

---

**작성일**: 2026-02-06
