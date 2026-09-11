import { isEnrichPlaceholderTitle } from './i18n';

export type AnalysisPollingInput = {
  title?: string | null;
  content?: string | null;
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
 */
export const isAwaitingAnalysis = (item: AnalysisPollingInput): boolean => {
  if (item.analysisStatus === 'failed') return false;
  if (item.analysisStatus === 'queued' || item.analysisStatus === 'running') return true;
  return isEnrichPlaceholderTitle(item.title, item.content);
};

/** 목록 중 하나라도 대기 중이면 폴링을 유지한다. */
export const shouldKeepPolling = (items: AnalysisPollingInput[]): boolean =>
  items.some(isAwaitingAnalysis);
