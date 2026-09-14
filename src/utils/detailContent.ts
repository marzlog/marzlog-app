import { isAwaitingAnalysis } from './analysisPolling';

/**
 * 상세 화면 내용 영역 결정 (순수 함수) — F-DUAL-CONTENT-DISPLAY.
 *
 * 정책 (JJ 2026-09-15): 제목 = 사용자 입력 우선 / 내용 = 사용자 글 + AI 일기 병기 / AI 생성은 계속 돌린다.
 * 병기는 상세 화면 한정이다(타임라인·검색·북마크 카드는 단일 표시).
 *
 * ★판정은 `content_source` / `ai_content` 원값으로 한다 — 표시값 content 로 추론하면
 *   7차 게이트 충돌과 같은 오판이 난다. 구 응답(필드 부재)은 현행 단일 표시를 유지한다.
 */
export type DetailContentInput = {
  content?: string | null;
  contentSource?: string | null;
  title?: string | null;
  aiTitle?: string | null;
  aiContent?: string | null;
  aiProvider?: string | null;
  analysisStatus?: string | null;
};

export type AiDiarySection = { kind: 'ready'; text: string } | { kind: 'pending' } | null;

export type DetailContentView = {
  /** 본문 스타일로 표시할 글 — 사용자 글, 또는 사용자 글이 없으면 AI 일기(현행) */
  primaryText: string | null;
  /** 사용자 글 아래 병기할 AI 일기. null 이면 구분 헤더도 없다 */
  aiSection: AiDiarySection;
};

export const resolveDetailContent = (input: DetailContentInput): DetailContentView => {
  const primaryText = input.content || null;

  // 사용자 글이 아니면(AI 일기만 / 구 응답) 현행 단일 표시 — 구분 헤더는 병기 시에만 붙는다.
  if (input.contentSource !== 'user' || !primaryText) {
    return { primaryText, aiSection: null };
  }

  // 생성 실패 폴백 문구는 AI 일기가 아니다.
  if (input.aiContent && input.aiProvider !== 'fallback') {
    return { primaryText, aiSection: { kind: 'ready', text: input.aiContent } };
  }

  const pending = isAwaitingAnalysis({
    title: input.title,
    content: input.content,
    aiTitle: input.aiTitle ?? null,
    aiContent: input.aiContent ?? null,
    analysisStatus: input.analysisStatus,
  });
  return { primaryText, aiSection: pending ? { kind: 'pending' } : null };
};
