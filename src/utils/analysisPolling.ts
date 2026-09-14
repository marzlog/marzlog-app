import { aiDiaryValues, isEnrichPlaceholderTitle } from './i18n';

export type AnalysisPollingInput = {
  title?: string | null;
  content?: string | null;
  /** AI 원값 (B-USER-CONTENT-DISPLAY). 구 API 응답엔 없어(undefined) 표시값으로 폴백한다 */
  aiTitle?: string | null;
  aiContent?: string | null;
  analysisStatus?: string | null;
};

/**
 * 이 카드가 아직 분석 결과를 기다리는 중인지 판별한다(순수 함수).
 *
 * ★왜 `analysis_status` 만으로는 안 되는가: 그룹 업로드에서 **선행 멤버의 job 은 그룹
 *   일기가 만들어지기 전에 이미 `done`** 이 된다(2026-09-11 실측: job done 06:10:55 vs
 *   그룹 일기 06:11:21 = 26초 창). 그 사이 폴링이 멈추면 화면은 표시 게이트에 걸려
 *   "분석 중"에 **영구 고착**된다 — 서버는 멀쩡한데 앱만 모르는 상태다.
 *   그래서 지속 조건을 **표시 게이트(`resolveDisplayTitle`)와 같은 판정**으로 맞춘다.
 *
 * ★탈출구를 반드시 남긴다: `!content` 만 보면 실패 카드와 "일기가 끝내 생성되지 않은
 *   카드"(title·content 둘 다 없고 caption 만 남은 상태)를 영원히 폴링한다.
 *   - `failed` → 즉시 종료(표시는 `home.analysisFailed`)
 *   - 영구 미생성 → `isEnrichPlaceholderTitle` 이 false 라 자연히 종료(표시는 캡션)
 *
 * ★판정은 AI 원값으로 한다 — 사용자가 본문을 써서 표시값 content 가 채워져도
 *   AI 일기는 아직 생성 중일 수 있고, 폴링은 그 완료까지 돌아야 한다.
 */
export const isAwaitingAnalysis = (item: AnalysisPollingInput): boolean => {
  if (item.analysisStatus === 'failed') return false;
  if (item.analysisStatus === 'queued' || item.analysisStatus === 'running') return true;
  const ai = aiDiaryValues(item);
  return isEnrichPlaceholderTitle(ai.title, ai.content);
};

/** 목록 중 하나라도 대기 중이면 폴링을 유지한다. */
export const shouldKeepPolling = (items: AnalysisPollingInput[]): boolean =>
  items.some(isAwaitingAnalysis);

export type DiaryEditLockInput = AnalysisPollingInput & {
  titleSource?: string | null;
  contentSource?: string | null;
};

/**
 * 일기 편집을 잠가야 하는가 (B-② 편집 잠금).
 *
 * AI 일기가 아직 생성 중인 창에서 편집을 저장하면 뒤이어 도착한 워커의 그룹 일기 기록이
 * 조건 없이 덮어쓴다(2026-09-14 recon B-3). 그 창에서만 잠근다.
 * 사용자가 직접 쓴 제목·본문이 있는 카드는 자기 글 편집이므로 잠그지 않는다.
 */
export const isDiaryEditLocked = (item: DiaryEditLockInput): boolean => {
  if (item.titleSource === 'user' || item.contentSource === 'user') return false;
  return isAwaitingAnalysis(item);
};
